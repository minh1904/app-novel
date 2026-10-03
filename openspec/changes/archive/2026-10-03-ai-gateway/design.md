## Context

Xem [proposal.md](proposal.md) — Why. Ràng buộc từ code và quyết định hiện có:

- **Mặt tiền phải giữ.** `OpenAiCompatibleProvider` có chữ ký `translate`, `chat`, `listModels`; `chatService`, `chapterTranslation`, `connectionService` và khoảng 2.000 dòng test dùng nó. Bản dịch và chat hiện tại là **MVP để thử luồng**, sẽ được viết lại ở module 3–4 và `context-core`, nên change này không đổi hành vi nhìn thấy được của chúng.
- **Luật tầng ép bằng lint:** `infra` < `services` < `ipc` < `electron`; chỉ `electron/` và `index.ts` import `electron`. Mặt tiền nằm ở `infra`, nên thứ nó gọi xuống cũng phải ở `infra` hoặc thấp hơn. Đây là lý do gateway **không** nằm ở `services/ai/` như bản [nghiên cứu](../../../docs/handbook/research/ai-core-architecture.md) từng đề xuất.
- **Trạng thái khóa đã lưu** ở `ai_key` (`state`, `frozen_until`, `frozen_scope`, `freeze_strikes`) và `connectionKeySource` đọc lại mỗi lần `acquire`. Hôm nay provider được dựng mới mỗi lời gọi (`ConnectionService.translator()`), nên không có chỗ nào giữ trạng thái trong bộ nhớ.
- **Chưa có fixture thật.** Mọi hình dạng SSE, lỗi và `usage` hiện là giả định từ tài liệu (xem Rủi ro của proposal).
- **Nguồn học:** LinguaGacha (`src/backend/llm/*`, `batch-translation/core/translation-request-scheduler.ts`, `request-rate.ts`), pi-ai (`utils/provider-retry.ts`, `openai-completions.ts` `detectCompat`), opencode (`packages/llm/src/route/executor.ts`), clone ngày 2026-10-03. Chỉ học ý tưởng; giấy phép LinguaGacha chưa xác nhận.

## Goals / Non-Goals

**Goals:**

- Một ranh giới sạch: **transport** (một lượt, trả sự kiện) bên dưới **gateway** (khóa, đồng thời, thử lại, hủy), mà thay prompt hay thay logic dịch không phải đụng tới.
- Sửa các lỗi đã chứng minh được khi gọi song song, **trước** khi module Tác vụ chạy hai lô một lúc.
- Mọi hành vi mới kiểm được bằng test với đồng hồ và `fetch` giả, cộng fixture thật.

**Non-Goals:**

- Đưa logic dịch lên `services` hay đổi hợp đồng sang đoạn (module 3).
- Adapter native (Anthropic Messages, Gemini): chỉ chừa đường đăng ký giao thức, xem D12.
- Tự điều chỉnh đồng thời (AIMD) và giới hạn RPM: cần người gọi chạy song song thật mới có nghĩa, đi cùng JobRunner.
- Màn cài đặt cho trần đồng thời, RPM, thời hạn: không đổi schema trong change này.
- Sổ `usage` lưu bền: change này chỉ chuẩn hóa kiểu và phép tính.

## Decisions

### D1. Mặt tiền giữ nguyên, ruột đổi (strangler)

`OpenAiCompatibleProvider` vẫn là thứ tầng `services` thấy; `listModels`, `translate`, `chat` đi qua gateway thay vì tự `fetch`. Mã dịch MVP (prompt, `splitIntoBatches`, `parseItems`, `translateBatch`) **đứng nguyên trong mặt tiền**, chỉ đổi phần "gọi một lượt" thành lời gọi gateway.

*Vì sao:* đổi ranh giới và di chuyển mã dịch cùng lúc là hai thay đổi, mà cái thứ hai sẽ bị viết lại ở module 3. Giữ mặt tiền cho phép bộ test hiện có làm lưới an toàn của phần ruột. *Đã loại:* tách luôn logic dịch ra `services/ai/translate/` — đúng đích nhưng là việc của module 3 và kéo theo đổi `TranslationProvider`.

### D2. Transport trả sự kiện, nhận khóa từ ngoài

