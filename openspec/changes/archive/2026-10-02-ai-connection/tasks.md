## 0. Quyết định giao diện — đã chốt 2026-10-02

- [x] 0.1 Chỗ đặt màn cài đặt: **màn riêng**
- [x] 0.2 Vẽ wireframe trước: **có** — bảy phương án (A–G), đã probe ở 1280 và 375, hai theme, hai nấc màu
- [x] 0.3 Chọn phương án: **F — màn riêng, không thanh bên con**, vào bằng **nút bánh răng góc trên bên phải** (cạnh nút sáng/tối, có ở mọi màn), đóng thì quay lại đúng màn trước. Lý do và số đo ở [thiết kế màn kết nối AI](../../../../docs/handbook/experience/ai-connection-settings.md)

Mục 1–3 (main process, không có giao diện) không phụ thuộc phần giao diện và chạy song song được.

## 1. Snapshot bảng model và giá

- [x] 1.1 Script refresh thủ công lấy `https://models.dev/api.json`, lọc còn các nhà cung cấp Mira quan tâm và các trường cần (`limit.context`, `limit.output`, `cost.input`, `cost.output`, `cost.cache_read`, `cost.cache_write`, `structured_output`, `tool_call`, `status`), ghi ra một tệp JSON trong repo **kèm ngày đọc trong chính tệp**; attribution MIT của models.dev ghi trong repo
- [x] 1.2 Hàm đọc snapshot: tra theo `(providerId, modelId)`, trả `undefined` khi không có (để UI nói "chưa biết giá" thay vì hiện 0); test thuần cho ca có, ca không có, ca `status: deprecated`
- [x] 1.3 Hàm ước lượng chi phí: ký tự nguồn → token theo hệ số của ngôn ngữ nguồn → × (1 + tỷ lệ đầu ra) → × giá. **Hệ số và tỷ lệ đầu ra đặt một chỗ, có comment ghi rõ là phỏng đoán chưa đo** (D7); test thuần cho ba cặp ngôn ngữ và ca thiếu giá

## 2. Kho cài đặt kết nối

- [x] 2.1 Ba bảng mới trong `library.db` (kết nối, khóa, model đã chọn), version +1, nâng cấp nguyên tử qua `migrate.ts`, thêm fixture schema vào `__fixtures__/`; test migrate từ version trước và test `schemaSnapshot`
- [x] 2.2 Mã hóa khóa bằng `safeStorage.encryptStringAsync`/`decryptStringAsync`; `isEncryptionAvailable()` false thì **từ chối lưu** và trả lỗi `auth` có thông điệp riêng, không ghi plaintext (D2); test cho cả hai nhánh bằng cách tiêm một `safeStorage` giả
- [x] 2.3 Đọc/ghi kết nối: lưu ciphertext + bốn ký tự cuối + trạng thái đóng băng; **không có hàm nào trả khóa dạng rõ ra khỏi main process**; test rằng kiểu dữ liệu trả về cho renderer không chứa trường khóa
- [x] 2.4 Kiểm tra bằng test rằng xuất/backup một tác phẩm không mang kết nối hay khóa đi theo (D3)

## 3. Adapter thật và chọn khóa

