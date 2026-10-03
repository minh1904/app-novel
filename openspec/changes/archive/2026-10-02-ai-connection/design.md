## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có và ràng buộc cách làm:

- **Hợp đồng provider** (`src/main/providers/types.ts`): `TranslationProvider.translate(request, options)`, request là `{ sourceLang, targetLang: 'vi', segments: {id,text}[], context? }`, response là `{ provider, model, items: {id,text}[] }`. Có `ProviderError` với sáu loại (`rate_limited`, `network`, `auth`, `refused`, `invalid_response`, `cancelled`) và bảng `RETRYABLE`, cộng `retryAfterMs`. Comment trong file đã ghi nguyên tắc: *“keyed by segment id, never by position”*.
- **Đã có `reconcile.ts` và `provenance.ts`** bên cạnh `mockProvider.ts` — change này dùng, không viết lại.
- **Lưu trữ:** `library.db` giữ chỉ mục tác phẩm và **cài đặt cấp app**; mỗi tác phẩm là một tệp `.mira` riêng. `migrate.ts` nâng cấp nguyên tử theo version, có fixture schema trong `__fixtures__/`.
- **IPC** tự viết (`src/main/ipc/handler.ts` + `src/shared/channels.ts`), kiểu dùng `valibot`, kết quả bọc `Result` (`src/shared/result.ts`).
- **Giao diện:** Tailwind v4 + Base UI; `Banner`, `Button`, `Dialog`, `Panel`, `Select`, `TextField` đã có; **chưa có** công tắc, badge, khối rỗng, và **chưa có màn cài đặt nào**. `View` là union trong `App.tsx`, không có router.
- **Quyết định sản phẩm:** [ADR-004](../../../../docs/handbook/decisions/0004-ai-provider-layer.md) chốt một adapter, `fill-first` cố định, snapshot models.dev, `safeStorage` async, không đóng kèm gateway, không OAuth thuê bao, không preset đặt tên theo CLI thuê bao.

## Goals / Non-Goals

**Goals:**
- Một kết nối khai được trong vài phút và **tự chứng minh là chạy** trước khi tốn tiền.
- Job dịch một chương **sống qua lúc một khóa hết quota**.
- Mọi khác biệt giữa nhà cung cấp là **dữ liệu khai báo**, không phải nhánh `if` trong mã gọi.
- Khóa API không rời main process sau khi lưu.

**Non-Goals:** job bền vững qua crash, Batch API, prompt caching, adapter native, ngữ cảnh trong prompt, panel Hỏi AI, nhiều nguồn raw, mode Từng câu.

## Decisions

### D1. Kiểm tra kết nối bằng `GET {baseUrl}/models`, không bằng một lần chat thử

Một lần chat thử tốn tiền, tốn thời gian, và có thể fail vì lý do chẳng liên quan tới kết nối (model sai tên, nội dung bị từ chối). `GET /models` rẻ, không tính tiền ở hầu hết nhà cung cấp, và **trả về luôn danh sách model** — nên một lần bấm làm hai việc: xác nhận URL + khóa, và nạp danh sách để người dùng chọn. Đây là quy ước chung của các client BYOK công khai ([thiết kế màn](../../../../docs/handbook/experience/ai-connection-settings.md)).

Endpoint không có `/models` (một số gateway tối giản) thì kiểm tra báo *“nối được nhưng không liệt kê được model”* và cho khai model tay — **không coi là lỗi kết nối**.

### D2. Khóa API không bao giờ quay về renderer

Renderer gửi khóa **một lần** lúc lưu, rồi chỉ nhận lại `{ id, masked, status }` — `masked` là bốn ký tự cuối. Không có kênh IPC nào đọc khóa ra. Lý do: renderer là nơi chạy nội dung từ tệp truyện của người dùng; giữ khóa ở main process làm hẹp hẳn bề mặt rủi ro mà không mất gì về UX (không ai cần đọc lại khóa đã dán, họ chỉ cần **thay**).

`safeStorage.encryptStringAsync` / `decryptStringAsync` thay vì bản sync: bản sync có thể bị deprecate và bản async xử lý được lúc kho khóa hệ điều hành chưa sẵn. Không khả dụng → `isEncryptionAvailable()` false → **từ chối lưu**, trả lỗi `auth` kèm thông điệp riêng, không ghi plaintext (ADR-004).

### D3. Kết nối lưu ở `library.db`, không ở tệp tác phẩm