Một hàm `stream(request, {apiKey, signal, timeouts, fetch})` trả dòng sự kiện `{delta | tool-calls | done{finishReason, usage, status}}`; `complete` là gom dòng đó. Nó không biết khóa nào, không thử lại, không prompt. Lỗi **ném** `ProviderError` (giữ cách báo lỗi hiện có của repo) nhưng mang thêm `status`, `retryAfterMs`, `quotaScope`, `receivedAt`, `bodySnippet`.

*Vì sao ném thay vì trả giá trị lỗi như LinguaGacha:* repo đã dùng `ProviderError` xuyên suốt và test dựa vào nó; đổi sang giá trị lỗi là đổi mọi người gọi mà không thêm khả năng nào. Phần "sự kiện thực tế" của LinguaGacha (`http_status`, `retry_after_ms`, `retryable`, token) được giữ bằng cách gắn vào lỗi và vào sự kiện `done`. Phần chữ đã nhận trước khi lỗi vẫn đến người gọi vì lỗi ném sau các `delta` (đã đúng ở `chat()` hôm nay).

### D3. Gateway ở `infra/providers/gateway/`, một thể hiện mỗi kết nối

`Gateway` giữ trạng thái bộ nhớ theo kết nối (đang chạy, hàng đợi, trạng thái từng khóa). `GatewayRegistry` (một `Map<connectionId, Gateway>`) do `createServices` dựng và đưa vào `ConnectionService`, thay cho việc dựng provider mới mỗi lời gọi. `baseUrl`, `model`, khóa lấy từ kho **ở mỗi lượt**, nên đổi cấu hình có hiệu lực ngay (đúng yêu cầu của spec `translation-provider`: "đổi địa chỉ hoặc khóa… không cần dựng lại").

*Đã loại:* đặt ở `services/ai/` (vi phạm luật tầng vì mặt tiền ở `infra` gọi nó); gateway toàn cục một thể hiện (trộn hàng đợi của kết nối khác nhau, và hạn mức là của từng project/kết nối).

### D4. Một chủ thử lại, chỉ trước byte đầu, số cụ thể

Gateway thử lại **mạng, hết thời hạn, 5xx** tối đa **2 lần**, chờ `500 ms × 2^n` xáo ±20%, trần **10 giây** (cùng số với `executor.ts` của opencode; pi-ai dùng 0,5→8 giây); chờ lúc nào cũng hủy được ngay (pi-ai ghi rõ lý do: bộ đếm thử lại trong SDK bỏ qua `AbortSignal`, nên tự viết). Thời gian chờ nhà cung cấp yêu cầu **chỉ kéo dài** mốc chờ và bị kẹp ở trần; vượt trần thì **không ngủ**, ném lỗi kèm `recoverAt` cho tầng trên. Stream: chỉ thử lại nếu **chưa phát sự kiện nào**.

Lỗi riêng của khóa (`rate_limited`, `quota`, `auth`) **không ngủ**: đổi sang khóa dùng được khác ngay; hết khóa thì ném lỗi như hôm nay (`rate_limited` kèm mốc sớm nhất có khóa sống lại). Tùy chọn `waitForKeys` (mặc định tắt, giữ hành vi MVP) để JobRunner sau này chờ thay vì ném.

Mặt tiền giữ vòng thử lại **theo nội dung** (ID thiếu, tối đa 3) với bộ đếm **riêng**; đây là việc của tầng dịch, và là phần sẽ chuyển lên `services` ở module 3.

### D5. Máy trạng thái khóa, học từ LinguaGacha, thêm phần lưu bền của Mira

Mỗi khóa có trạng thái **hiệu lực** suy từ hai nguồn:

- **Lưu bền (DB, như hôm nay):** `state ok|invalid`, `frozen_until`, `frozen_scope`, `freeze_strikes`.
- **Bộ nhớ (mới):** `inFlight` đếm lượt đang chạy, cờ `draining`, cờ `probing`.

Quy tắc, mỗi quy tắc ứng với một lỗi đã chứng minh:

