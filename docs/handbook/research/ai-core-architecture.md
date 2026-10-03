# Lõi AI của Mira: kiến trúc provider đã hợp lý chưa, và sản phẩm khác dựng thế nào

Ngày đọc: **2026-10-03** · Trạng thái: **Quan sát** (mã Mira và mã nguồn các sản phẩm khác) cộng **đề xuất** chưa chốt, ghi riêng ở "Suy luận" · Chủ trì: engineering · Liên quan: [ADR-004](../decisions/0004-ai-provider-layer.md), [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md), [kiến trúc AI-first](../engineering/ai-first-architecture.md), [nghiên cứu nhà cung cấp AI](ai-provider-integration.md), [kiến trúc app Electron](electron-architecture.md), change `context-core`.

## Kết luận ngắn

1. **Hướng chọn ở ADR-004 vẫn đúng:** một đường dây OpenAI Chat Completions gọi bằng `fetch` trần, khóa nhiều, bảng giá từ models.dev, lỗi giữ nguyên thân phản hồi. Phần đọc `RetryInfo` của Gemini và chiến lược khóa `fill-first` có kiểm sức khỏe khóa **không thấy trong các tệp đã đọc của sáu agent lập trình**.
2. **Ranh giới giữa các lớp thì chưa hợp lý.** `OpenAiCompatibleProvider` vừa là transport, vừa chọn khóa, vừa cầm prompt dịch, chia lô, parse JSON, `reconcile` và vòng thử lại, vừa stream chat. Cả sáu agent lập trình và LinguaGacha đều tách "một lượt gọi model" khỏi logic tác vụ; Mira là ngoại lệ. Nó sẽ vỡ ở đúng hai module kế tiếp: đề xuất/tác vụ (ADR-005 đổi hợp đồng sang đoạn) và `context-core` (cần dựng prompt và đo cache).
3. **Ba thiếu sót cụ thể** ngoài ranh giới: `usage` chỉ có input/output và không lưu; bộ chọn khóa chỉ đúng khi gọi tuần tự; không có dữ liệu khả năng theo endpoint (không gửi `max_tokens`, `reasoning_effort`, `response_format`).
4. **Một giả định trong mã cần sửa lại cách nói:** chú thích đầu `openAiCompatible.ts` và lý do loại SDK ở ADR-004 nói SDK "làm mất `error.details`". Đúng với vài SDK hãng, **không đúng với Vercel AI SDK** (giữ `responseBody`). Kết luận không dùng AI SDK vẫn đứng, nhưng vì lý do khác.
5. **Chưa gọi nhà cung cấp thật lần nào** ([hiện trạng](../engineering/current-state.md)). Mọi đánh giá dưới đây là từ đọc mã và tài liệu; nên lấy fixture thật (module 0) trước khi đổi ranh giới.

## Trạng thái sau change `ai-gateway` (cập nhật 2026-10-03)

Phần "kết nối và giao tiếp" của các đề xuất dưới đây **đã làm** trong change [`ai-gateway`](../../../openspec/changes/archive/2026-10-03-ai-gateway/) (đã lưu trữ 2026-10-03; tiến độ và bằng chứng ở `tasks.md`, thiết kế ở `design.md`, yêu cầu hiện hành ở `openspec/specs/ai-gateway`). Phần dịch/prompt (D1 về việc chuyển mã dịch lên `services`, thang leo thang, JobRunner) **chưa làm** và vẫn thuộc module 3–4. Bảng dưới là trạng thái của từng điểm A1–A7 ở Quan sát 1; nội dung các mục đó giữ nguyên làm hồ sơ.

| # | Điểm | Trạng thái | Cách giải quyết / còn lại |
| --- | --- | --- | --- |
| A1 | Provider cầm logic tác vụ | **Một phần** | Phần HTTP, khóa, thử lại, thời hạn đã tách thành `OpenAiChatTransport` + `Gateway`. Mã dịch MVP (prompt, chia lô, `reconcile`) **vẫn ở mặt tiền**, có chủ ý (D1): nó sẽ được viết lại ở module 3. |
| A2 | Không có cổng "một lượt model" có kiểu | **Một phần** | Transport là cổng đó (`stream`, `complete`, `listModels`). `ChatMessage` vẫn có hình OpenAI và còn nằm ở tệp transport; `ConnectionService.translator()` vẫn tên cũ. Gỡ ở module 3. |
| A3 | Thử lại thuộc provider, không có chờ | **Đã làm** | Gateway giữ một chủ thử lại (2 lần, 0,5 s nhân đôi, xáo ±20 %, trần 10 s, hủy được); thử lại theo nội dung có bộ đếm riêng. Kết nối không có khóa gặp 429 được thử lại có chờ. |
| A4 | `usage` nghèo, ba kiểu trùng | **Đã làm phần kiểu và tính tiền** | Một kiểu `Usage` (chưa gồm cache; cache và reasoning tách riêng); chi phí dùng giá cache. **Chưa làm:** sổ `usage` lưu bền (module 4). Đo thật cho thấy token thinking của Gemini nằm ngoài `completion_tokens`, nay được tính vào đầu ra. |
| A5 | Không có dữ liệu khả năng theo endpoint | **Đã làm, kể cả phần người dùng đặt** | `resolveCompat` (`maxTokensField`, `streamUsage`) và transport chỉ gửi tham số được đặt. Từ change `ai-model-settings` người dùng đặt tham số **theo mục model** (mức suy luận theo khả năng lấy từ `reasoning_options` của models.dev, nhiệt độ, `top_p`, trần token, header, `extra_body`); `compat.reasoningEffort` đã bỏ vì nó là một chỗ âm thầm bỏ tham số. Mục chưa đặt gì vẫn **không gửi** `max_tokens`/`reasoning_effort` — xem mục "Gemini đo thật" bên dưới. Đã đối chiếu `reasoning_options` với Gemini thật (2026-10-03): 3.1 Pro khớp, 3.5 Flash nhận thêm `none` (đã sửa tay có bằng chứng); 2.5 Pro không đo được vì không còn cho người dùng mới. |
| A6 | Bộ chọn khóa chỉ đúng khi tuần tự | **Đã làm** | `KeyScheduler` dùng bộ đếm lượt: 6 lỗi 429 đồng thời đóng băng một mức, `ok` đến muộn không gỡ đóng băng, một lượt thăm dò duy nhất; trần đồng thời 4 mỗi kết nối. Còn lại: tự điều chỉnh đồng thời (AIMD) và RPM, cần JobRunner. |
| A7 | Hủy chỉ ở mức "không gửi lô tiếp" | **Một phần** | Thời hạn tổng/đầu/im lặng và hủy xuyên suốt tầng gọi (hủy thắng hết hạn). `ChapterTranslator.runBatch` vẫn không truyền `signal` vì kênh IPC dịch chưa có đường hủy giữa lô; thuộc module 4. |