Kết nối AI thuộc **cả app**, không thuộc một truyện: khai lại cho mỗi tác phẩm là vô lý, và một tệp `.mira` mang khóa API đi theo lúc người dùng backup hay gửi cho người khác là rò rỉ. Ba bảng mới trong `library.db` (version +1, nâng cấp nguyên tử theo `migrate.ts`, thêm fixture schema): kết nối, khóa (ciphertext + bốn ký tự cuối + trạng thái đóng băng), model đã chọn.

### D4. `fill-first` là bất biến trong mã, không phải tùy chọn

Thuật toán: sắp khóa theo thứ tự người dùng khai; chọn khóa **đầu tiên không đang đóng băng**; lỗi `rate_limited` → đóng băng khóa đó tới `now + retryAfterMs` (không có `retryAfterMs` thì một mặc định cố định) rồi thử khóa tiếp; lỗi `auth` → **không** đóng băng mà đánh dấu khóa là sai, bỏ qua vĩnh viễn trong job này; hết khóa → lỗi `rate_limited` ở cấp job kèm thời điểm khóa sớm nhất hồi phục.

Không cho chọn chiến lược vì: `fill-first` đúng cho ca free tier (dùng cạn hạn mức miễn phí của khóa 1 rồi mới sang khóa 2), còn `round-robin` trải mỏng ra nhiều khóa và làm cả bộ hết quota cùng lúc. Một chiến lược đúng thì hơn hai chiến lược và một ô chọn. Phương án khác đã loại: nhập nhiều khóa bằng dấu phẩy như Cherry Studio — gọn khi gõ nhưng không có chỗ hiện khóa nào đang đóng băng, mà đó đúng là thông tin người dùng cần lúc job dừng.

### D5. Tầng kiểm tra ID chạy vô điều kiện

Thứ tự kiểm: parse được → tập ID khớp chính xác (không thiếu, không thừa, không trùng) → không `dst` rỗng. Chạy **kể cả khi** nhà cung cấp khai có structured output, vì lớp tương thích OpenAI của Anthropic bỏ qua `strict` và các gateway ở giữa có thể biến đổi payload ([nghiên cứu](../../../../docs/handbook/research/ai-provider-integration.md)). Thiếu ID → lỗi `invalid_response` (thử lại được) và **chỉ gửi lại các ID lỗi**; thừa ID → bỏ qua; trùng ID → lấy bản đầu, ghi cảnh báo. Dùng `reconcile.ts` đã có.

### D6. Chia đoạn gửi theo ranh giới đoạn, dừng ở một hằng số

Lát cắt này gửi **~1–2k token nguồn mỗi lần**, chỉ cắt ở ranh giới đoạn, không kèm ngữ cảnh (ngữ cảnh là change sau). Hằng số đặt một chỗ, có comment nói rõ đây là **phỏng đoán chưa đo** — [nghiên cứu](../../../../docs/handbook/research/ai-translation-tools.md) ghi “chưa khóa kích thước đoạn trước khi có số liệu”.

### D7. Ước lượng chi phí: đếm ký tự × tỷ lệ, nói rõ là ước lượng

Không gọi API đếm token (mỗi nhà cung cấp một kiểu, và đường tương thích OpenAI không có). Ước lượng = ký tự nguồn ÷ hệ số ký-tự-trên-token theo ngôn ngữ nguồn × (1 + tỷ lệ đầu ra) × giá trong registry. Hệ số và tỷ lệ đầu ra (~1,2–1,5 cho tiếng Việt) là **phỏng đoán chưa đo**, đặt một chỗ, UI luôn ghi chữ “ước lượng”. Sau khi chạy, ghi `usage` thật nếu phản hồi có — đó là dữ liệu để hiệu chỉnh hệ số về sau.

### D8. Snapshot models.dev vendored, không gọi mạng lúc chạy

Một tệp JSON đã lọc trong repo (chỉ các nhà cung cấp Mira quan tâm, chỉ các trường cần: `limit`, `cost`, `structured_output`, `tool_call`, `status`), kèm **ngày đọc** trong tệp và một script refresh thủ công. Lý do không fetch lúc chạy: app phải chạy offline, và giá đổi chậm hơn nhiều so với nhịp phát hành. Model không có trong snapshot → người dùng khai tay `limit` và giá tùy chọn; không khai giá thì UI nói “chưa biết giá” thay vì hiện số 0.

### D9. Không đóng kèm, không tự chạy gateway

Mira không khởi động, không quản lý, không dò process gateway nào. Ô URL là trung lập và **UI không nêu tên công cụ proxy nào** (ADR-004); hướng dẫn dựng gateway nằm ở tài liệu. Hệ quả cần nói với người dùng trong UI: nếu URL là `127.0.0.1` và nối không được thì khả năng cao là proxy chưa chạy — đây là câu gợi ý trong thông báo lỗi, không phải một tính năng quản lý process.