1. **Theo đợt.** Báo lỗi trên khóa `ready` → chuyển `draining`, **cộng `strikes` một lần**, ghi nhớ mốc muộn nhất. Thêm lỗi trên khóa đang `draining` chỉ kéo mốc, không cộng. (Sửa: 6 lỗi 429 → 30 phút.)
2. **Draining.** Khóa `draining` không nhận lượt mới; khi `inFlight` về 0 mới ghi `frozen_until` xuống DB và thành `cooling`. (Học: LinguaGacha chờ lượt đang chạy xong rồi mới bắt đầu hạn.)
3. **`ok` đến muộn không gỡ đóng băng.** `ok` chỉ khôi phục khi khóa `ready` hoặc `probing`; ở `draining`/`cooling` nó bị bỏ qua. (Sửa: `clearKeyFreeze` vô điều kiện.)
4. **Thăm dò.** Hạn kết thúc mà `strikes > 0` → đúng một lượt được dùng khóa đó (`probing`); `ok` → `clearKeyFreeze`; lỗi → `strikes + 1`, cooling lại. Khởi động lại app: khóa hết hạn mà còn `strikes` cũng chỉ thăm dò một lượt, vì `strikes` nằm ở DB.
5. **Hủy và hết thời hạn là trung tính:** báo `neutral`, không đổi trạng thái khóa (giữ nguyên quy tắc D4 của `ai-chat`).

Thời lượng đóng băng **giữ nguyên** `decideFreeze` hiện có (đọc `RetryInfo`, phạm vi phút/ngày, 60 giây nhân đôi tới 30 phút); LinguaGacha cố định 15/30/60 giây và chỉ đọc header `Retry-After`, nên không biết Gemini hết hạn mức ngày. Phần đọc thân của Mira là thứ cần giữ.

`KeySource.report` đổi thành nhận **lease** (để giảm `inFlight` đúng khóa) và một kết quả `ok | ClassifiedError | neutral`.

*Đã loại:* thêm cột `freeze_epoch` vào DB (cần schema mới; bộ nhớ đủ vì sau khi khởi động lại không còn lượt nào đang chạy); sao chép nguyên cooldown 15/30/60.

### D6. Trần đồng thời cố định, hàng đợi FIFO

Mỗi gateway có `limit` (mặc định **4**, tiêm được) và hàng đợi FIFO; hủy một lượt đang xếp hàng bỏ nó khỏi hàng mà không gửi. Chat và dịch của cùng kết nối dùng chung hạn mức. Không có AIMD và không có RPM ở đây: hôm nay mọi người gọi chạy tuần tự nên con số này chưa chạm tới, và tự điều chỉnh cần tín hiệu từ nhiều lượt song song (LinguaGacha dùng `concurrency_version` để một lỗi cũ không hạ hạn mức hai lần; cái đó thuộc module 4).

### D7. Thời hạn: ba số, hủy thắng

Lượt không stream: **180 giây** tổng. Lượt stream: **60 giây** tới phản hồi đầu và **60 giây** im lặng giữa hai phần. Ghép bằng `AbortSignal.any([signal người gọi, bộ hẹn giờ nội bộ])`, ghi lại **ai** làm hủy: người gọi → `cancelled`, bộ hẹn giờ → `timeout`, cùng lúc → `cancelled` (LinguaGacha cũng cho hủy ưu tiên). Mặc định cố định trong mã; chưa cho người dùng chỉnh (cần schema).

### D8. Loại lỗi và phân loại

`ProviderErrorKind` thêm `timeout` (thử lại được) và `quota` (không). `quota` chỉ khi **có tín hiệu rõ**: `error.code === 'insufficient_quota'` hoặc HTTP 402, **và không** có bằng chứng phạm vi phút/ngày. Cách này giữ Gemini hết hạn mức ngày là `rate_limited` phạm vi ngày (đổi khóa ngay, freeze tới nửa đêm Thái Bình Dương), dù câu chữ của nó cũng nói "exceeded your current quota… billing". Khóa gặp `quota` bị đóng băng tới mốc cấp lại hạn mức theo ngày (dùng `nextDailyReset`), không đánh dấu `invalid`. Văn bản lỗi thật phải xác nhận ở task 1; đến lúc đó sửa hằng số, không sửa cấu trúc. **Kết quả (1.2/1.3):** Gemini trả khóa sai bằng **HTTP 400** với thân bọc mảng, nên phải thêm một quy tắc cho `auth` (xem "Xử lý ở 1.3" cuối tài liệu); thân 429 và văn bản hết tín dụng thì **chưa thu được**, nên điều kiện `quota` vẫn là giả định.

### D9. `Usage` một kiểu, tính theo quy ước "chưa gồm cache"

