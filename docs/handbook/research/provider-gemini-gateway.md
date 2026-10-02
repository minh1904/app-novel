# Hai hướng provider của lát cắt đầu: gateway tự dựng và API key Google

Ngày đọc: **2026-10-02** · Trạng thái: Quan sát + đề xuất · Chủ trì: engineering · Liên quan: [ADR-004](../decisions/0004-ai-provider-layer.md), change OpenSpec `ai-connection`, [nghiên cứu nhà cung cấp AI](ai-provider-integration.md)

## Câu hỏi và phương pháp

[ADR-004](../decisions/0004-ai-provider-layer.md) chốt một adapter `openai-compatible` cho mọi nhà cung cấp, và lát cắt đầu chạy hai đường: **gateway do người dùng tự dựng** và **API key Google trực tiếp**. Trang này trả lời: mỗi đường cho gì, thiếu gì, và chỗ nào hai đường **khác nhau đủ để đổi mã**.

Đọc tài liệu chính chủ và mã nguồn trong ngày: tài liệu tương thích OpenAI của Gemini, `config.example.yaml` và `internal/api/server_routes.go` của CLIProxyAPI, cộng các báo lỗi công khai về 429. **Chưa gọi thử API nào, chưa dựng gateway, chưa đo.**

## Quan sát 1 — Đường B: Google Gemini qua lớp tương thích OpenAI