### D10. Đọc lỗi theo ba lớp, suy giảm êm — không một bảng ánh xạ cứng

Hai đường của lát cắt đầu trả lỗi khác hình dạng, và [nghiên cứu hai hướng provider](../../../../docs/handbook/research/provider-gemini-gateway.md) cho thấy **Gemini 429 không có header `Retry-After`**: thời gian chờ nằm trong thân JSON ở `error.details[]` với `@type: type.googleapis.com/google.rpc.RetryInfo`. Gateway ở giữa có thể nuốt mất phần đó. Nên bộ phân loại đọc theo thứ tự, trượt lớp nào thì xuống lớp dưới:

1. Thân kiểu Google: `error.details[]` → `RetryInfo.retryDelay`, `QuotaFailure.violations[].quotaId`.
2. Thân kiểu OpenAI: `error.message`, `error.code`, `error.type`.
3. Quét chuỗi thô tìm `retryDelay` và `PerDay`.
4. Trượt cả ba: phân loại thuần theo mã HTTP.

Bộ phân loại trả `{ kind, retryAfterMs?, quotaScope?: 'minute' | 'day' }`. `quotaScope` là thứ D11 cần; không suy ra được thì để trống chứ **không đoán**.

### D11. Hai mức đóng băng khóa, không phải một

Đây là sửa lại D4. 429 của Gemini có **hai loại khác hẳn nhau** và gộp chúng làm một là hỏng đúng ca dùng chính:

| Loại | Nhận ra bằng | Đóng băng |
| --- | --- | --- |
| Chạm giới hạn theo phút | `retryDelay` có, không thấy dấu hiệu theo ngày | Đúng `retryDelay` (cộng một khoảng đệm nhỏ) |
| **Cạn quota theo ngày** | `quotaId` chứa `PerDay`, hoặc thân lỗi chứa `GenerateRequestsPerDayPerProject` | **Tới mốc reset**, không phải vài giây |
| Không nhận ra được | — | Mức ngắn mặc định, **nhân đôi sau mỗi lần lặp lại** trên cùng khóa |

Chờ `retryDelay` vài giây khi thật ra đã cạn quota ngày là đâm vào tường lặp lại cho tới khi hết trần thử lại — đúng thứ làm job 1 000 chương chết giữa đêm. Ngược lại, đóng băng một khóa tới sáng hôm sau chỉ vì một 429 theo phút thì phí mất một khóa còn tốt; vì vậy nhánh “không nhận ra được” **mặc định mức ngắn** rồi mới tăng dần.

### D12. Cảnh báo khóa cùng project, không chặn

Tên quota của free tier là `GenerateRequestsPerDayPerProjectPerModel-FreeTier` — hạn mức tính **theo project**, nên hai khóa sinh trong cùng một project Google Cloud nhiều khả năng dùng chung hạn mức và `fill-first` giữa chúng vô ích. Mira **không đọc được project từ khóa**, nên không thể tự kiểm tra. Cách xử lý: khi người dùng thêm khóa Gemini thứ hai cho cùng một kết nối, hiện **một câu** nhắc dùng khóa từ project khác. Không chặn thao tác, không hỏi lại. Suy luận này **chưa xác minh** — bước kiểm chứng 5.2b phải chạy trước khi coi là đúng.

### D13. Hai preset, một adapter — khác nhau chỉ ở dữ liệu

Không có nhánh mã nào theo nhà cung cấp. Khác biệt giữa hai đường nằm trong bản ghi kết nối:

| | Gateway tự dựng | Google Gemini |
| --- | --- | --- |
| `baseUrl` | người dùng nhập, gợi ý `http://127.0.0.1:8317/v1` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| Khóa | khóa của **chính proxy** (`access.api-keys` của gateway) | API key Google |
| Khóa để trống | được | không |
| Xoay vòng nhiều khóa | gateway làm; Mira thường chỉ khai một khóa | **Mira làm** (D11) |
| Tên model | có thể là alias do người dùng đặt trong gateway | tên upstream của Google |

Hệ quả: Mira **không được giả định `id` model khớp snapshot models.dev**. Khớp được thì hiện giới hạn và giá; không khớp thì nói “chưa biết giá” (đã có ở `ai-connection` spec) — alias của gateway rơi vào nhánh này là chuyện bình thường, không phải lỗi.

### D14. Chuẩn hoá `id` model trước khi tra bảng giá