Nội bộ: `{ input, output, cacheRead, cacheWrite, reasoning }` mỗi trường tùy chọn (thiếu = không đo, không phải 0). Đọc: `prompt_tokens` trừ `prompt_tokens_details.cached_tokens` (quy ước OpenAI: tổng đã gồm cache), `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens` của DeepSeek, `completion_tokens_details.reasoning_tokens`. Chọn "chưa gồm cache" như Zed, pi-ai và AI SDK V4; Goose làm ngược lại và chính điều đó là lý do phải ghi rõ ở đây. Qua IPC giữ `{inputTokens, outputTokens}` với `inputTokens` là **tổng gồm cache**, để màn hình hiện số người dùng quen và renderer không đổi.

Chi phí: `input×giá_input + cacheRead×(giá_cacheRead ?? giá_input) + cacheWrite×(giá_cacheWrite ?? giá_input) + output×giá_output`; `reasoning` nằm trong `output`, tính giá output. Thiếu giá input hoặc output thì `null` ("chưa biết giá"), như hôm nay.

Gemini: **đã đo** (task 1.2) — token thinking nằm ngoài `completion_tokens` và chỉ lộ ra qua `total_tokens`. `normalizeUsage` tính phần chênh `total − prompt − completion` là thinking và cộng vào `outputTokens` (cùng `reasoningTokens`) khi không có con số reasoning tường minh; xem "Xử lý ở 1.3". Token cache của Gemini chưa gặp.

### D10. Bản ghi `compat` nhỏ, theo preset, không dò URL

`resolveCompat(providerId, override?)` trả `{ maxTokensField, streamUsage, reasoningEffort }` từ một bảng theo `providerId` của preset (đã có trong `CONNECTION_PRESETS`), với mặc định chuẩn OpenAI cho `providerId` lạ hoặc `null` (gateway, Ollama). Bảng khởi đầu: `openai` → `max_completion_tokens`; còn lại `max_tokens`; `reasoningEffort` bật cho `openai`, `google`, `openrouter`, tắt cho `deepseek` và chạy-trên-máy. **Tất cả là giá trị khởi đầu chờ xác nhận bằng gọi thật** — riêng Gemini đã xác nhận ở 1.2: nhận cả `max_tokens` lẫn `max_completion_tokens` (giữ `max_tokens`), nhận `reasoning_effort` và `"none"` có tác dụng, và **phải** gửi `stream_options.include_usage` mới có `usage` khi stream. Người gọi chỉ đặt tham số khi cần; transport bỏ trường không đặt (nguyên tắc của LinguaGacha: "UI mặc định không được đổi mặc định của nhà cung cấp").

*Đã loại:* dò theo hostname như `detectCompat` của pi-ai (đúng cho thư viện không biết preset, nhưng Mira đã có `providerId`; Continue cho thấy dò URL rải trong hàm dùng chung là phản mẫu); nhiều trường hơn (~25 của pi-ai) khi mới dùng ba.

### D11. Địa chỉ: chuẩn hóa hai lần, idempotent

Chuẩn hóa ở `createConnectionSchema`/`updateConnectionSchema` (valibot `transform`) **và** trước khi gửi, nên kết nối đã lưu từ trước cũng được sửa mà không cần migration. Quy tắc: cắt khoảng trắng, bỏ `/` cuối, bỏ đuôi `/chat/completions`. Không bỏ `/v1` hay `/v1beta/openai` vì chúng là một phần địa chỉ gốc của hãng.

### D12. Giao thức là điểm đăng ký, chưa phải cột DB

Transport đăng ký theo `apiFormat` trong một bảng nhỏ `{ 'openai-chat': createOpenAiChatTransport }`; mọi kết nối hiện tại ngầm là `openai-chat`. Thêm giao thức sau là thêm một mục vào bảng và một cột `api_format` (version `library.db` kế tiếp), không đổi gateway. Lý do chưa thêm cột: không có giao thức thứ hai để chọn; một cột chỉ có một giá trị là schema vô ích.

### D13. `fetch` được tiêm; `net.fetch` ở lớp `electron/`

`createServices({ library, crypto, fetch })`; `electron/` truyền `net.fetch` (lớp mạng Chromium: proxy hệ thống, wpad/PAC, xác thực proxy — tài liệu Electron), test và CLI truyền `fetch` toàn cục. Lõi vẫn không import `electron` nên luật K2 giữ nguyên.