**Khác với bản đề xuất:** gateway nằm ở `infra/providers/gateway/`, **không** ở `services/ai/` như bảng "Kiến trúc đích" ghi, vì mặt tiền ở `infra` không được import xuống `services` (luật tầng do lint ép). Bộ lập lịch khóa dùng **bộ đếm lượt** thay cho máy trạng thái bốn cờ của LinguaGacha: cùng sửa hai lỗi, ít trạng thái hơn.

### Gemini đo thật (một lần chạy 2026-10-03, `gemini-2.5-flash`)

Bản ghi nằm ở [`__fixtures__/live`](../../../src/main/infra/providers/__fixtures__/live), test phát lại ở [`geminiFixtures.test.ts`](../../../src/main/infra/providers/geminiFixtures.test.ts). **Mỗi kịch bản một mẫu: quan sát, chưa phải quy luật.**

- **Thinking mặc định tốn rất nhiều so với câu trả lời.** Cùng một câu dịch ngắn: 21 token vào, 13 token trả lời, `total_tokens` 125, tức 91 token thinking bị ẩn khỏi `completion_tokens` và không có trường nào gọi tên chúng. Với `reasoning_effort: "none"`: tổng 33 = 21 + 12. Phần chênh được suy là thinking từ việc `"none"` làm nó biến mất; Google không gắn nhãn.
- **Khóa sai trả HTTP 400** (`INVALID_ARGUMENT`) với thân bọc mảng, **không phải 401/403**. Trước khi có bản ghi, mã xếp nó là `refused` và không bao giờ đánh dấu khóa sai. Nay là `auth`.
- **`max_tokens` và `max_completion_tokens` đều được nhận.** Với `max_tokens: 5` Gemini trả một token chữ cụt rồi dừng vì `length`: **trần nhỏ khi thinking đang bật có thể ra câu rỗng hoặc cụt.**
- **Phải gửi `stream_options.include_usage`** mới có `usage` khi stream; không gửi thì không có gì. Với câu ngắn, chữ, `finish_reason` và `usage` về chung một khung.
- **Chưa thu:** thân 429 thật (cần `--burst`), hết tín dụng, hủy giữa dòng với nhà cung cấp thật, `cached_tokens`, model Gemini 3.x. Hằng số `quota` vẫn là giả định.

**Hệ quả cho quyết định:** việc có tắt thinking cho bản dịch hay không là một đánh đổi chất lượng so với tiền (và độ trễ) của **lớp prompt**, không phải của lớp kết nối, nên change này không đổi mặc định gửi đi. Nhưng dữ liệu cho thấy chi phí và `usage` ở mặc định sai khác nhiều lần so với một ước lượng ngây thơ; đáng đo trên một chương thật trước khi chốt giá hiển thị cho người dùng.

## Câu hỏi và phương pháp

1. Kiến trúc provider hiện tại (sau đợt tách bốn tầng `infra` < `services` < `ipc` < `electron`) có hợp lý không, nhất là với hai module sắp làm?
2. Các sản phẩm khác dựng phần lõi AI này thế nào: ranh giới, xử lý khác biệt giữa hãng, thử lại, khóa, usage, danh mục model?
3. Mira nên giữ, đổi hay hoãn điều gì?