`GET /v1beta/openai/models` của Gemini có thể trả `id` kèm tiền tố (`models/gemini-…`) — **chưa xác minh**, bước kiểm chứng 5.8. Adapter cắt tiền tố `models/` nếu có rồi mới tra snapshot; giữ nguyên chuỗi gốc để gửi lại khi gọi. Một hàm thuần, có test cho cả hai dạng.

### D15. Không dùng SDK của nhà cung cấp — `fetch` trần

Có SDK chính chủ: **`@google/genai`** là SDK hợp nhất, GA từ 05/2025, thay `@google/generative-ai` (ngừng hỗ trợ 2025-11-30, lưu trữ repo 2025-12-16). Vẫn **không dùng**, vì ba lý do theo đúng thứ tự quan trọng:

1. **SDK làm mất đúng thứ D10/D11 cần.** Đọc `src/_api_client.ts` của [`js-genai`](https://github.com/googleapis/js-genai): lỗi được ném bằng `new ApiError({ message, status })` — **chỉ status và message**; thân lỗi bị `JSON.stringify` nhét vào `message`, `error.details` không còn là trường có cấu trúc. Nghĩa là `retryDelay` và `quotaId` chỉ lấy lại được bằng cách **phân tích chuỗi** — đúng việc mà lớp 3 của D10 làm, nhưng qua một lớp trung gian nữa. Cùng vấn đề đã ghi ở [vercel/ai #18627](https://github.com/vercel/ai/issues/18627) và [python-genai #1875](https://github.com/googleapis/python-genai/issues/1875).
2. **SDK chỉ phục vụ một trong hai hướng.** `@google/genai` nói giao thức Gemini, không nói endpoint tương thích OpenAI của gateway. Dùng nó là có hai đường mã cho hai hướng — trái D13 và trái [ADR-004](../../../../docs/handbook/decisions/0004-ai-provider-layer.md).
3. **Không cần dependency nào.** Electron 44 đi kèm Node 24 nên `fetch` và `AbortSignal` có sẵn; `valibot` đã có trong repo để kiểm hình dạng phản hồi. Thêm một SDK vào main process là thêm bề mặt cập nhật cho thứ chỉ gọi hai endpoint.

**Điều kiện xem lại:** nếu bước kiểm chứng 5.2a cho thấy lớp tương thích OpenAI của Gemini **nuốt mất** `error.details`, lựa chọn đúng **không phải** là thêm SDK mà là thêm một **biến thể ánh xạ request/response theo giao thức Gemini gốc bên trong cùng adapter** — cùng chỗ đọc lỗi, cùng chỗ chọn khóa, chỉ khác hàm dựng body. Gateway cũng phơi `/v1beta/models/*action` nên biến thể đó chạy được cho cả hai hướng nếu cần.

## Risks / Trade-offs

- **Mất bảo đảm schema và prompt caching** khi đi qua lớp tương thích OpenAI (ADR-004 đã chấp nhận). Bù bằng D5. Rủi ro còn lại: tỷ lệ ID hỏng cao hơn mức chấp nhận được — đo ở `tasks.md` mục kiểm chứng, và nếu vượt ngưỡng thì điều kiện kích hoạt adapter native trong ADR-004 đã mở.
- **Hệ số ước lượng chi phí là phỏng đoán.** Ước lượng lệch làm mất lòng tin vào chính điểm khác biệt của sản phẩm. Giảm thiểu: luôn ghi “ước lượng”, ghi `usage` thật để đối chiếu, và không hiện con số nào khi chưa biết giá.
- **Phụ thuộc models.dev.** Nguồn ngoài ngừng thì snapshot vẫn dùng được nhưng cũ dần. Chấp nhận; ADR-004 ghi đây là điều kiện xem lại.
- **Màn cài đặt mới mở thêm một trục điều hướng.** Nếu chọn phương án hộp thoại (B) để rẻ hơn thì sẽ phải dựng lại khi thêm mục cài đặt thứ hai — ghi rõ trong [thiết kế màn](../../../../docs/handbook/experience/ai-connection-settings.md).

## Open Questions

- **Chỗ đặt màn cài đặt** (màn riêng / hộp thoại / khu trong màn tác phẩm) — chờ chủ sản phẩm chọn; `tasks.md` không bắt đầu phần giao diện trước khi có câu trả lời.
- **Có vẽ wireframe trước không** — chờ chủ sản phẩm.
- **Model mặc định khi cài mới** và **trần chi phí mỗi job**: [câu hỏi còn mở](../../../../docs/handbook/product/open-questions.md) vẫn ghi là chưa chốt; lát cắt này không áp trần, chỉ hiện ước lượng.