**Đã kiểm trong Electron thật (2026-10-03, `pnpm smoke:net` = `scripts/smoke-net-fetch.mjs`, Electron 44.4.5, Chromium 152.0.7977.130, Node 24.21.0)**, trên các server dựng ngay trong script ở `127.0.0.1`:

| Giả định | Kết quả đo |
| --- | --- |
| Stream đến từng mảnh, không dồn về cuối | 3 mảnh đến ở 448, 853, 1255 ms (server gửi cách nhau 400 ms) |
| Hủy giữa dòng dừng đọc ngay | `AbortError` sau 0 ms; signal đã hủy từ trước thì từ chối ngay |
| Header `Authorization` tới nơi | Server nhận đúng `Bearer …` |
| Địa chỉ máy nội bộ nối thẳng, không qua proxy | proxy thấy 0 yêu cầu khi đã đặt proxy cho `http` |
| `net.fetch` đi qua proxy, `fetch` của Node thì không | `net.fetch`: 1 yêu cầu qua proxy; `fetch` Node: 0 yêu cầu, lỗi `ENOTFOUND` |

**Giới hạn của phép đo:** proxy được đặt bằng `session.setProxy({ proxyRules })` để mô phỏng, **không** phải một proxy thật của Windows (cài đặt hệ thống, PAC, WPAD, proxy có xác thực). Chromium mặc định theo cấu hình hệ thống nên nhiều khả năng đúng, nhưng chưa được thử bằng proxy hệ thống thật. Chưa lái giao diện chat qua `net.fetch` bằng tay; phần đã kiểm là lớp `net.fetch` mà transport dựa vào. Chạy sau `app.whenReady`: script chạy trong `whenReady`; `registerLibraryHandlers` cũng được gọi sau đó. Nếu một lúc nào đó hỏng, rơi về `fetch` Node (hành vi trước đây); thêm `undici` `EnvHttpProxyAgent` là dependency mới nên cần quyết định riêng.

### D14. Che bí mật tại điểm tạo lỗi

`redactSecrets(text, secrets)` chạy **trong transport khi dựng `ProviderError`**, trước khi lỗi rời tầng. Che: (1) từng khóa đã dùng (nguyên văn, độ dài ≥ 4, cả dạng `encodeURIComponent`), (2) `Bearer <token>`, (3) giá trị của trường JSON/query có tên nhạy cảm (`api_key`, `authorization`, `token`, `secret`…). Thân lỗi cắt ở 2.000 ký tự. Học từ `executor.ts` của opencode (che theo tên và theo giá trị thật đã gửi). Che ở nguồn, không ở IPC, vì lỗi còn đi vào log và test.

### D15. `finish_reason` đi hết đường, nhưng chưa bắt UI hiện

Cả hai chế độ đọc `choices[0].finish_reason` → `stop | length | tool_calls | filter | unknown`; endpoint không gửi thì `unknown` (cờ `supportsFinishReason` của pi-ai tồn tại vì có endpoint như vậy). Mặt tiền dịch coi `length` là `invalid_response` với câu "bị cắt vì hết giới hạn đầu ra" thay vì "không phải JSON". Chat trả `finishReason` trong sự kiện `done`; chunk IPC `done` thêm trường **tùy chọn** (task cuối) — chưa có UI dùng thì không thêm UI.

### D16. Lấy dữ liệu thật bằng tập lệnh, khóa không đi qua hội thoại

`scripts/capture-provider-fixtures.mjs` đọc khóa từ biến môi trường, gọi một bộ kịch bản (không stream, stream có `include_usage`, `GET /models`, khóa sai, tùy chọn gây 429 bằng loạt yêu cầu), che khóa rồi ghi vào `src/main/infra/providers/__fixtures__/live/`. Người dùng chạy bằng tay trong terminal của họ; không dán khóa vào cuộc trò chuyện hay lệnh.

## Risks / Trade-offs