- [x] 3.1 `OpenAiCompatibleProvider` cài `TranslationProvider`: gửi JSON có segment ID, nhận và parse; dùng `reconcile.ts` đã có cho tập ID; **tầng kiểm tra chạy vô điều kiện** theo thứ tự parse → tập ID khớp → không rỗng (D5); test với server giả cho các ca đủ ID, thiếu, thừa, trùng, rỗng, không parse được
- [x] 3.2 Chia lô theo ranh giới đoạn, hằng số ~1–2k token nguồn đặt một chỗ có comment "phỏng đoán chưa đo" (D6); test rằng không có lô nào cắt giữa đoạn
- [x] 3.3 Chọn khóa `fill-first`: khóa đầu không đóng băng; `rate_limited` → đóng băng tới `now + retryAfterMs` (mặc định cố định nếu không có) rồi **thử lại cùng yêu cầu bằng khóa sau**; `auth` → đánh dấu sai, bỏ qua, **không** đóng băng theo thời gian; hết khóa → lỗi `rate_limited` cấp kết nối kèm thời điểm hồi phục sớm nhất; trần số lần thử lại (D4). Test thuần cho cả năm nhánh, dùng đồng hồ tiêm vào
- [x] 3.4 Phân loại lỗi **ba lớp suy giảm êm** (D10): thân kiểu Google (`error.details[]` → `RetryInfo.retryDelay`, `QuotaFailure.violations[].quotaId`) → thân kiểu OpenAI (`error.message`/`code`) → quét chuỗi thô (`retryDelay`, `PerDay`) → cuối cùng chỉ theo mã HTTP. Trả `{ kind, retryAfterMs?, quotaScope?: 'minute' | 'day' }`; **không đoán** `quotaScope` khi không có bằng chứng. Test cho 401, 403, 429 kiểu Google có `details`, 429 đã bị gateway đổi dạng, 429 không có gì, 5xx, timeout, thân không phải JSON
- [x] 3.4b Hai mức đóng băng (D11): `quotaScope: 'minute'` → đóng băng đúng `retryAfterMs` + đệm; `'day'` → đóng băng tới mốc reset; không xác định → mức ngắn mặc định, **nhân đôi** sau mỗi lần cùng khóa lặp lại. Test bằng đồng hồ tiêm vào cho cả ba nhánh và cho ca "429 theo ngày nhưng `retryDelay` chỉ vài giây" — ca này phải **không** thử lại khóa đó sau vài giây
- [x] 3.4c Chuẩn hoá `id` model trước khi tra snapshot (D14): cắt tiền tố `models/` nếu có, giữ nguyên chuỗi gốc để gửi đi; hàm thuần, test cả hai dạng
- [x] 3.5 Kiểm tra kết nối: `GET {baseUrl}/models`, trả danh sách model hoặc lỗi đã phân loại; **endpoint không có `/models` → báo "nối được, không liệt kê được model"**, không coi là lỗi kết nối (D1); test cả ba ca
- [x] 3.6 Ghi nguồn gốc qua `provenance.ts` đã có: provider, model, thời điểm; test rằng bản dịch thật không bị đánh dấu giả lập và ngược lại

- [x] 3.7 **Nối ba mảnh thành một `KeySource` thật**: đọc `readKeyCiphers` → `chooseKey` (fill-first) → `SecretStore.open` (ghi lại bản mã khi hệ điều hành xoay khóa) → `decideFreeze` → `freezeKey`/`markKeyInvalid`/`clearKeyFreeze`. Hiện ba mảnh đã có và có test riêng, nhưng **chưa có lớp dán chúng lại**; đây là thứ cuối cùng trước khi mục 4 nối được IPC. Test bằng kho thật: hai khóa, khóa đầu trả 429-theo-ngày, job phải chuyển sang khóa sau và khóa đầu phải bị đóng băng tới mốc reset

## 4. IPC và giao diện (theo phương án F đã chốt ở mục 0)