**Phương pháp.** (a) Tôi đọc mã Mira: `src/main/infra/providers/*`, `src/main/services/ai/*`, hợp đồng IPC `src/shared/contracts/ai*.ts`, `infra/storage/connections.ts`, cùng ADR-004/005 và spec `translation-provider`. (b) Ba agent đọc mã và tài liệu trên GitHub và trang chính chủ ngày 2026-10-03, chia ba nhóm: agent lập trình (Zed, Continue, Cline, opencode, Goose, pi-ai), lớp SDK/gateway (Vercel AI SDK, LiteLLM, Responses/Open Responses, tương thích Gemini/Anthropic), app desktop và công cụ dịch (Cherry Studio, Chatbox, Jan, LobeChat, Open WebUI, LinguaGacha, AiNiee, GalTransl, auto-novel, manga-image-translator). (c) Tôi **đọc lại nguồn gốc** cho các mệnh đề đổi quyết định (xem cột "Mức kiểm" ở [Nguồn](#nguồn-đọc-2026-10-03)) và chạy thử `decideFreeze`. **Không gọi nhà cung cấp thật, không benchmark, không cài hay chạy sản phẩm nào.** Mã GPL/AGPL (Cherry Studio, Chatbox, auto-novel, GalTransl, manga-image-translator) chỉ để học ý tưởng, theo quy ước đã có ở [công cụ dịch AI](ai-translation-tools.md).

## Quan sát 1 — Mira đang có gì

Kích thước và vai trò (đọc mã, đường dẫn tính từ gốc repo):

| Tệp | Dòng | Việc đang làm |
| --- | --- | --- |
| `src/main/infra/providers/openAiCompatible.ts` | 567 | **Tất cả trong một lớp:** nối URL và gắn `Authorization`; chọn khóa (`acquireKey`) và báo kết quả; liệt kê model; prompt dịch tiếng Việt cứng (`SYSTEM_PROMPT`); chia lô (`splitIntoBatches`); parse JSON (`parseItems`); `reconcile` và vòng thử lại (`translateBatch`); stream chat, gom mảnh tool-call (`chat`) |
| `src/main/infra/providers/{keyPool,connectionKeySource,classifyError,reconcile,chatStream,modelCatalog}.ts` | 127 / 67 / 128 / 48 / 96 / 82 | Chính sách khóa, nối kho khóa, phân loại lỗi ba lớp, khớp theo ID, bộ đọc SSE, bảng giá |
| `src/main/services/ai/{connectionService,chatService,chapterTranslation}.ts` | 181 / 230 / 222 | CRUD kết nối và dựng provider; vòng đời một lượt chat (tool tối đa 3 vòng); `plan` và `runBatch` cho dịch chương |

### Đã đúng, nên giữ

| Điểm | Bằng chứng ở sản phẩm khác |
| --- | --- |
| **Một đường dây OpenAI-chat bằng `fetch` trần** | Zed, Goose và gói native của opencode đều gọi HTTP trần; 39 trong 67 provider của Continue là lớp con mỏng của một lớp OpenAI. Trong catalog models.dev, 185 trong 226 nhà cung cấp dùng `@ai-sdk/openai-compatible` (agent đếm). |
| **Giữ thân lỗi thô trước khi parse** (`classify`, `classifyHttpError`) | pi-ai có riêng `utils/error-body.ts` vì SDK hãng làm rơi thân, ra câu `"403 status code (no body)"`. Zed giữ `ProviderRejection` có cả trường thô lẫn nhóm đã chuẩn hóa. Trong các tệp đã đọc, **không** repo nào trong sáu repo đọc `RetryInfo` của Gemini, nên đọc thời gian chờ từ thân JSON là việc Mira làm tốt hơn (chưa quét hết từng repo). |
| **`reconcile` luôn chạy theo ID** | Mọi công cụ dịch được đọc đều khớp theo ID (`#n:`, JSON, `<\|n\|>`). Anthropic nói rõ lớp tương thích **bỏ qua** `response_format` và `strict`, nên `reconcile` là hàng rào duy nhất ở đường đó. |
| **Bảng giá vendored từ models.dev** | Cline, opencode, Goose và pi-ai đều dựa trên models.dev; Continue tự giữ bảng regex và đã tụt (mục Anthropic mới nhất là 4.6 khi Zed và Goose đã nhắc 5.x). |
| **Khóa `fill-first` có đóng băng theo phút/ngày** | Cherry Studio và AiNiee xoay vòng không theo dõi sức khỏe khóa; Chatbox và LobeChat chỉ một khóa; chỉ GalTransl và LinguaGacha có theo dõi. |
| **Chạy AI trong main** | Cherry Studio v2 chạy `AiService` trong main, tài liệu của họ ghi "Renderer closing or crashing does not abort the stream"; LinguaGacha chạy backend trong `worker_thread`. Khớp hướng "tác vụ dịch chạy trong main" của ADR-005. |

### Chưa hợp lý

| # | Điều quan sát được | Bằng chứng trong mã | Hệ quả khi làm module kế tiếp |
| --- | --- | --- | --- |
| **A1** | **Provider cầm logic tác vụ.** Prompt dịch, chia lô, parse và vòng `reconcile` nằm trong class provider ở `infra/`. | `SYSTEM_PROMPT` (L58), `splitIntoBatches` (L108), `parseItems` (L130), `translateBatch` (L318). `services/ai/chapterTranslation.ts:17` phải import `splitIntoBatches` từ tệp provider. | `context-core` cần đổi prompt theo ngữ cảnh: `TranslateRequest.context` có từ đầu nhưng **không dòng nào đọc** (`callOnce` không dùng nó; grep `.context` trong `src/main` chỉ ra `chatPrompt`). Thêm adapter native sau này nghĩa là chép lại prompt, chia lô và `reconcile`. |
| **A2** | **Không có cổng "một lượt model" có kiểu.** Tầng service nói chuyện thẳng với lớp cụ thể, và dùng kiểu theo hình OpenAI. | `ConnectionService.translator()` trả `OpenAiCompatibleProvider` (L62–70, L114); tên method nói "translator" dù chat cũng dùng, chú thích ở `chatService.ts:119` tự nhận. `chatPrompt.ts:7` import `ChatMessage` từ tệp provider. | Kiểu tin nhắn có `role: 'tool'`, `tool_calls` là dạng dây của OpenAI, đang rò lên service; mọi adapter mới phải giả dạng OpenAI. |
| **A3** | **Thử lại thuộc về provider và không có chờ.** Ngân sách 3 lượt dùng chung cho đổi khóa, lỗi mạng và hỏi lại ID thiếu. | `MAX_RETRIES_PER_BATCH = 3` (L27); nhánh `error.retryable → continue` (L341–344) không có `sleep`. Khi mọi khóa đóng băng, `acquireKey` ném `rate_limited` (retryable) và vòng đốt cả 3 lượt gần như tức thì rồi ném, tức "retryable" nhưng thử lại không có tác dụng. Chat không thử lại. | JobRunner cần "tạm dừng có hẹn giờ" (ADR-005): chủ thử lại phải ở trên provider, và nhận được `recoverAt` thay vì thấy lỗi. |
| **A4** | **`usage` quá nghèo và không lưu.** Chỉ `{inputTokens, outputTokens}`, đọc từ `prompt_tokens`/`completion_tokens`. Ba kiểu giống hệt nhau ở ba nơi. | `readUsage` (L156); `TranslateUsage` ở `providers/types.ts:24` và `shared/contracts/aiTranslate.ts:76`, `ChatUsage` ở `aiChat.ts:102`. Bảng giá có `cacheRead`/`cacheWrite`/`structuredOutput`/`toolCall`/`reasoning` nhưng **grep toàn `src` chỉ thấy chúng ở phần khai kiểu của `modelCatalog.ts`**: không mã nào đọc. `costOfUsage` chỉ tính input/output. | Ba tầng prompt của `context-core` được thiết kế để trúng cache, nhưng không có chỗ nào đo `cached_tokens`: không kiểm chứng được tầng A/B có ích. Không có sổ chi phí (task 4.7b). |
| **A5** | **Không có dữ liệu khả năng theo endpoint.** ADR-004 nói khác biệt giữa hãng là *dữ liệu*, nhưng chưa có chỗ nào chứa nó. | Grep `temperature\|max_tokens\|response_format\|reasoning_effort` trong `src/main` (không tính test): **không có kết quả**. Mọi lời gọi gửi `{model, messages}` và dựa vào mặc định của hãng. | Gemini 2.5 Pro và 3 **không tắt được** thinking, 2.5 Flash tắt bằng `reasoning_effort: "none"` (tài liệu Gemini); mặc định đó ảnh hưởng độ trễ và hóa đơn dịch hàng loạt mà Mira không điều khiển được. Không chặn trần đầu ra (`max_tokens`) cho một lô. |
| **A6** | **Bộ chọn khóa chỉ đúng khi gọi tuần tự.** Hôm nay đúng vì `translate` chạy lô lần lượt; JobRunner sẽ chạy song song. | (i) `clearKeyFreeze` đặt `state='ok'`, `frozen_until=NULL`, `freeze_strikes=0` không điều kiện (`connections.ts:296`), nên một lượt **đã bắt đầu trước** và xong `ok` sau khi lượt khác vừa đóng băng khóa sẽ **gỡ đóng băng**. (ii) `decideFreeze` cộng `strikes` cho **từng báo cáo**; tôi chạy hàm với 6 báo cáo 429 liên tiếp chưa rõ phạm vi: đóng băng **1, 2, 4, 8, 16, 30 phút**, nên một cú bùng 6 lỗi đồng thời phạt một khóa tốt 30 phút. (iii) `SHARED_QUOTA_PROVIDERS` chỉ dùng để hiện cảnh báo ở `ConnectionCard.tsx:100`; Google tính hạn mức theo **project**, không theo khóa, nên nhiều khóa cùng project không thêm hạn mức. (iv) Không có trần đồng thời theo khóa. | Cả bốn hiện chưa gây lỗi; chúng hiện ra ngay khi module Tác vụ chạy hai lô một lúc. (i) và (ii) là kết luận từ đọc mã; (ii) có chạy hàm thuần, chưa dựng cả đường qua SQLite. |
| **A7** | **Hủy chỉ ở mức "không gửi lô tiếp".** | `chapterTranslation.ts:133` gọi `provider.translate({...})` không truyền `signal`; `translate()` nhận `signal` nhưng không ai cấp. Không có timeout tường minh trong `send()`. | JobRunner cần hủy giữa lô và đóng app sạch. |

## Quan sát 2 — Sản phẩm khác dựng lõi AI thế nào

### 2.1 Agent lập trình: một lượt provider, tác vụ ở trên

Đọc ở các commit ghim ngày 2026-10-02/03. Lưu ý: nhiều repo đã đổi chỗ (opencode nay ở `anomalyco/opencode`, Goose ở `aaif-goose/goose`, pi ở `earendil-works/pi`, Cline chuyển `src/core/api` sang `sdk/packages/llms`); không dựa vào địa chỉ cũ.

| | Ranh giới hẹp nhất | Khác biệt giữa hãng nằm ở | Usage / chi phí | Lỗi / thử lại / khóa |
| --- | --- | --- | --- | --- |
| **Zed** | Một phương thức bắt buộc `stream_completion`; `stream_completion_text`, `..._tool` (ép tool-call để lấy đầu ra có cấu trúc) là phương thức mặc định bên trên | Cờ khả năng theo model (~25) và bản ghi 7 cờ cho endpoint OpenAI-compatible do người dùng đặt: `tools, images, parallel_tool_calls, prompt_cache_key, chat_completions, interleaved_reasoning, max_tokens_parameter` | `{input, output, cache_creation, cache_read}`, `input` **chưa gồm** cache | `ProviderRejection{status, code, message, retry_after, category}`; thử lại do **người gọi** (tối đa 4 lần); chỉ có trần đồng thời theo model (mặc định 16); một khóa mỗi provider |
| **Continue** | `ILLM`/`BaseLLM`; 39 trong 67 provider là lớp con của OpenAI | Lớp con ghi đè và **dò URL** ngay trong hàm dùng chung (`api.groq.com`, `:1337`…): đây là phản mẫu | Chi phí tính bằng bảng cứng chỉ cho Anthropic và OpenAI | Có `withLLMRetry` nhưng agent không thấy nơi gọi trong `core/` |
| **Cline** | `GatewayProvider.stream(request) → AsyncIterable<AgentModelEvent>`, chạy trên AI SDK v7 qua một adapter ~2,5K dòng | 22 luật có tên ánh xạ ý định + sự thật về model sang tham số dây; chính sách ghi trong `AGENTS.md`: không tự nuôi registry khả năng model | `{input, output, cacheRead/Write, reasoning, totalCost}`; chuẩn hóa từ ít nhất 5 dạng của hãng | Hai tầng không được **chồng** thử lại; middleware thử lại **lượt rỗng** và cộng usage các lượt đã bỏ |
| **opencode** | Lõi mới `LLMClient.stream/generate`: Route = Protocol × Endpoint × Auth × Framing; "thực hiện **một** lượt provider", không tool loop, lịch sử, tiếp vòng | `ProviderTransform` rẽ nhánh theo `api.npm` và id model (1,9K dòng); gói native dịch gợi ý cache trung tính `cache:"auto"` ra từng giao thức | `{input, nonCachedInput, cacheRead/Write, reasoning}`; chi phí tính ở lớp app bằng Decimal từ models.dev | Lỗi có kiểu, giữ `HttpContext` (trạng thái, header, thân cắt); chỉ thử lại **trước byte đầu**, chờ tối đa 10 giây; AI SDK đặt `maxRetries: 0` |
| **Goose** | Trait `Provider` với `stream(...)` là phương thức bắt buộc duy nhất, `complete = gom(stream)` | 48 định nghĩa JSON khai báo cho dịch vụ tương thích OpenAI; `ModelInfo{supports_cache_control, reasoning, request_params…}` | `ProviderUsage{usage, cost, cost_source}`; thứ tự ưu tiên giá: do provider báo, cấu hình người dùng, registry kèm theo | `ProviderError` có kiểu (`RateLimitExceeded{retry_delay}`, `CreditsExhausted`…); thử lại do provider, mặc định 3 lần; kẹp thời gian chờ server báo ở 1 giờ |
| **pi-ai** | `Provider{id, baseUrl, auth, getModels, stream}`; `Model.api` là một trong 10 giao thức | `compat` khai báo ~25 cờ (`maxTokensField`, `supportsUsageInStreaming`, `thinkingFormat`, `cacheControlFormat`…) đè lên mặc định dò theo URL | `{input (chưa gồm cache), output, cacheRead, cacheWrite, reasoning, cost}` tính **trong adapter**, có bậc giá | SDK `maxRetries: 0`, tự thử lại (nghe `retry-after`, từ chối chờ quá 60 giây); `normalizeProviderError` cứu thân lỗi |

Điểm chung rút ra: **(1)** ranh giới là "một lượt model trả về dòng sự kiện", còn gọi không-stream chỉ là gom dòng; **(2)** vòng tool, chia lô, thử lại theo nội dung nằm ở trên; **(3)** khác biệt giữa hãng là dữ liệu đi kèm model/endpoint, rẽ nhánh theo URL bị coi là nợ; **(4)** có đúng một chủ thử lại. Không repo nào có bộ chọn nhiều khóa hay giới hạn RPM/TPM chủ động, trừ giới hạn đồng thời theo model của Zed.

### 2.2 App desktop đa nhà cung cấp và công cụ dịch

| | Giao diện hướng nhà cung cấp | Khóa / thử lại / giới hạn tốc độ | Bền vững | Usage / chi phí |
| --- | --- | --- | --- | --- |
| **Cherry Studio v2** (Electron, AGPL) | Vercel AI SDK qua `@cherrystudio/ai-core`, chạy trong **main**; danh sách khớp `ConfigBuilderEntry` chứa quirk từng hãng | Con trỏ xoay vòng, không theo dõi sức khỏe; `maxRetries: 0` cho SDK, thử lại tùy chọn | Bảng `job` chung (pending/delayed/running, attempt, khóa idempotency, timeout) | `ai_usage_record`: token cache và reasoning, `cost`, `costSource`, **`pricingSnapshot`**, khóa đã che |
| **Chatbox** (GPL) | `LanguageModelV3` sau `AbstractAISDKModel` | Một khóa; `ai-retry` chỉ 429 và 5xx, **không bao giờ giữa chừng stream** | Không thấy | Chỉ đưa lên UI |
| **Jan** (Tauri) | AI SDK; native cho Anthropic, OpenAI, Google, Mistral, xAI, còn lại tương thích | Chuỗi dự phòng `api_key` rồi `api_key_fallbacks` | Không thấy | Không đọc |
| **LobeChat** | Một interface `LobeRuntimeAI`, ~90 runtime; `createOpenAICompatibleRuntime` nhận hook `handlePayload`, `handleError` | Một khóa mỗi thể hiện; `ErrorClassifier` nhãn hạn mức/ngữ cảnh | Không | Callback `onUsage` kèm giá |
| **LinguaGacha** (Electron+TS) | `LLMClient` chỉ trả **sự kiện của yêu cầu** `{http_status, retry_after_ms, retryable, tokens}`; dây gọi qua pi-ai với `maxRetries:0` | **Scheduler riêng:** khóa `ready/draining/cooling/probing`, đóng băng 15/30/60 giây, 429 giảm một nửa số luồng; `request-rate` giãn RPM hoặc token bucket | Trạng thái từng mục trong một DB, ghi theo cửa sổ 500 ms; chế độ `continue`; đóng băng `config_snapshot` lúc bắt đầu | Chỉ token |
| **AiNiee / GalTransl** | Lớp gọi riêng từng hãng (AiNiee); client OpenAI mỗi khóa (GalTransl) | AiNiee: RPM × số khóa, xoay vòng; GalTransl: **dò mọi khóa lúc bắt đầu, bỏ khóa chết**, `maxApiRetries=6`, ghi tỷ lệ 429 | JSON cache theo bộ đếm giờ (AiNiee); log nối thêm + nén nguyên tử (GalTransl) | Chỉ token / không thấy |
| **auto-novel** | `TranslatorProfile{fields, buildRequestParams, extractReasoning}`: bảng quirk khai báo | Một khóa, 3 lần thử lại rồi **chia đôi** lô | Cache IndexedDB theo đoạn, khóa `MD5({đoạn, glossary})` | Không |

Điểm chung: **(1)** hầu hết thu về khoảng bốn giao thức cộng bảng quirk khai báo; **(2)** SDK luôn bị đặt `maxRetries: 0` để chỉ còn một chủ thử lại; **(3)** công cụ dịch kiểm đầu ra theo ID rồi leo thang: thử lại 2–3 lần, rồi **thu nhỏ hoặc chia đôi lô**, rồi đánh dấu lỗi (chỉ manga-image-translator thêm bước **đổi model dự phòng**); **(4)** không công cụ dịch nào có ước lượng chi phí hay trần trước khi chạy trong phần mã được đọc; **(5)** glossary chèn theo tập con khớp trong lô là chuẩn, và **không công cụ nào xếp prompt cho prefix caching** (LinguaGacha đặt `cacheRetention:"none"`).

### 2.3 Lớp SDK, gateway và giao thức

| Chủ đề | Quan sát | Mức kiểm |
| --- | --- | --- |
| **Vercel AI SDK** | Bản `ai` 7.x, spec `LanguageModelV4`; usage lồng `inputTokens{total,noCache,cacheRead,cacheWrite}`, `outputTokens{total,text,reasoning}`; `APICallError` giữ `statusCode`, `responseHeaders`, `responseBody`; `maxRetries` mặc định 2, đặt 0 để tắt; **không đọc `RetryInfo`**, nên 429 theo ngày của Gemini bị thử lại; cài `ai` + `@ai-sdk/google` + zod nặng ~26 MB, `@ai-sdk/openai-compatible` ~14 MB (agent đo trong thư mục tạm); v7 chỉ ESM, cần Node 22+; main của Mira là CJS | Giữ `responseBody`: **đã đọc lại mã** |
| **Cherry Studio nói về chi phí dùng SDK** | Có 10 tệp vá (`patches/`) cho `ai`, `@ai-sdk/*`; các lỗi rơi tham số âm thầm (#11987, #13462, #15824); #14022 xếp "vá bị vô hiệu khi lên v7" là rủi ro CAO | Đọc qua agent |
| **LiteLLM** | Đóng băng khi 429, khi tỷ lệ lỗi >50% với ≥5 yêu cầu/phút, hoặc 401/404/408; mặc định `cooldown_time` 5 giây; 429 không đóng băng nhóm một deployment; không thấy đọc `retryDelay` kiểu Gemini; ngủ 0 giây khi còn deployment khỏe; `max_parallel_requests` suy từ `rpm`/`tpm` | Đọc qua agent |
| **OpenAI** | "Chat Completions vẫn được hỗ trợ, Responses được khuyến nghị cho dự án mới"; không thấy lịch ngừng `/chat/completions`. Open Responses (2026-01-15) có OpenRouter, vLLM, Ollama, LM Studio; **Anthropic và Google không nằm trong danh sách đối tác** | Đọc qua agent |
| **Anthropic, lớp tương thích OpenAI** | "primarily intended to test and compare model capabilities, and is not considered a long-term or production-ready solution for most use cases"; `response_format` và `strict` bị bỏ qua; **không có prompt caching**; thinking không trả về; `usage.*_details` luôn rỗng; `reasoning_effort` bị bỏ qua; system message bị gom lên đầu | **Đã đọc lại trang chính chủ** |
| **Gemini, lớp tương thích OpenAI** | "Support for the OpenAI libraries is still in beta"; `reasoning_effort` ánh xạ sang `thinking_level`/ngân sách; "Reasoning cannot be turned off for Gemini 2.5 Pro or 3 models"; `extra_body` cho `cached_content` và trường Gemini. Trang không nêu `usage` có báo token thinking hay token cache | **Đã đọc lại trang chính chủ** |
| **Cache và batch** | Anthropic: `cache_control` rõ ràng, tối đa 4 điểm, ngưỡng tối thiểu 512–4.096 token tùy model; Gemini: cache ngầm từ 2.5, ngưỡng 2.048 token; OpenAI và DeepSeek: tự động, báo `cached_tokens` / `prompt_cache_hit_tokens`. Batch giảm 50% ở ba hãng lớn. Qua lớp tương thích: OpenAI và DeepSeek dùng được, Gemini một phần, Anthropic không | Đọc qua agent |
| **Hạn mức Gemini** | Tính theo **project**, không theo khóa; RPD đặt lại lúc nửa đêm giờ Thái Bình Dương; thân 429 có `QuotaFailure.violations[].quotaId` (chứa `PerDay`/`PerMinute`) và `RetryInfo.retryDelay`; `retryDelay` **không phân biệt** phút với ngày, `quotaId` thì có | Đọc qua agent; khớp với `classifyError.ts` của Mira |

## Suy luận cho Mira

> Mọi mục dưới đây là **đề xuất** chưa chốt. Không mục nào là điều kiện để làm module 3, trừ D1 (xem "Thứ tự").

### Kiến trúc đích: bốn lớp, mỗi lớp một chủ

| Lớp | Chủ việc gì | Không làm gì | Nằm ở |
| --- | --- | --- | --- |
| **L0 ModelTransport** | **Một lượt** gọi model: `stream(request) → sự kiện {delta, tool-call đã gom, usage, kết thúc}`; `complete` = gom dòng; `listModels`. Lỗi có kiểu, giữ `status`, `retryAfterMs`, `quotaScope`, thân cắt ngắn | Không thử lại, không chia lô, không prompt, không chọn khóa | `infra/providers/` |
| **L1 Gateway** (chính sách) | Chọn khóa, **trần đồng thời theo khóa**, đóng băng, **một chủ thử lại duy nhất** (chỉ trước byte đầu), chờ tối đa vài giây; khi mọi khóa đang nguội thì trả `recoverAt` cho tầng trên thay vì ngủ | Không biết "đoạn", "chương" hay prompt | `infra/providers/gateway/` (không phải `services/ai/`: mặt tiền ở `infra` gọi nó) |
| **L2 Tác vụ** | `translateParagraphs` (dựng prompt từ `buildContext`, chia lô, parse `[n]`, `reconcile`, **thang leo thang**: thử lại → thu nhỏ lô → đánh dấu lỗi → tùy chọn model dự phòng); `chat` (lịch sử, vòng tool) | Không biết HTTP, khóa | `services/ai/` |
| **L3 JobRunner** | Cam kết theo từng mục, khóa idempotency, ảnh chụp cấu hình lúc bắt đầu, hủy qua `AbortSignal`, mỗi lời gọi một dòng sổ usage | Không gọi provider trực tiếp | `services/` (module 4) |

Sao chép từ: Zed/Goose/opencode (một lượt, gom thành `complete`), LinguaGacha (client trả sự kiện, scheduler riêng), Cline (một tầng thử lại và cộng usage các lượt bỏ), Cherry Studio (bảng `job`, sổ usage kèm `pricingSnapshot`).

### Các thay đổi cụ thể

| # | Việc | Giải quyết | Ghi chú |
| --- | --- | --- | --- |
| **D1** | Tách L0 khỏi L2: chuyển `SYSTEM_PROMPT`, `splitIntoBatches`, `parseItems`, `translateBatch` ra `services/ai/translate/`; provider chỉ còn `stream`, `complete`, `listModels`. Đổi `ConnectionService.translator()` thành tên đúng nghĩa và trả giao diện hẹp `ModelTransport`. | A1, A2 | Không đổi hành vi; bộ test hiện có (`check.mjs` đang kỳ vọng 904) là lưới an toàn. Nên làm **trước module 3**, vì ADR-005 đổi hợp đồng từ ID segment sang `[n]` theo đoạn: đỡ viết lại hai lần. |
| **D2** | **Một kiểu `Usage` duy nhất** trong `shared/contracts`: `{input (chưa gồm cache), output, cacheRead, cacheWrite, reasoning (một phần của output), costUsd, costSource}`. Đọc `prompt_tokens_details.cached_tokens`, `prompt_cache_hit_tokens` khi có. Chọn quy ước "chưa gồm cache" như Zed, pi-ai và AI SDK V4 (Goose làm ngược lại, nên phải ghi rõ). | A4 | Tính tiền ở biên L0 từ models.dev kể cả `cacheRead`/`cacheWrite`; ghi `costSource: 'estimated' \| 'provider'`. Sổ `usage` ở `library.db` theo kiến trúc AI-first mục 5.3. |
| **D3** | **Bản ghi `compat` theo endpoint** (mặc định theo preset, đè được theo model): `maxTokensField`, `usageInStream`, `responseFormat`, `reasoning` (tên tham số và giá trị), `promptCacheKey`, `extraBody`. Gửi `max_tokens` cho lô dịch; gửi `response_format` **chỉ** tới endpoint tôn trọng nó. | A5 | Học từ pi-ai và Zed. Cần đo trên Gemini thật trước khi chọn giá trị `reasoning` mặc định cho dịch. |
| **D4** | Gateway (L1): thêm **bộ đếm lượt** đóng băng (`freeze_epoch`) để một báo cáo `ok` của lượt cũ không gỡ băng của lượt mới, và để một cú bùng N lỗi chỉ tính **một** lần cộng `strikes`; trần đồng thời mỗi khóa; "một yêu cầu thăm dò" khi khóa nguội xong; kẹp thời gian chờ server báo (Goose: 1 giờ). Cảnh báo khóa cùng project dùng chung hạn mức: đã có ở UI, đưa vào quyết định chọn khóa nếu người dùng đánh dấu. | A6 | **Làm cùng module 4**, không làm sớm hơn. Viết trước hai test sẽ đỏ (cú bùng đồng thời; `ok` đến muộn) để ghim lỗi rồi mới sửa. |
| **D5** | Một chủ thử lại: transport không thử lại; L1 thử lại **chỉ trước byte đầu**; L2 chỉ thử lại **theo nội dung** (ID thiếu). Tách ngân sách: thử lại do hạ tầng không dùng chung bộ đếm với hỏi lại ID thiếu. Cộng `usage` của mọi lượt, kể cả lượt bỏ (Cline, Chatbox). Truyền `signal` xuyên suốt. | A3, A7 | Bắt buộc khi có JobRunner. |
| **D6** | **Không dùng Vercel AI SDK, và sửa lại lý do** ở chú thích `openAiCompatible.ts` và ADR-004: (a) nó **không** làm mất `responseBody` (đã đọc lại mã); (b) lý do đúng là trọng lượng 14–26 MB, v7 ESM-only trong main CJS, thử lại mặc định không đọc `RetryInfo`, và kinh nghiệm Cherry Studio với 10 tệp vá cùng các lỗi rơi tham số âm thầm. Học **dạng usage** của V4, không phụ thuộc gói. pi-ai là thiết kế tham chiếu tốt nhất cho `compat`, nhưng nó kéo các SDK hãng nên chỉ học ý. | Giả định sai ở ADR-004 | Điều kiện xem lại: panel Hỏi AI cần tool nhiều bước và luồng sự kiện phong phú hơn mức tự viết. |
| **D7** | **Hoãn adapter native, nhưng ghi sẵn điều kiện kích hoạt** theo thứ tự: (a) Claude trở thành đối tượng hạng nhất, vì caching, structured output và thinking đều cần Messages; (b) chạy batch Gemini hoặc Anthropic; (c) cache tường minh của Gemini hoặc tính chính xác token thinking; (d) vòng tool có reasoning của OpenAI cần Responses. `CONNECTION_PRESETS` hiện **không có** preset Anthropic dù ADR-004 liệt kê; nên giữ nguyên cho tới khi có adapter native, vì chính Anthropic nói lớp tương thích không dành cho production. Thêm trường `apiFormat` (mặc định `openai-chat`) vào kết nối ngay, để thêm giao thức sau không phải đổi schema. | Phù hợp với ADR-004 | Agent ghi nhận giao thức Anthropic Messages cũng có ở OpenRouter, Ollama, LM Studio, DeepSeek, Moonshot, DashScope; nên một adapter Messages có thể phủ nhiều hơn Claude. **Chưa tự kiểm từng hãng.** |

### Đề xuất sửa ADR-004 (chờ chủ sản phẩm duyệt; chưa sửa)

- **Lựa chọn 4** ("Lấy Vercel AI SDK làm tầng provider ngay") và chú thích đầu `openAiCompatible.ts` từng nêu lý do SDK "làm mất `error.details`". Đã đọc lại mã Vercel AI SDK: `APICallError` **giữ** `responseBody`, `responseHeaders` và `data`. Kết luận không dùng AI SDK vẫn đứng, nhưng lý do nên là: nặng (14–26 MB do agent đo, chưa tự đo lại), v7 chỉ ESM trong khi main của Mira là CJS, thử lại mặc định không đọc `RetryInfo` (một 429 theo ngày bị thử lại), và Cherry Studio phải giữ 10 tệp vá cho nhóm SDK này. Chú thích trong `openAiCompatible.ts` đã sửa theo; **ADR-004 thì chưa**.
- **Danh sách preset** của ADR-004 có Anthropic; mã không có và nên giữ vậy cho tới khi có adapter native: Anthropic ghi trên trang chính chủ rằng lớp tương thích OpenAI "not … a long-term or production-ready solution", không có prompt caching, bỏ qua `response_format`, `strict` và `reasoning_effort`.
- **Dòng "Cập nhật 2026-10-03"** có thể thêm: tầng kết nối nay gồm transport, gateway và mặt tiền; Gemini là nhà cung cấp duy nhất đã được gọi thật.

### Thứ tự đề xuất

0. **Đóng module 0 trước:** lấy fixture SSE và thân lỗi 429 thật từ Gemini (task 1.1–1.4, 5.2a). Mọi giả định về hình dạng lỗi và `usage` hiện chỉ có từ đọc tài liệu; đổi ranh giới trước khi có fixture là đổi trên giả định.
1. **D1 + D2 + D3 trước module 3** (một change riêng, không đổi hành vi nhìn thấy được).
2. **D4 + D5 cùng module 4** (JobRunner), kèm sổ `usage`.
3. **D7 khi một trong bốn điều kiện xảy ra**, không trước.

## Bước kiểm chứng

1. **Fixture thật:** nguyên văn SSE và 429 từ Gemini (khóa free): chứng minh `classifyError` đọc đúng `quotaId` và `retryDelay`; xem `usage` stream có trả token thinking không (agent thấy diễn đàn báo tổng token vượt prompt+completion, chưa kiểm tay).
2. **Thinking và hóa đơn dịch:** cùng một chương, Gemini 2.5 Flash với `reasoning_effort` `none` so với mặc định: so sánh `usage`, độ trễ, và tỷ lệ ID thiếu. Quyết định giá trị `compat.reasoning` mặc định.
3. **Test đỏ về song song** (D4): hai lô đồng thời, giả lập 429 một lượt và `ok` một lượt đến muộn; phải thấy khóa bị gỡ băng sai. Rồi sửa cho xanh.
4. **Tỷ lệ ID hỏng giữa đường tương thích và API gốc** (đã có từ ADR-004): vẫn chưa ai đo; agent không thấy benchmark công khai nào so cả hai.
5. **Đo cache:** gửi lại cùng tầng A/B qua nhiều chương; `cached_tokens` phải xuất hiện ở sổ usage. Nếu không, chỉnh lại ngưỡng hoặc bỏ giả định cache của `context-core`.

## Giới hạn của bằng chứng

- **Không gọi nhà cung cấp thật**; mọi nhận định về hình dạng lỗi, `usage` và hành vi thinking của Gemini là từ tài liệu và bài đăng diễn đàn do agent đọc.
- Hai agent báo nhiều mệnh đề từ công cụ tóm tắt trang; tôi đã đọc lại nguồn chính cho các mệnh đề **đổi quyết định** (cột "Mức kiểm" ở 2.3), phần còn lại giữ nhãn "đọc qua agent".
- Số kích thước (14/26 MB) do agent cài thử trong thư mục tạm; tôi không lặp lại. Số dòng mã của các repo ngoài là theo byte cây git, không phải số dòng.
- Giấy phép của LinguaGacha chưa xác nhận (trang LICENSE trả 404). Mặc định mọi repo ngoài chỉ để học ý tưởng; kiểm giấy phép từng repo trước khi chép bất kỳ mã nào.
- (A6-ii) tôi chạy hàm thuần `decideFreeze` qua Node 24, không chạy cả đường qua `connectionKeySource` và SQLite; (A6-i) là đọc câu SQL, chưa có test.

## Nguồn (đọc 2026-10-03)

**Mã Mira (đọc trực tiếp):** [`openAiCompatible.ts`](../../../src/main/infra/providers/openAiCompatible.ts), [`types.ts`](../../../src/main/infra/providers/types.ts), [`keyPool.ts`](../../../src/main/infra/providers/keyPool.ts), [`connectionKeySource.ts`](../../../src/main/infra/providers/connectionKeySource.ts), [`connections.ts`](../../../src/main/infra/storage/connections.ts), [`connectionService.ts`](../../../src/main/services/ai/connectionService.ts), [`chatService.ts`](../../../src/main/services/ai/chatService.ts), [`chapterTranslation.ts`](../../../src/main/services/ai/chapterTranslation.ts), [`costEstimate.ts`](../../../src/main/services/ai/costEstimate.ts), [`aiConnections.ts`](../../../src/shared/contracts/aiConnections.ts).

**Đã đọc lại bằng chính tôi (mức kiểm cao):** [Vercel AI SDK `response-handler.ts`](https://raw.githubusercontent.com/vercel/ai/main/packages/provider-utils/src/response-handler.ts) · [Anthropic: OpenAI SDK compatibility](https://platform.claude.com/docs/en/api/openai-sdk) · [Gemini: OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) · [opencode `packages/llm/AGENTS.md`](https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/llm/AGENTS.md) (đọc qua công cụ tóm tắt) · [pi `utils/error-body.ts`](https://raw.githubusercontent.com/earendil-works/pi/main/packages/ai/src/utils/error-body.ts) (đọc qua công cụ tóm tắt).

**Đọc qua agent, chưa đối chiếu lại:** commit ghim của [Zed `a846890`](https://github.com/zed-industries/zed/tree/a846890), [Continue `5522c6f`](https://github.com/continuedev/continue/tree/5522c6f), [Cline `39ff235`](https://github.com/cline/cline/tree/39ff235), [opencode `907b3bc`](https://github.com/anomalyco/opencode/tree/907b3bc), [Goose `591edd4`](https://github.com/aaif-goose/goose/tree/591edd4), [pi `a276dab`](https://github.com/earendil-works/pi/tree/a276dab); [Cherry Studio](https://github.com/CherryHQ/cherry-studio), [Chatbox](https://github.com/chatboxai/chatbox), [Jan](https://github.com/janhq/jan), [LobeChat `model-runtime`](https://github.com/lobehub/lobe-chat/tree/main/packages/model-runtime), [Open WebUI `routers/openai.py`](https://github.com/open-webui/open-webui/blob/main/backend/open_webui/routers/openai.py), [LinguaGacha](https://github.com/neavo/LinguaGacha), [AiNiee](https://github.com/NEKOparapa/AiNiee), [GalTransl](https://github.com/GalTransl/GalTransl), [auto-novel](https://github.com/auto-novel/auto-novel), [manga-image-translator `chatgpt.py`](https://github.com/zyddnys/manga-image-translator/blob/main/manga_translator/translators/chatgpt.py); [LiteLLM routing](https://docs.litellm.ai/docs/routing); [Open Responses (Simon Willison, 2026-01-15)](https://simonwillison.net/2026/Jan/15/); [OpenAI: migrate to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses); [Vercel AI SDK middleware](https://ai-sdk.dev/docs/ai-sdk-core/middleware); [Cherry Studio issues #11987, #13462, #14022, #15824](https://github.com/CherryHQ/cherry-studio/issues).

---

[Mục lục handbook](../README.md)