- **Máy trạng thái khóa phức tạp, dễ sai ở biên** → bộ lập lịch là hàm thuần có đồng hồ tiêm; test dạng bảng (đợt 429, `ok` muộn, thăm dò thành công/thất bại, khởi động lại giữa hạn); hai ca đầu chính là hai lỗi đã chứng minh.
- **Giá trị `quota`, `compat`, thời hạn là phỏng đoán** → ghi rõ "chờ xác nhận" ở D8/D10; task 1 thu văn bản thật; sửa hằng số chứ không sửa cấu trúc.
- **`net.fetch`: stream, hủy, loopback, proxy đã đo trong Electron thật; proxy hệ thống thật của Windows thì chưa** → D13 ghi số đo và giới hạn; rơi về `fetch` Node nếu hỏng.
- **Wave-collapse có thể phạt nhẹ một khóa hỏng thật** (6 lượt chết cùng lúc chỉ tính một) → thăm dò kế tiếp thất bại cộng thêm; hạn vẫn tăng, chỉ chậm hơn một nhịp.
- **Tách bộ đếm thử lại làm đổi số lần gọi tối đa** (hạ tầng 2 + nội dung 3 thay vì 3 dùng chung) → test MVP nào dựa vào số cũ được sửa có chủ ý và ghi trong task; không thêm retry ngoài hai tầng này.
- **Chat và dịch xếp chung một hàng** → với trần 4 và người gọi tuần tự thì chưa chạm; khi JobRunner chạy nhiều lô, chat có thể phải chờ → làm làn ưu tiên ở module 4, không làm trước.
- **Mặt tiền vẫn là class lớn** → có chủ ý (D1); mục tiêu của change là phần dưới nó, không phải gọn lại chính nó.

## Migration Plan

1. Không đổi schema, không đổi kênh IPC, không đổi chữ ký mặt tiền: người dùng và dữ liệu cũ không bị ảnh hưởng.
2. Làm theo thứ tự task 1 → 7; mỗi nhóm chạy `node scripts/check.mjs` xanh trước nhóm kế. Nhóm 5 (gateway) là nhóm duy nhất đổi hành vi khóa; hai nhóm 2–4 chỉ thêm khả năng.
3. Hoàn tác: revert các commit của change; vì không có dữ liệu mới nào được ghi, không cần migrate ngược.

## Open Questions

- **Trần đồng thời mặc định (4) và ba thời hạn (180/60/60 giây):** chỉnh được sau khi có số đo từ gọi thật; không đổi spec hay task.
- **Làn ưu tiên cho chat khi có JobRunner:** quyết định ở module 4.
- **Văn bản lỗi thật của `quota`** (OpenAI, OpenRouter 402, Gemini): thu ở task 1.2; chỉ đổi hằng số của D8. **Chưa thu được** (lần chạy đầu không có `--burst`).

### Kết quả task 1.2 (một lần chạy 2026-10-03, `gemini-2.5-flash`, 9 kịch bản, mỗi kịch bản một mẫu)

Nguồn: `src/main/infra/providers/__fixtures__/live/*.json`. Một mẫu mỗi kịch bản nên là **quan sát, chưa phải quy luật**.

- **`usage` trong stream** (`chat-stream`): nằm **cùng khung** với `delta.content` và `finish_reason`, không có khung `usage` riêng ở cuối như OpenAI. Không gửi `stream_options.include_usage` thì **không có `usage` nào** (`chat-stream-default`). Mẫu là một câu ngắn nên cả câu về trong một khung; chưa biết với đầu ra dài.
- **`finish_reason`:** `stop`; `length` khi chạm `max_tokens` (nội dung bị cắt còn `"Chào"`, `usage` vẫn có). Cả `max_tokens` lẫn `max_completion_tokens` đều được nhận.
- **Token thinking nằm ngoài `completion_tokens`.** Để mặc định, `total_tokens` lớn hơn prompt + completion: 125 so với 21 + 13 (chênh 91, `chat-complete`) và 211 so với 21 + 13 (chênh 177, `chat-stream`), cùng một câu hỏi. Không có `completion_tokens_details`. Với `reasoning_effort: "none"` thì `total_tokens` = prompt + completion (33 = 21 + 12). Phản hồi không gắn nhãn phần chênh; **kết luận nó là thinking là suy luận** từ việc `none` làm nó biến mất. Hiện `normalizeUsage` trả `outputTokens: 13` và bỏ phần chênh (đã chạy trên fixture), nên chi phí đang bị tính thiếu nếu thinking bị tính tiền như token đầu ra. Việc đối chiếu bảng giá chưa làm.
- **Khóa sai:** HTTP **400** `INVALID_ARGUMENT`, "Please pass a valid API key"; thân là một **mảng** `[{"error":{…}}]`, không phải một đối tượng. `classifyHttpError` hiện cho `kind: "refused"` (không phải `auth`) và `message` là chuỗi JSON thô, vì nó chỉ đọc `parsed.error` và ánh xạ 400 sang `refused` (đã chạy trên `bad-key.json`). Việc cần làm ở 1.3: nhận thân bọc mảng, và coi 400 kèm "API key" là `auth`.
- **`GET /models` không khóa:** 404 `NOT_FOUND` "Requested entity was not found." (`models-no-key`), nên không phân biệt được "thiếu khóa" với "sai đường dẫn". Có khóa: 61 mục, id dạng `models/<tên>`, các trường `id`, `object`, `owned_by`, `display_name`; mã hiện đã bỏ tiền tố.
- **Chưa thu được:** thân 429 thật (`RetryInfo`, `quotaId`: cần `--burst`); văn bản hết tín dụng; hủy giữa dòng (script chưa có kịch bản này); `cached_tokens`; và liệu `max_tokens` có tính cả token thinking hay không (mẫu `max_tokens: 5` không có phần chênh nào để suy ra). Task 1.2 vì vậy **chưa đóng hẳn**.