| Mệnh đề | Nguồn (đọc 2026-10-02) | Giới hạn |
| --- | --- | --- |
| Base URL `https://generativelanguage.googleapis.com/v1beta/openai/`. Endpoint hỗ trợ: `/chat/completions`, **`/models`**, `/embeddings`, `/images/generations`, `/videos`, `/batches` | [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) | Tài liệu ghi rõ “still in beta while we extend feature support” |
| Có `response_format` (structured output), function calling, streaming (`stream=True`), ảnh vào (`image_url`), audio vào | cùng nguồn | Tài liệu minh hoạ bằng Pydantic/Zod, **không nêu rõ cú pháp `json_schema` thô** → phải tự thử |
| `reasoning_effort` của OpenAI ánh xạ sang `thinking_level` hoặc `thinking_budget` tuỳ model; mức `minimal`/`low`/`medium`/`high`, budget 1 024–24 576 | cùng nguồn | Không tắt được reasoning trên Gemini 2.5 Pro và dòng 3 |
| **429 không có header `Retry-After`.** Thời gian chờ nằm trong thân JSON ở `error.details[]` với `@type: type.googleapis.com/google.rpc.RetryInfo`, trường `retryDelay: "34.4s"` | [vercel/ai #18627](https://github.com/vercel/ai/issues/18627) | Issue của một SDK bên thứ ba, không phải tài liệu Google; cần tự xác minh bằng một lần gọi thật |
| Lớp tương thích/SDK **có thể làm mất `error.details`** khi đổi lỗi sang hình dạng OpenAI | cùng nguồn | Đây là lỗi của SDK đó; Mira tự viết adapter nên đọc được thân thô — nhưng phải **chủ động** đọc |
| 429 có **hai loại khác hẳn nhau**: chạm giới hạn theo phút (chờ `retryDelay` rồi thử lại là được) và **cạn quota theo ngày** (`quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`) — loại sau thử lại theo `retryDelay` là **vô ích**, phải chờ tới mốc reset | [inspect_ai #5526](https://github.com/UKGovernmentBEIS/inspect_ai/issues/5526), [diễn đàn Gemini](https://discuss.ai.google.dev/t/429-errors-despite-waiting-after-retrydelay/96899) | Số hạn mức cụ thể do bên thứ ba nêu mâu thuẫn nhau (250/ngày vs 20/ngày); **không hardcode**, đọc từ lỗi |
| Google **không còn công bố bảng giới hạn cố định theo model**, chuyển sang xem ở dashboard | [đã ghi ở nghiên cứu trước](ai-provider-integration.md) | — |

**Hệ quả nặng nhất cho Mira:** tên quota là `…PerProjectPerModel…`. Nghĩa là hạn mức free tier tính **theo project**, không theo khóa. **Hai khóa sinh trong cùng một project Google Cloud nhiều khả năng dùng chung một hạn mức** — xoay vòng chúng không cứu được job. Người dùng muốn `fill-first` có tác dụng thì các khóa phải thuộc **project khác nhau**. Đây là suy luận từ tên quota, **cần xác minh bằng một lần chạy thật** (bước kiểm chứng 2 ở `tasks.md`), nhưng nếu đúng thì nó là thứ phải nói thẳng trong UI, không để người dùng tự phát hiện sau một đêm chạy hỏng.

## Quan sát 2 — Đường A: gateway tự dựng (CLIProxyAPI làm mẫu)

Đọc `config.example.yaml` (1 191 dòng) và `internal/api/server_routes.go` trên nhánh `main`, không lưu permalink commit.

**Bề mặt nó phơi ra cho Mira** — `GET /v1/models`, `POST /v1/chat/completions` (và cả `/v1/messages` kiểu Anthropic, `/v1beta/models/*action` kiểu Gemini). Cổng mặc định `8317`. Nghĩa là **đúng một adapter của Mira nói chuyện được với nó**, kể cả phép kiểm tra kết nối bằng `/models`.

**Cấu hình khóa Gemini trong gateway** (nhóm `api-keys.gemini`, trích nguyên khóa cấu hình):

| Khóa | Dùng để |
| --- | --- |
| `base-url: "https://generativelanguage.googleapis.com"` | Điểm cuối upstream của cả nhóm |
| `keys[].api-key`, `keys[].weight`, `keys[].priority`, `keys[].prefix` | Nhiều khóa trong một nhóm, mỗi khóa override được |
| `models[].name` / `models[].alias` / `display-name` / `max-context-length` / `thinking.levels` | **Tên model client thấy tách khỏi tên upstream** |
| `excluded-models` (khớp wildcard `gemini-2.5-*`, `*-preview`, `*flash*`) | Giấu bớt model khỏi danh sách |
| `request-scoped-errors[]`: `status` + `match` / `match-regexr` + `action` ∈ `stop` · `stop-and-cooldown` · `continue` · `continue-and-cooldown` | **Phân loại lỗi upstream theo nội dung thân phản hồi** |
| `routing.strategy: round-robin` \| `weighted-round-robin` \| **`fill-first`**; `routing.retry.request-retry`, `max-retry-credentials`, `max-retry-interval`; `cooldown.disable-cooling`, `transient-error-cooldown-seconds` | Chọn khóa, thử lại, đóng băng |
| `access.api-keys[]` | **Khóa để client xác thực với chính proxy** — tách hẳn khỏi `api-keys` của upstream |

**Hai điều đáng chú ý nhất:**

1. **`request-scoped-errors` giải đúng bài toán 429 hai loại ở trên.** Một quy tắc `status: 429` + `match: ["GenerateRequestsPerDayPerProjectPerModel-FreeTier"]` + `action: "continue-and-cooldown"` cho gateway biết: khóa này cạn theo ngày, chuyển khóa khác và đóng băng nó — thay vì chờ `retryDelay` vài giây rồi lại đâm vào tường. Đây là thứ **Mira nên khuyến nghị trong tài liệu hướng dẫn dựng gateway**, không phải thứ Mira tự làm hộ.
2. **`access.api-keys` là bắt buộc trên thực tế.** Proxy không có khóa client thì **mọi tiến trình trên máy gọi được** nó, tức là dùng được hạn mức Gemini của người dùng. Tài liệu hướng dẫn của Mira phải nói rõ: đặt một khóa ở `access.api-keys`, rồi điền đúng khóa đó vào ô “Khóa API” của Mira.

## Quan sát 3 — SDK chính chủ của Google: có, nhưng không giải bài toán của Mira

| Mệnh đề | Nguồn (đọc 2026-10-02) | Giới hạn |
| --- | --- | --- |
| `@google/generative-ai` **đã ngừng hỗ trợ** (bug fix dừng 2025-11-30, repo lưu trữ 2025-12-16), thay bằng SDK hợp nhất **`@google/genai`**, GA từ 05/2025, gộp cả Gemini API và Vertex AI | [repo đã lưu trữ](https://github.com/google-gemini/deprecated-generative-ai-js), [Gemini API libraries](https://ai.google.dev/gemini-api/docs/libraries) | — |
| **`js-genai` ném lỗi chỉ với `status` và `message`**: `new ApiError({ message, status })`; thân lỗi bị `JSON.stringify` nhét vào `message`, `error.details` không còn là trường có cấu trúc | đọc `src/_api_client.ts` của [googleapis/js-genai](https://github.com/googleapis/js-genai) | Đọc qua tóm tắt một tệp mã trên nhánh `main`, không lưu permalink; chưa chạy thử |
| Cùng vấn đề ở SDK khác: `@ai-sdk/google` bỏ `google.rpc.RetryInfo` khỏi schema lỗi; `python-genai` không tôn trọng `retryDelay` do server trả | [vercel/ai #18627](https://github.com/vercel/ai/issues/18627), [python-genai #1875](https://github.com/googleapis/python-genai/issues/1875) | Issue của bên thứ ba và của chính Google, chưa tự tái hiện |

**Suy luận:** thứ Mira cần nhất ở tầng này là **phân loại 429 cho đúng** (Quan sát 1), mà đó lại đúng là thứ các SDK đang làm mất. Một SDK ở giữa biến `error.details` có cấu trúc thành một chuỗi — tức là Mira vẫn phải phân tích chuỗi, chỉ là qua thêm một lớp. Cộng với việc SDK chỉ nói giao thức Gemini (không nói endpoint của gateway), kết luận là **gọi `fetch` trần**; chi tiết và điều kiện xem lại ở D15 của change `ai-connection`.

## Quan sát 4 — Hai đường khác nhau ở đâu

| Việc | A · gateway tự dựng | B · Gemini trực tiếp |
| --- | --- | --- |
| Kiểm tra kết nối bằng `GET {base}/models` | Có | Có |
| Khóa gửi kèm | Khóa của **chính proxy** (`access.api-keys`) | **API key Google** |
| Khóa để trống được | Có, nếu người dùng không đặt `access.api-keys` (**không nên**) | Không |
| Tên model | Có thể là **alias** do người dùng đặt trong gateway | Tên upstream của Google |
| Xoay vòng nhiều khóa | **Gateway làm** (`fill-first`, `cooldown`, `request-scoped-errors`) | **Mira làm** |
| Phân biệt 429 theo phút / theo ngày | Gateway làm, nếu người dùng cấu hình `request-scoped-errors` | **Mira phải tự làm** |
| `retryDelay` | Phụ thuộc gateway có chuyển tiếp hay không — **chưa biết**, phải thử | Trong `error.details[]`, không có header |
| Thêm nhà cung cấp khác về sau | Đổi cấu hình gateway, Mira không đổi gì | Phải khai thêm một kết nối trong Mira |

**Suy luận:** hai đường **không cần hai adapter**, nhưng cần **một tầng phân loại lỗi chịu được cả hai**: adapter phải đọc được `retryDelay` và `quotaId` khi có, và vẫn chạy đúng khi không có (gateway nuốt mất). Nghĩa là cách phân loại phải **suy giảm êm**, không phải một bảng ánh xạ cứng.

## Đề xuất cho Mira

0. **Không dùng SDK nhà cung cấp; gọi `fetch` trần.** Electron 44 đi kèm Node 24 nên `fetch` và `AbortSignal` có sẵn, `valibot` đã có trong repo để kiểm hình dạng phản hồi — không thêm dependency nào. Lý do chính không phải gọn nhẹ mà là **giữ được thân lỗi thô**, thứ quyết định mục 1 và 2 dưới đây.
1. **Hai mức đóng băng khóa, không phải một.** `cooldown ngắn` theo `retryDelay` cho giới hạn theo phút; `cooldown dài tới mốc reset` khi nhận ra cạn quota theo ngày. Nhận ra bằng chuỗi `PerDay` / `GenerateRequestsPerDayPerProject` trong thân lỗi; không nhận ra được thì **mặc định mức ngắn** và tăng dần sau mỗi lần lặp lại (backoff), để không đóng băng oan một khóa còn tốt.
2. **Đọc lỗi theo ba lớp, suy giảm êm:** thân JSON kiểu Google (`error.details[]` → `RetryInfo.retryDelay`, `QuotaFailure.violations[].quotaId`) → thân JSON kiểu OpenAI (`error.message`, `error.code`) → quét chuỗi thô tìm `retryDelay` / `PerDay`. Lớp nào cũng trượt thì phân loại theo mã HTTP.
3. **Cảnh báo khóa cùng project** ngay trong màn Kết nối AI khi người dùng thêm khóa Gemini thứ hai: hạn mức free tier tính theo project, hai khóa cùng project có thể vô dụng. Một câu, không chặn thao tác.
4. **Luôn chạy tầng kiểm tra ID** (đã chốt ở ADR-004) — tài liệu Gemini chỉ minh hoạ `response_format` bằng Pydantic/Zod, không cam kết cú pháp `json_schema` thô, và gateway ở giữa có thể biến đổi payload.
5. **Tài liệu hướng dẫn dựng gateway** nêu đúng ba thứ: đặt `access.api-keys`; khai khóa Gemini ở `api-keys.gemini[].keys`; thêm quy tắc `request-scoped-errors` cho 429-theo-ngày. Không đóng kèm, không tự cấu hình hộ (ADR-004).
6. **Không hardcode con số hạn mức nào.** Google không còn công bố bảng cố định; mọi con số trong UI phải đến từ phản hồi lỗi hoặc từ người dùng.

## Bước kiểm chứng

1. Gọi thật một lần tới `…/v1beta/openai/chat/completions` bằng khóa free tier, **ép chạm 429 theo phút** và **chạm 429 theo ngày**, lưu lại nguyên văn hai thân lỗi. Đây là dữ liệu quyết định mục 1 và 2 ở trên đúng hay sai.
2. Thử `response_format` dạng `json_schema` thô trên một lô segment có ID; đo tỷ lệ hỏng ID so với khi chỉ dặn bằng prompt.
3. Dựng CLIProxyAPI với một khóa Gemini, so **cùng một lô** qua gateway và gọi thẳng: tên model trả về, có `retryDelay` không, 429 có nguyên dạng không.
4. Hai khóa Gemini **cùng một project** và hai khóa **khác project**: xác nhận hạn mức theo ngày có dùng chung hay không — quyết định mục 3.
5. `GET /v1beta/openai/models`: ghi lại dạng `id` trả về (có tiền tố `models/` hay không) để chuẩn hoá trước khi so với snapshot models.dev.

---

[Mục lục handbook](../README.md)