- [x] 4.1 Kênh IPC mới trong `src/shared/channels.ts` + handler: liệt kê kết nối, thêm/sửa/xóa, thêm/xóa khóa, kiểm tra kết nối, đặt model. Kiểu bằng `valibot`, kết quả bọc `Result`; **kiểu trả về cho renderer không có trường khóa rõ**
- [x] 4.2 Nguyên tố giao diện còn thiếu, dựng theo khuôn `Button`/`Panel`/`TextField` đang có, không thêm dependency: công tắc bật/tắt, badge trạng thái, khối rỗng
- [x] 4.3 Màn "Kết nối AI" theo phương án F: **không thanh bên con**, nội dung giới hạn `max-w-[900px]` giữa vùng làm việc; mỗi kết nối một `Panel`; biểu mẫu tên + URL + preset, danh sách khóa mỗi khóa một dòng có trạng thái, nút "Kiểm tra kết nối", chọn model và model mặc định. **Ô khóa không bắt buộc**; lỗi hiện cạnh ô gây lỗi
- [ ] 4.4 *(chưa làm)* Dựng **đủ chín trạng thái** của màn kết nối trong bảng tài liệu thiết kế (rỗng, đang kiểm tra, thành công, lỗi auth, lỗi mạng/URL, hết quota một khóa, hết mọi khóa, không lưu được khóa, model đã khai tử) — mỗi trạng thái một ví dụ tĩnh để xem cạnh nhau, không dựng bản bấm được để xem
- [x] 4.5 **Đường vào:** nút bánh răng trong `AppShell` ở cụm phải thanh tiêu đề, **đặt trước nút sáng/tối**, có trên mọi màn, `aria-label` "Cài đặt"; nhánh `View` mới `{ name: 'settings' }` trong `App.tsx`; **nhớ màn trước** để nút "Quay lại" và việc đóng cài đặt trả người dùng về đúng chỗ (kể cả khi vào từ hộp thoại "Dịch bằng AI" ở trạng thái chưa có kết nối). Mọi chuyển màn đi qua `registry.confirmLeave()` như hiện tại
- [ ] 4.5b *(tùy chọn)* Phím tắt `Ctrl+,` mở cài đặt — nếu làm thì theo đúng quy ước đã có: kiểm `event.defaultPrevented` ở đầu trình xử lý toàn cục và kiểm cả `metaKey`, như `AppShell` Ctrl+B và `ChapterWorkspace` Ctrl+S/Ctrl+K
- [x] 4.6 Hộp thoại "Dịch bằng AI" trên màn chương: trạng thái chưa có kết nối, ước lượng trước khi chạy, cảnh báo khi chương đã có bản dịch, tiến độ theo segment, nút Hủy, danh sách phần lỗi + "Dịch lại phần lỗi"; dùng `Dialog` và `Banner` đã có. **Vòng lặp lô nằm ở renderer** (`useAiTranslate.ts`): kho này chỉ có `invoke`/`handle`, chưa có kênh main → renderer, nên mỗi lô là một lời gọi riêng — tiến độ là số câu đã ghi thật, Hủy chỉ là "không gửi lô tiếp"
- [x] 4.7 Ghi kết quả vào bản dịch **theo segment ID, qua `saveRow` đã có** (không qua `EditorSession`: `saveRow` đã là lời ghi nguyên tử một hàng có kiểm revision, còn `EditorSession` sống trong trình soạn và không thấy được liên kết). `saveRow` nhận thêm `by: RowAuthor` nên bản AI có liên kết `kind: 'ai'`, `reviewedAt: null` và nguồn gốc mang provider + model. **Không ghi đè segment người dùng đã viết hay đã soát** — những câu đó quay về hộp thoại dưới dạng hai bản cạnh nhau để người dùng chọn; test hành vi với kho thật qua handler ở `src/main/ipc/aiTranslateHandlers.test.ts`
- [ ] 4.7b *(còn thiếu)* `usage` thật hiện được ngay sau khi chạy nhưng **chưa lưu lại**: lưu cần thêm bảng (schema v5). Cảnh 'Ghi lượng dùng thật sau khi chạy' của spec vì vậy chỉ đúng trong phạm vi một lượt chạy

## 5. Kiểm chứng