### Xử lý ở 1.3 (2026-10-03)

Mỗi mục dưới đây có test chạy trên **chính bản ghi thật** (`geminiFixtures.test.ts`, 13 test) và đã thử đưa lại hành vi cũ để chắc test đỏ khi phải đỏ.

- **Khóa sai → `auth`.** `classifyHttpError` mở thân bọc mảng (`[{ "error": … }]`, Google dùng cho cả vài lỗi khác) và coi HTTP 400 là `auth` khi `ErrorInfo.reason` là `API_KEY_INVALID` hoặc thông điệp là "API key not valid / expired" / "valid API key". Hệ quả thấy được: gateway đánh dấu khóa sai và chuyển ngay sang khóa kế (test chạy cả chồng: khóa sai → `invalid`, khóa đúng trả lời).
- **Thinking vào `usage`.** Phần chênh `total_tokens − prompt − completion` được tính là thinking, cộng vào `outputTokens` và ghi ở `reasoningTokens`, **chỉ khi** không có con số `reasoning_tokens` tường minh (OpenAI có, và tổng của nó khớp nên không bị đụng). Với bản ghi thật: 21 vào, 13 + 91 ra (reasoning 91); stream: 21 vào, 13 + 177 ra. **Giả định cần nói rõ:** phần chênh là thinking được suy từ việc `reasoning_effort: "none"` làm nó biến mất (total 33 = 21 + 12), không phải nhãn do Google gắn. Chưa đối chiếu với bảng giá Gemini để xác nhận thinking được tính tiền như token đầu ra.
- **Yêu cầu sinh ra khớp yêu cầu đã được nhận:** test dựng lại thân yêu cầu bằng `buildChatBody` + `resolveCompat('google')` và so `toEqual` với thân đã ghi cho năm kịch bản (thường, stream, `max_tokens`, `reasoning_effort`).
- **Chưa đổi mặc định gửi đi.** Dịch chương và chat MVP vẫn **không** gửi `reasoning_effort` hay `max_tokens` (quyết định ở đầu change: không đụng prompt/logic dịch). Dữ liệu cho thấy đó là một lựa chọn có giá: cùng một câu ngắn, mặc định tốn 125 token còn `"none"` tốn 33. Với `max_tokens: 5` Gemini trả một token chữ cụt và dừng vì `length`, nên **đặt trần nhỏ khi thinking đang bật có thể ra câu trả lời rỗng hoặc cụt**; nếu sau này đặt trần cho Gemini thì phải đặt `reasoning_effort` cùng lúc. Việc có tắt thinking cho bản dịch hay không là quyết định chất lượng-so-với-tiền của lớp prompt, không phải của lớp kết nối.
- **Còn mở:** thân 429 (`--burst`), hết tín dụng, hủy giữa dòng, `cached_tokens`, và hành vi trên model Gemini 3.x (danh sách model có `gemini-3.5-flash`, `gemini-3.1-flash-lite`…).