- [ ] 5.1 **Ca quyết định ADR-004 đúng hay sai #1:** đo tỷ lệ phản hồi hỏng ID trên fixture hai chương thật, qua ba đường — gateway tự dựng, Gemini trực tiếp, và (nếu dựng được) một endpoint có structured output gốc. Ghi số vào [nghiên cứu](../../../../docs/handbook/research/ai-provider-integration.md) và `delivery/validation.md`; vượt ngưỡng chấp nhận thì kích hoạt điều kiện làm adapter native trong ADR-004
- [ ] 5.2 **Ca quyết định #2:** hai khóa Gemini free, dịch tới khi khóa 1 hết hạn mức; xác nhận job **không đứt**, chuyển sang khóa 2, **không dịch lại segment đã xong**, và màn kết nối hiện đúng khóa nào đang đóng băng
- [ ] 5.2a **Lấy nguyên văn hai thân lỗi 429 của Gemini** — một lần chạm giới hạn theo phút, một lần cạn hạn mức theo ngày — rồi đối chiếu với giả định của D10/D11. Đây là dữ liệu quyết định hai quyết định đó đúng hay sai; làm **trước** khi tin bộ phân loại
- [ ] 5.2b **Xác minh phạm vi hạn mức** (D12): hai khóa **cùng một project** Google Cloud và hai khóa **khác project**; đo xem hạn mức theo ngày có dùng chung không. Dùng chung thì câu nhắc ở 4.3 là bắt buộc; không dùng chung thì gỡ câu nhắc và sửa D12
- [ ] 5.2c So **cùng một lô** qua gateway và gọi thẳng Gemini: tên model trả về, `retryDelay` có được chuyển tiếp không, 429 có giữ nguyên dạng không. Ghi kết quả vào [nghiên cứu hai hướng provider](../../../../docs/handbook/research/provider-gemini-gateway.md)
- [ ] 5.2d Thử `response_format` dạng `json_schema` thô trên một lô có ID; so tỷ lệ hỏng ID với khi chỉ dặn bằng prompt — tài liệu Gemini **không cam kết** cú pháp này
- [ ] 5.3 Đo lệch giữa ước lượng và `usage` thật trên cùng fixture; hiệu chỉnh hệ số ở 1.3 hoặc ghi lại độ lệch nếu chưa đủ dữ liệu
- [ ] 5.4 **Chưa chạy được** — Playwright không gắn được vào Electron trong môi trường này (quá trình thoát ngay sau khi khởi động, dù chạy `electron.exe --inspect=0 --remote-debugging-port=0 .` bằng tay thì lên bình thường). Màn Cài đặt **chưa được xem bằng mắt trong app thật**. Chạy trong Electron thật: khai kết nối local khi proxy **chưa chạy** (phải ra lỗi mạng cạnh ô URL, có gợi ý), rồi khi proxy đã chạy; dán khóa sai (lỗi cạnh ô khóa); dịch một chương, hủy giữa chừng, dịch lại phần lỗi; chụp màn hình sáng/tối ở 1280 px, kiểm tra không cuộn ngang
- [ ] 5.5 Kiểm tra `safeStorage` thật trên Windows: lưu khóa, khởi động lại app, dùng lại được; ghi lại hành vi quan sát được khi không khả dụng
- [ ] 5.8 `GET /v1beta/openai/models`: ghi lại dạng `id` trả về (có tiền tố `models/` hay không) để chốt 3.4c
- [ ] 5.9 Viết trang hướng dẫn **dựng gateway bằng API key của mình** (tài liệu, không phải code): đặt `access.api-keys` cho client — **không đặt là mọi tiến trình trên máy dùng được hạn mức của bạn**; khai khóa ở `api-keys.gemini[].keys`; thêm quy tắc `request-scoped-errors` cho 429-theo-ngày (`status: 429` + `match` chuỗi `PerDay…` + `action: continue-and-cooldown`). Không nêu tên công cụ trong UI (ADR-004), chỉ trong tài liệu
- [ ] 5.6 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; `openspec validate --strict` cho change này
- [ ] 5.7 Cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `delivery/backlog.md`, `delivery/validation.md`, `product/open-questions.md` (model mặc định và trần chi phí nếu đã chốt được), `maintenance/changelog.md`
