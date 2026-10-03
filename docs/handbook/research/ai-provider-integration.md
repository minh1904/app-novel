# Chế độ AI, hướng kết nối nhiều nhà cung cấp, CLI proxy và model local

Ngày đọc: **2026-10-02** · Trạng thái: Quan sát + đề xuất · Chủ trì: research/engineering · Liên quan: [ADR-002](../decisions/0002-ai-first-translation.md), [công cụ dịch AI](ai-translation-tools.md), [hệ sinh thái Việt](vietnam-ecosystem.md), backlog `ai-chat-panel`

> **Cập nhật 2026-10-03:** các kết luận của trang (ba chế độ Ask/Edit/Job, **không làm Agent**, một adapter `openai-compatible`, Vercel AI SDK chỉ cân nhắc cho Hỏi AI khi có tool call, các hướng gateway/CLI proxy/model local) **không đổi**. Ba chỗ là ảnh chụp ngày 2026-10-02 và đã lệch: (1) cột "Trạng thái trong repo" ở Quan sát 1 ("vỏ `AiPanel.tsx`, hỏi/đáp là dữ liệu mẫu", "bốn nút đang `disabled`") — panel nay gọi nhà cung cấp thật, xem [panel Hỏi AI](ai-chat-panel.md) và change `ai-chat`; (2) chữ "theo segment có ID", "ngữ cảnh là segment đang chọn" — theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md) đơn vị là **đoạn** và ID `[n]` chỉ sống trong một lần gọi; (3) "ghi provenance" khi áp dụng đề xuất — nay là **dấu AI mức vùng**, không còn nguồn gốc theo câu. Ranh giới "AI chỉ đề xuất, người ghi" ở cuối Quan sát 1 được ADR-005 mở rộng thành luật cho mọi nguồn AI. Quyết định AI ngoài (MCP/CLI) vẫn cần ADR riêng, vì ADR-004 cấm agent mode theo nghĩa AI tự chạy nhiều bước.

## Câu hỏi và phương pháp

Bốn câu hỏi, đặt ra khi vỏ giao diện panel “Hỏi AI” đã dựng nhưng chưa có provider thật ([câu hỏi còn mở](../product/open-questions.md), mục UX panel Hỏi AI):

1. **“AI mode” là gì trong một app như Mira** — cần mấy chế độ AI, ranh giới quyền và chi phí của từng chế độ?
2. **Có những hướng kiến trúc nào** để nối nhiều nhà cung cấp mà không viết lại cho từng hãng?
3. **CLI proxy** (bọc Claude Code / Gemini CLI / Copilot thành endpoint tương thích OpenAI) có dùng được không?
4. **Model local** chạy thế nào, dùng model nào cho ZH/JA/EN → VI?

Phương pháp: đọc tài liệu nhà cung cấp và bài so sánh công khai trong ngày 2026-10-02, đối chiếu với code hiện có (`src/main/infra/providers/types.ts`, `mockProvider.ts`). **Chưa gọi thử provider thật nào, chưa benchmark, chưa đo chi phí.** Giá và tên model ở đây phần lớn lấy từ trang tổng hợp bên thứ ba, phải đọc lại trang giá chính chủ trước khi đưa vào code hoặc UI.

## Quan sát 1 — “AI mode”: ba chế độ, không phải một

Ngành công cụ lập trình đã tách rõ ba chế độ, cùng một model nhưng khác quyền và khác UX: **Ask** (chỉ đọc, trả lời, không sửa gì), **Edit/Plan** (đề xuất thay đổi cụ thể, người dùng duyệt), **Agent** (tự chạy nhiều bước, có danh sách việc, có checkpoint để hoàn tác).

| Mệnh đề | Nguồn URL / ngày | Giới hạn |
| --- | --- | --- |
| Ask mode là chế độ chỉ đọc, không bao giờ sửa dự án; Agent mode thực thi end-to-end sau khi được cấp quyền; Plan mode là bước trung gian, hỏi lại khi yêu cầu xung đột | [Unity AI Assistant](https://unity.com/blog/unity-ai-assistant-ask-plan-agent-mode-explained) (đọc 2026-10-02) | Tài liệu một sản phẩm cụ thể, không phải chuẩn chung |
| Giao diện AI 2026 chuyển từ “hỏi–đáp” sang “giao việc → theo dõi → duyệt → ngắt → tinh chỉnh”; danh sách việc cập nhật theo tiến trình, bước đang chạy có chỉ báo, bước chưa chạy vẫn sửa/xóa được | [setproduct: 16 AI agent UI patterns](https://www.setproduct.com/blog/ai-agent-ui-design-patterns), [dev.to: agent checkpoints](https://dev.to/zdeb_fouc_f95089367652fc5/from-agent-checkpoints-to-spatial-widgets-five-uiux-patterns-that-look-poised-to-define-2026-m3i) (đọc 2026-10-02) | Bài blog tổng hợp xu hướng, không có số liệu |

**Chiếu sang Mira** (ba chế độ đã có chỗ trong scope, chỉ chưa gọi chúng là “mode”):

| Chế độ | Việc | Trạng thái trong repo | Yêu cầu riêng |
| --- | --- | --- | --- |
| **Job dịch theo lô** | Nhập raw → dịch toàn chương/toàn bộ theo segment có ID | Contract `TranslationProvider` đã có, chỉ `MockProvider` chạy | Không hội thoại, không streaming; cần bền vững (tiếp tục sau lỗi), ước lượng chi phí trước, thử lại theo ID lỗi |
| **Hỏi AI (Ask)** | Hỏi về câu/đoạn đang sửa, tra từ, giải thích | Vỏ `AiPanel.tsx`, hỏi/đáp là dữ liệu mẫu (`ai-chat-panel`) | Cần streaming, lịch sử hội thoại, ngữ cảnh là segment đang chọn; **chỉ đọc**, không tự ghi vào bản dịch |
| **Hành động nhanh (Edit)** | “Dịch lại”, “Viết tự nhiên hơn” trên một segment | Bốn nút trong `AiPanel`, đang `disabled` | Kết quả là **đề xuất** có nút Áp dụng/Chèn; ghi vào văn bản phải đi qua cùng undo stack và ghi provenance |
| **Agent** | — | Không có | **Không làm**: không có nhu cầu nào trong scope cần AI tự chạy nhiều bước trên dữ liệu người dùng |

Điểm quan trọng: ADR-002 nói “AI chỉ tạo bản dịch/đề xuất có nguồn gốc ghi lại; không âm thầm ghi đè văn bản người dùng đã sửa”. Đó chính là ranh giới Ask/Edit ở trên — ba chế độ **dùng chung một tầng provider nhưng khác quyền ghi và khác mặc định model**.

## Quan sát 2 — Bốn hướng kết nối nhiều nhà cung cấp

| Hướng | Cách làm | Quan sát (nguồn, đọc 2026-10-02) | Phù hợp Mira? |
| --- | --- | --- | --- |
| **A. SDK riêng từng hãng** | Gọi `@anthropic-ai/sdk`, SDK Gemini… trực tiếp | Mở được toàn bộ tính năng riêng: structured outputs có bảo đảm schema, prompt caching, Batch API | Cần cho 1–2 hãng chính; không nhân ra cho mọi hãng |
| **B. Một client tương thích OpenAI** | Một adapter, đổi `baseUrl` + key | Ollama (`:11434`), LM Studio (`:1234`), llama.cpp (`:8080`), DeepSeek, Qwen, OpenRouter, và cả CLI proxy đều nói được giao thức này ([promptquorum](https://www.promptquorum.com/local-llms/local-llm-openai-compatible-api)) | **Phủ rộng nhất với ít code nhất** |
| **C. Aggregator (OpenRouter)** | Một key, một endpoint, 300+ model | Phí **5,5% khi nạp credit**; BYOK miễn phí tới 25.000 USD giá niêm yết/tháng rồi 5% (chính sách đổi tháng 8/2026); có OAuth PKCE cấp key người dùng tự kiểm soát; không self-host ([aireiter BYOK](https://aireiter.com/blog/openrouter-byok-fees-fallback-guide), [requesty so sánh](https://www.requesty.ai/blog/best-llm-routing-platforms-compared-2026-requesty-portkey-litellm-openrouter), [PKCE](https://openrouter.ai/docs/use-cases/oauth-pkce)) | Đã chốt ở ADR-002 như **một tùy chọn**, không phải lối duy nhất |
| **D. Gateway tự dựng (LiteLLM / Portkey / Bifrost)** | Dựng một service, app gọi service đó | LiteLLM: open-source, 100+ provider, overhead ~10–20 ms P50, load balancing + fallback + ngân sách; Portkey mở toàn bộ gateway theo Apache-2.0 từ tháng 3/2026, thêm semantic cache và guardrail; OpenRouter không self-host được ([wavect](https://wavect.io/blog/llm-gateway-router-comparison-2026/), [requesty](https://www.requesty.ai/blog/best-llm-routing-platforms-compared-2026-requesty-portkey-litellm-openrouter)) | **Không** nhúng: LiteLLM là Python, trái với app Electron offline-first một tệp cài. Người dùng tự dựng thì nó chỉ là một endpoint tương thích OpenAI → rơi về hướng B |
| **E. Lớp trừu tượng trong SDK (Vercel AI SDK)** | `createProviderRegistry` + `createOpenAICompatible`, truy cập model theo `providerId:modelId` | AI SDK 6 phát hành 2025-12-22, có `ToolLoopAgent`, tool approval, structured output tốt hơn; v6 có bốn trục breaking change so với v5; Ollama chỉ có community provider (`ai-sdk-ollama@^3`) ([Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6), [provider management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management), [ai-sdk-ollama](https://www.npmjs.com/package/ai-sdk-ollama)) | Đáng xét **chỉ cho chế độ Hỏi AI** (streaming + tool call); quá nặng cho job dịch theo lô vốn đã có contract riêng |

**Giới hạn của lớp tương thích OpenAI** — điểm này quyết định vì pipeline Mira dựa trên JSON có ID:

- Lớp tương thích OpenAI của Anthropic **bỏ qua tham số `strict`** khi gọi tool, nên JSON không được bảo đảm theo schema; muốn bảo đảm phải dùng API gốc. Lớp này cũng **không có prompt caching**, và gộp system message về đầu hội thoại ([Anthropic OpenAI SDK compatibility](https://platform.claude.com/docs/en/api/openai-sdk), đọc 2026-10-02).
- “Structured outputs” (ràng buộc giải mã theo JSON Schema, bảo đảm đúng trường/kiểu) khác “JSON mode” (chỉ hứa là JSON hợp lệ). OpenAI ràng buộc qua `response_format`; Anthropic có structured outputs từ bản beta 11/2025, **không hỗ trợ schema đệ quy và ràng buộc số** (`minimum`/`maximum`); Gemini dùng `response_schema`.

→ Hệ quả: bước “tập ID khớp chính xác” trong [pipeline đề xuất](ai-translation-tools.md) **không thể bỏ** dù provider nói có structured output, và mức bảo đảm schema khác nhau theo đường gọi (API gốc vs lớp tương thích).

## Quan sát 3 — CLI proxy: kỹ thuật chạy được, điều khoản thì không

Nhóm công cụ bọc thuê bao CLI thành API:

| Công cụ | Làm gì | Nguồn (đọc 2026-10-02) |
| --- | --- | --- |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | Một service Go (MIT) phơi ra API tương thích OpenAI/Gemini/Claude/Codex cùng lúc, phía sau nối OpenAI-Codex, Anthropic, Gemini/AI Studio/Vertex/Antigravity, xAI Grok, Meta Muse, Moonshot Kimi, Devin. **Nhận cả OAuth thuê bao và API key**, cộng nhóm `openai-compatibility` cho upstream kiểu OpenRouter. Có load balancing nhiều tài khoản, streaming, function calling, multimodal. Đọc kỹ ở Quan sát 3b bên dưới | README repo + mã nguồn |
| [claude-code-router](https://github.com/musistudio/claude-code-router) | Định tuyến request của Claude Code sang provider tương thích OpenAI | Tổng hợp từ bài so sánh |
| [copilot-proxy-api](https://github.com/voidsteed/copilot-proxy-api) | Bọc GitHub Copilot thành API kiểu OpenAI Responses + Anthropic Messages | README repo |
| [ccs](https://github.com/kaitranntt/ccs) | Chuyển đổi giữa nhiều tài khoản Claude, Gemini, Copilot, OpenRouter qua CLIProxyAPI | README repo |

**Thực tế điều khoản** (cập nhật mạnh so với bảng trong [hệ sinh thái Việt](vietnam-ecosystem.md#nhà-cung-cấp-ai)):

| Mệnh đề | Nguồn | Giới hạn |
| --- | --- | --- |
| 02:20 UTC ngày **2026-01-09** Anthropic bắt đầu từ chối OAuth token thuê bao từ công cụ giả làm client Claude Code: *“This credential is only authorized for use with Claude Code and cannot be used for other API requests.”* Ngày **2026-04-04** chính thức đổi chính sách: Pro/Max không còn bao công cụ bên thứ ba. Tài liệu Anthropic: không cho phép nhà phát triển cho đăng nhập Claude.ai vào app của họ, cũng không cho định tuyến request qua credential Free/Pro/Max của người dùng | [kersai](https://kersai.com/anthropic-killed-third-party-claude-access-heres-every-workaround-that-still-works/), [apiyi](https://help.apiyi.com/en/anthropic-claude-subscription-third-party-tools-openclaw-policy-en.html), [Claude Code legal](https://code.claude.com/docs/en/legal-and-compliance) | Hai nguồn đầu là blog bên thứ ba; mốc ngày chưa đối chiếu được với thông báo chính chủ |
| Đưa OAuth token của Gemini CLI qua proxy là **vi phạm điều khoản rõ ràng**; Google cấm từ **tháng 2/2026**, bắt đầu cưỡng chế **2026-03-25**, đã khóa cả tài khoản Ultra trả phí | [gemini-cli discussion #20632](https://github.com/google-gemini/gemini-cli/discussions/20632), [zylos](https://zylos.ai/research/2026-07-13-subscription-auth-boundaries-official-cli-agent-automation/) | Discussion chính chủ xác nhận việc khóa; ngày cưỡng chế lấy từ bài phân tích |
| Đường hợp lệ còn lại: dùng API key, hoặc chạy CLI chính thức trên máy/máy chủ của mình | cùng nguồn trên | — |

**Suy luận:** ADR-002 đã chốt đúng (“không dùng OAuth thuê bao”) và các mốc 2026 chỉ làm nó chắc hơn. Nhưng cần phân biệt hai thứ mà cái tên “CLI proxy” trộn lẫn:

- **Proxy bọc thuê bao** (CLIProxyAPI với tài khoản Claude/Gemini): Mira **không** dựng, không đóng kèm, không để preset trỏ tới. Thêm một preset tên “Claude Code” vào danh sách provider là mời người dùng vi phạm và tự nhận rủi ro khóa tài khoản của họ.
- **Proxy/gateway dùng key của chính người dùng** (LiteLLM, Portkey tự dựng, hoặc CLIProxyAPI trỏ vào API key): đây chỉ là một endpoint tương thích OpenAI. Một ô “URL tùy chỉnh” trong cài đặt là **trung lập**: nó phục vụ model local, gateway công ty, và proxy tự dựng như nhau, không cần Mira biết phía sau là gì.

Lưu ý sửa lại cách hiểu: CLIProxyAPI **không phải chỉ là công cụ bọc thuê bao**. Nó có nguyên một nhóm cấu hình `api-keys` cho Gemini/Vertex/Kimi/Meta và nhóm `openai-compatibility` cho upstream kiểu OpenRouter, nên dùng nó với API key là hoàn toàn hợp lệ. Phần vi phạm điều khoản chỉ là các **kênh OAuth thuê bao** (các route callback `/anthropic/callback`, `/codex/callback`, `/antigravity/callback`, `/devin/callback`). Đây là công cụ dual-use, không phải công cụ vi phạm.

## Quan sát 3b — Đọc kỹ CLIProxyAPI (MIT, Go): học gì, không lấy gì

Đọc 2026-10-02: [README](https://github.com/router-for-me/CLIProxyAPI), [`config.example.yaml`](https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/config.example.yaml), [`internal/api/server_routes.go`](https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/internal/api/server_routes.go), [`internal/translator/translator/translator.go`](https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/internal/translator/translator/translator.go). **Chưa dựng chạy thử.** Lý do đọc: đây là hiện thực tham chiếu công khai của chính bài toán "một client, nhiều nhà cung cấp, nhiều kiểu auth" — và là repo đầu tiên trong nhóm nghiên cứu này có giấy phép **MIT**, khác GalTransl/auto-novel (GPL-3.0) và AiNiee (AGPL-3.0) vốn chỉ được học ý tưởng.

### Bề mặt nó phơi ra

Cổng mặc định `8317`. Trong `server_routes.go`, **bốn giao thức cùng chạy trên một server** (chọn theo đường dẫn, không theo cấu hình):

| Giao thức | Đường dẫn |
| --- | --- |
| OpenAI | `GET /v1/models`, `POST /v1/chat/completions`, `POST /v1/completions`, `POST /v1/responses`, `POST /v1/responses/compact` |
| Anthropic | `POST /v1/messages`, `POST /v1/messages/count_tokens` |
| Gemini | `GET /v1beta/models`, `GET|POST /v1beta/models/*action`, `POST /v1beta/interactions` |
| Codex | `GET|POST /backend-api/codex/responses`, `POST /backend-api/codex/responses/compact` |
| Khác | `GET /healthz`, `GET /management.html`, ảnh/video (`/v1/images/*`, `/v1/videos/*`), realtime (`/v1/realtime/*`), các route OAuth callback |

Điểm đáng chú ý: nó phơi `/v1/messages/count_tokens` — nghĩa là đếm token (bước cần cho ước lượng chi phí) được coi là phần của giao thức, không phải tiện ích phụ.

### Ba thứ trong cấu hình đáng học

`config.example.yaml` (“v8 layout”, tự migrate từ layout cũ) chia theo nhóm `server` / `management` / `access` / `routing` / `requests` / `api-keys` / `oauth` / `multimedia` / `observability` / `plugins`. Ba nhóm liên quan trực tiếp tới Mira:

1. **`routing` — nhiều key cho cùng một provider là tính năng hạng nhất, không phải mẹo.** `strategy` nhận `round-robin` (mặc định), `weighted-round-robin`, hoặc **`fill-first`**; thêm `session-affinity` + `session-affinity-ttl` (giữ một hội thoại trên cùng credential), `session-affinity-subagents`, `retry` (số vòng thử lại và trần số lần), `cooldown` (khoảng “đóng băng” một key sau khi lỗi). Mỗi key trong `api-keys.*.keys` có `weight` riêng và override riêng.
   → `fill-first` là chiến lược đúng cho ca free tier: **dùng cạn key 1 rồi mới sang key 2**, khác round-robin. Đây chính xác là thói quen xoay vòng nhiều key Gemini của cộng đồng ([Voz](https://voz.vn/t/tool-dich-truyen-bang-gemini.1076131/), đã ghi ở [hệ sinh thái Việt](vietnam-ecosystem.md)) — nhưng được phát biểu thành chiến lược có tên, có cooldown và có retry budget.
2. **`api-keys.<nhóm>.models` có alias và `capabilities`, kèm `excluded-models` (khớp wildcard).** Tức là tên model mà client thấy **tách khỏi** tên model upstream. Xác nhận hình dạng của đề xuất registry ở mục Suy luận, và thêm một ý chưa có: alias để UI Mira không phải sửa khi nhà cung cấp đổi tên model.
3. **`requests.payload` có `default` và `override` theo model, và `api-keys.*.request-scoped-errors` cho phép khai báo quy tắc phân loại lỗi.** Hai chỗ này là nơi nhét khác biệt giữa các hãng (`response_format` vs `response_schema`, `thinking`, `max_tokens`) và nơi khai báo "lỗi nào thử lại được" — thay vì rẽ nhánh `if (provider === 'x')` rải khắp code.

### Thiết kế translator: registry theo cặp (from, to)

`translator.go` đăng ký theo cặp giao thức:

- `Register(from, to string, request interfaces.TranslateRequestFunc, response interfaces.TranslateResponse)`
- `NeedConvert(from, to string) bool` — bỏ qua việc dịch khi hai đầu cùng giao thức
- `Response(...) [][]byte` cho streaming (trả nhiều dòng) vs `ResponseNonStream(...) []byte` cho một lần

Thư mục `internal/translator/` chia theo giao thức: `openai`, `claude`, `gemini`, `codex`, `antigravity`, `interactions`, `common`.

**Bài học ngược — chỗ không nên bắt chước:** CLIProxyAPI phải làm ma trận N×N vì nó là trung gian cho **client bất kỳ** (client nói giao thức nào cũng phải phục vụ). Mira là client duy nhất của chính nó: chỉ có **một định dạng nội bộ** (`TranslateRequest`/`TranslateResponse` có ID trong `infra/providers/types.ts`) nên chỉ cần **N adapter một chiều**, không cần registry cặp. Sao chép kiến trúc translator vào Mira là nhập một chi phí không có lý do tồn tại.

Ngược lại, việc nó **tách streaming (`[][]byte`) khỏi non-streaming (`[]byte`) ngay ở tầng dịch** là xác nhận cho đề xuất hai contract: job dịch theo lô và Hỏi AI không nên dùng chung một hàm.

### Vì sao vẫn không đóng kèm

Dù MIT và dù Go biên dịch ra một binary: đóng kèm có nghĩa là Mira phải nuôi thêm **một process ngoài**, mở cổng `8317`, kèm theo cả `management.html`, `access.api-keys` (một tầng auth thứ hai cho chính proxy), plugin loader (`plugins.enabled` nạp dynamic library), và server nhận OAuth callback. Toàn bộ là bề mặt tấn công và phức tạp vận hành cho một app desktop cá nhân offline-first. Và chính nhóm route callback OAuth là phần vi phạm điều khoản ở Quan sát 3 — đóng kèm binary là đóng kèm luôn cơ chế vi phạm, dù Mira không gọi tới.

Đường đi đúng: **học cái từ vựng** (`fill-first`, `weight`, `cooldown`, `model alias`, `payload override`, `request-scoped-errors`), tự viết mỏng trong `main` process bằng TypeScript. Người dùng nào muốn dùng CLIProxyAPI thật thì trỏ ô "endpoint tương thích OpenAI" vào `http://127.0.0.1:8317/v1` — Mira không cần biết và không nên biết.

## Quan sát 4 — Model local

| Runtime | Cổng / cách bật | Quan sát (đọc 2026-10-02) |
| --- | --- | --- |
| **Ollama** | `:11434`, service nền luôn chạy | Endpoint `/v1/chat/completions` tương thích OpenAI; có `ollama pull`, Modelfile, thư viện Python/JS chính thức. Tiện nhất để app tích hợp |
| **LM Studio** | `:1234`, phải bật trong GUI (Developer mode) | Server local tương thích **cả** OpenAI Chat Completions **và** Anthropic Messages API; mạnh nhất ở khâu tìm/tải/thử model |
| **llama.cpp (`llama-server`)** | `:8080` | Kiểm soát và tốc độ tốt nhất, dựng tay |

Nguồn: [promptquorum](https://www.promptquorum.com/local-llms/local-llm-openai-compatible-api), [daily.dev so sánh 2026](https://daily.dev/posts/ollama-vs-lm-studio-vs-llama-cpp-which-local-ai-runtime-should-you-use-in-2026--vrytyob1e), [tinyweights](https://tinyweights.dev/posts/ollama-vs-lm-studio-vs-llama-cpp/).

**Model ứng viên** (bài tổng hợp, **chưa thử trên cặp ngôn ngữ của Mira**):

| Model | Dung lượng Q4 | Ghi chú |
| --- | --- | --- |
| Qwen3 4B | ~3 GB | Lựa chọn thực tế cho máy 8 GB RAM; họ Qwen mạnh đa ngữ |
| Qwen3 8B | ~5,2–6 GB | Mặc định hợp lý nếu máy đủ |
| Gemma 3 12B | ~8,2 GB (Q4_K_M) | Pretrain 140 ngôn ngữ, khá với ngôn ngữ ít tài nguyên; vừa khít GPU 8–12 GB |
| DeepSeek-V3.2 | quá lớn cho máy cá nhân | Được đánh giá hơn Claude ở cặp CJK — nhưng thực tế là **gọi API**, không chạy local |
| SakuraLLM | — | Trọng số **CC BY-NC-SA 4.0**, phi thương mại, chỉ Nhật → Trung. Để người dùng tự tải nếu muốn ([đã ghi ở đây](ai-translation-tools.md)) |

Nguồn: [frankx.ai theo RAM](https://www.frankx.ai/blog/best-local-llm-2026), [localaimaster 8GB](https://localaimaster.com/vram/best-llm-8gb-vram), [bestllmfor: dịch](https://bestllmfor.com/guides/best-llm-for-translation/).

**Giới hạn thật của model local với pipeline Mira:** model 4–12B kỷ luật JSON/ID kém hơn model cloud nhiều. Đề xuất #1 trong [công cụ dịch AI](ai-translation-tools.md) (model local dùng dòng đánh số `[n] …` thay vì JSON schema) vẫn đứng vững, và tầng kiểm tra ID phải chạy **nghiêm hơn**, không nhẹ hơn, cho đường local.

## Quan sát 5 — Chi phí: hai cơ chế giảm giá đổi cách thiết kế job

Đây là quan sát có ảnh hưởng lớn nhất tới kiến trúc job dịch, và chưa có trong handbook.

| Mệnh đề | Nguồn | Giới hạn |
| --- | --- | --- |
| **Batch API giảm đúng 50%** ở cả ba hãng lớn: OpenAI, Anthropic (Message Batches tính 50% giá thường, tối đa 100.000 request hoặc 256 MB mỗi lô, phần lớn xong trong 1 giờ, tối đa 24 giờ, kết quả giữ 29 ngày), Google (Batch API giảm 50%) | [digitalapplied](https://www.digitalapplied.com/blog/llm-batch-api-pricing-landscape-2026); chi tiết Anthropic từ tài liệu Message Batches | Số của Anthropic từ tài liệu chính chủ; OpenAI/Google qua bài tổng hợp |
| **Kết quả batch trả về theo thứ tự bất kỳ** — phải khớp bằng `custom_id`, **không bao giờ theo vị trí** | tài liệu Message Batches | — |
| **Prompt caching** Anthropic: đọc cache ~0,1× giá input, ghi cache 1,25× (TTL 5 phút) hoặc 2× (1 giờ); prefix tối thiểu **512 token** với Claude Opus 5, **1024 token** với Sonnet 5. Cache là **so khớp tiền tố**: đổi một byte ở đầu prompt là mất cache của mọi thứ sau đó | tài liệu prompt caching của Anthropic | — |
| Hai cơ chế **cộng dồn**: một lô có system prompt chung được cả 50% batch và ~90% giảm nhờ cache phần tiền tố; context caching của Gemini tiết kiệm 80–90% và cũng cộng với batch 50% | [digitalapplied](https://www.digitalapplied.com/blog/llm-batch-api-pricing-landscape-2026) | Bài tổng hợp |

**Giá tham khảo** — hàng Anthropic là snapshot bảng giá ngày 2026-06-24; phần còn lại từ trang tổng hợp bên thứ ba và **phải đọc lại trang giá chính chủ trước khi đưa vào UI ước lượng chi phí**:

| Model | Input / Output (USD / 1M token) | Ghi chú |
| --- | --- | --- |
| `claude-opus-5` | 5 / 25 | 1M context; batch → 2,50 / 12,50 |
| `claude-sonnet-5` | 3 / 15 | 1M context |
| `claude-haiku-4-5` | 1 / 5 | 200K context |
| DeepSeek (lớp Flash) | ~0,30 / 1,20 giờ cao điểm, ~0,15 / 0,60 ngoài cao điểm | Rẻ nhất trong nhóm cận-flagship ([benchlm](https://benchlm.ai/deepseek/api-pricing)) |
| Qwen (lớp Flash / Plus) | ~0,10 / 0,40 và ~0,40 / 2,40 | 1M context ([benchlm](https://benchlm.ai/alibaba/api-pricing)) |
| Gemini Flash-Lite | ~0,30 / 2,50 | Context caching ~0,20 / 0,40 ([benchlm](https://benchlm.ai/google/api-pricing)) |

Gemini còn có **free tier bằng API key AI Studio**, dùng được ngay không cần thẻ — đúng thứ công cụ cộng đồng trên Voz đang khai thác bằng cách xoay vòng nhiều key. Nhưng Google **không còn công bố bảng giới hạn cố định theo model**, chuyển sang xem trong dashboard `aistudio.google.com/rate-limit` ([pecollective](https://pecollective.com/tools/gemini-free-tier-guide/), [aipromptshub](https://aipromptshub.co/limits/gemini-rate-limits-2026)) → không thể hardcode RPM trong app.

## Quan sát 6 — opencode và models.dev: registry khai báo đã có sẵn, kể cả bảng giá

Đọc 2026-10-02: [opencode docs — providers](https://opencode.ai/docs/providers/), [sst/opencode](https://github.com/sst/opencode) (MIT, agent lập trình chạy trong terminal + app desktop), [models.dev](https://models.dev/), [sst/models.dev](https://github.com/sst/models.dev) (MIT). **Chưa cài, chưa chạy.**

**opencode hỗ trợ 75+ nhà cung cấp bằng cấu hình, không bằng code riêng từng hãng.** Mỗi provider là một entry trong `opencode.json`:

```json
{
  "provider": {
    "custom-id": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Custom Provider",
      "options": {
        "baseURL": "https://api.custom.com/v1",
        "apiKey": "{env:API_KEY_VAR}",
        "headers": { "Custom-Header": "value" }
      },
      "models": {
        "model-name": { "name": "Display Name", "limit": { "context": 200000, "output": 65536 } }
      }
    }
  }
}
```

Bốn chi tiết đáng lấy:

- **Một gói cho mọi provider lạ:** `@ai-sdk/openai-compatible` cho endpoint `/v1/chat/completions`, `@ai-sdk/openai` cho `/v1/responses`. Model local là **cùng một hình dạng**, chỉ khác `baseURL` — Ollama `http://localhost:11434/v1`, LM Studio `http://127.0.0.1:1234/v1`, llama.cpp `http://127.0.0.1:8080/v1`. Không có code riêng cho “local”.
- **Khóa là tham chiếu, không phải giá trị:** `"apiKey": "{env:VAR}"` hoặc `"{file:~/.secrets/key}"`; khóa dán tay lưu ở `~/.local/share/opencode/auth.json` qua lệnh `/connect`.
- **Lọc model bằng `blacklist`/`whitelist`** để model picker không ngập — Mira cũng sẽ cần, vì OpenRouter một mình đã 300+ model.
- **Catalog tách khỏi app:** “uses the AI SDK and Models.dev to support 75+ LLM providers”. Provider có trong catalog thì tự lấy giới hạn và năng lực; provider tự khai thì phải tự điền `limit.context`/`limit.output`.

**models.dev là thứ giải quyết trực tiếp cảnh báo về giá ở Quan sát 5.** Đây là database model nguồn mở (MIT), dữ liệu lưu dạng TOML theo provider, build ra `api.json` / `catalog.json` / `models.json`. `api.json` keyed theo provider id, mỗi provider có `{ id, name, env, npm, api, doc, models }`, mỗi model có:

| Nhóm | Khóa |
| --- | --- |
| Giới hạn | `limit.context`, `limit.input`, `limit.output` |
| **Giá** | `cost.input`, `cost.output`, **`cost.cache_read`, `cost.cache_write`**, `cost.tiers` (giá theo bậc độ dài ngữ cảnh) |
| Năng lực | `tool_call`, `structured_output`, `reasoning`, `reasoning_options`, `temperature`, `attachment`, `interleaved` |
| Modality | `modalities.input`, `modalities.output` |
| Khác | `family`, `release_date`, `last_updated`, `knowledge`, `open_weights`, `canonical_model_id`, `status` (ví dụ `deprecated`) |

→ Đúng y bộ trường mà Suy luận #4 cần, **cộng thêm `cost.cache_read`/`cache_write`** (chính hai số cần để tính lợi ích prompt caching ở Quan sát 5) và `status: deprecated` (cảnh báo người dùng khi model họ chọn sắp bị khai tử). Nghĩa là Mira **không cần tự nuôi bảng giá** — thứ mà Quan sát 5 đã phải ghi cảnh báo to nhất. Giấy phép MIT nên vendor một snapshot vào repo là hợp lệ, và snapshot giữ cho app vẫn biết giá khi offline.

**Hai thứ opencode có mà Mira không nên lấy:** `npm` (nạp package provider động lúc chạy — Mira đóng gói sẵn, không nạp package tùy ý) và việc dựa vào Vercel AI SDK làm tầng model (xem Quan sát 2, mục E).

## Suy luận cho Mira

> **Đã chốt thành scope.** Các suy luận dưới đây được chốt thành phạm vi làm/hoãn/không làm ở [ADR-004](../decisions/0004-ai-provider-layer.md) ngày 2026-10-02. Phần còn lại của trang này giữ nguyên làm bằng chứng và lý lẽ dẫn tới quyết định đó.

1. **Giữ `TranslationProvider` cho job dịch, thêm một contract thứ hai cho hội thoại.** Hai chế độ khác nhau về bản chất: `translate()` là lô, không streaming, khớp theo ID; Hỏi AI là streaming, có lịch sử, trả về chữ tự do. Nhồi chat vào `translate()` sẽ làm bẩn cả hai. Dùng chung: cấu hình provider, kho khóa, bộ đếm chi phí.
2. **Ba adapter, không hơn** (thay vì một adapter cho mỗi hãng):
   - **`openai-compatible`** (làm trước): một adapter phủ DeepSeek, Qwen, OpenRouter, Ollama, LM Studio, llama.cpp, gateway/proxy người dùng tự dựng. Chỉ cần `baseUrl` + `apiKey` + `model`.
   - **`anthropic`** và **`gemini`** (làm sau, khi job lớn cần tiết kiệm): dùng API gốc để có structured outputs có bảo đảm, prompt caching và Batch API — ba thứ mà lớp tương thích OpenAI **không** cho.
   - **`mock`**: giữ nguyên, đã có và đang gánh test.
3. **Batch API khớp sẵn với thiết kế của Mira.** `custom_id` của batch chính là segment ID; “kết quả về theo thứ tự bất kỳ, khớp theo `custom_id`” đúng y nguyên tắc đã viết trong `infra/providers/types.ts` (“keyed by segment id, never by position”). Job dịch một bộ truyện nghìn chương là ca kinh điển của batch: giảm 50%, chấp nhận chờ. Đề xuất: job dịch có **hai chế độ gửi** — *tương tác* (gọi thường, thấy kết quả ngay, dùng khi soát một chương) và *theo lô* (batch, rẻ một nửa, dùng khi dịch cả bộ).
4. **Registry model khai báo được** là điều kiện của ước lượng chi phí (đề xuất #7 trong [công cụ dịch AI](ai-translation-tools.md)): mỗi entry cần `id`, `baseUrl`, kiểu auth, **giá in/out**, và cờ năng lực (`structuredOutput`, `batch`, `promptCaching`, `contextWindow`). Không có bảng này thì UI không thể nói trước “chương này tốn khoảng bao nhiêu”, mà đó lại là điểm khác biệt đã nhận diện. **Không cần tự nhập bảng này**: `models.dev/api.json` (MIT) đã có đủ, kể cả `cost.cache_read`/`cache_write` — xem Quan sát 6.
5. **Vercel AI SDK: xét, nhưng chỉ cho Hỏi AI.** AI SDK 6 (ra 2025-12-22) có `createProviderRegistry` và `createOpenAICompatible` đúng hình dạng cần. Đánh đổi: thêm một cây phụ thuộc lớn vào `main` process của Electron, v6 vừa có bốn trục breaking change, Ollama chỉ có community provider. Job dịch thì **không** cần nó — contract đã có, request là một lần gọi không streaming. Khuyến nghị: tự viết adapter mỏng cho job dịch; chỉ cân nhắc AI SDK nếu panel Hỏi AI phát triển thành có tool call.
6. **Model local: hỗ trợ qua URL, không đóng kèm runtime.** Không nhúng llama.cpp vào installer (phình dung lượng, phải build theo CPU/GPU). Thay vào đó: dò `:11434` và `:1234` khi mở màn cài đặt để gợi ý sẵn, còn lại là ô URL tùy chỉnh. Đường local dùng định dạng dòng đánh số và tầng kiểm tra ID nghiêm hơn.
7. **Lưu khóa:** Electron `safeStorage`, dùng **API async** (`encryptStringAsync`/`decryptStringAsync`) vì bản sync có thể bị deprecate và bản async xử lý được lúc kho khóa tạm chưa sẵn ([Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)). Nếu `safeStorage` không khả dụng thì **báo lỗi rõ, không lưu plaintext**. Giới hạn phải nói với người dùng: trên Windows khóa sinh bằng DPAPI nên chỉ chặn **người dùng khác trên cùng máy**, không chặn app khác chạy dưới cùng tài khoản.
8. **Chốt ranh giới chính sách trong UI:** Mira có ô “endpoint tương thích OpenAI” (trung lập, phục vụ local/gateway/proxy tự dựng) và **không** có preset nào tên theo một CLI thuê bao, **không** có luồng đăng nhập OAuth nào ngoài OpenRouter PKCE. Chính sách nhà cung cấp đổi nhanh — ADR-002 đã yêu cầu đọc lại điều khoản trước mỗi lần thêm kiểu kết nối; bảng ở Quan sát 3 là bản đọc lại của ngày 2026-10-02.
9. **Nhiều key cho một provider nên vào contract ngay từ đầu, không để sau.** `TranslationProvider` hiện tại chỉ có một `id` và ngầm định một credential. Hai bằng chứng độc lập cho thấy đó là thiếu sót: công cụ cộng đồng trên Voz xoay vòng nhiều key Gemini, và CLIProxyAPI coi đây là tính năng hạng nhất với chiến lược có tên. Lấy sẵn từ vựng của nó: `fill-first` (dùng cạn key 1 rồi mới sang key 2 — đúng ca free tier), `round-robin`/`weighted` (ca trả phí nhiều tài khoản), `weight` mỗi key, **`cooldown`** (đóng băng key sau lỗi `rate_limited`, dùng `retryAfterMs` đã có trong `ProviderError`), và trần số lần thử lại cho cả job. Thêm một trường `keys: Credential[]` khó hơn nhiều khi job dịch đã chạy thật.
10. **Khác biệt giữa các hãng nên là dữ liệu khai báo, không phải nhánh `if`.** Ba chỗ CLIProxyAPI tách ra mà Mira cũng sẽ cần: **alias model** (tên UI tách khỏi tên upstream, để nhà cung cấp đổi tên không làm vỡ cài đặt đã lưu của người dùng), **payload override theo model** (`response_format` vs `response_schema` vs `strict`, `thinking`, `max_tokens`), và **quy tắc phân loại lỗi theo provider** (`ProviderErrorKind` + bảng `RETRYABLE` trong `types.ts` đang hardcode cho mọi hãng; HTTP 429 của hãng A và hãng B không luôn cùng nghĩa). Ba thứ này thuộc cùng một registry với giá và cờ năng lực ở mục 4.
11. **Điều có thể bác bỏ kết luận:** nếu phỏng vấn cho thấy người dùng thực tế chỉ dùng một hoặc hai đường (ví dụ key Gemini free + DeepSeek), thì registry đa provider, batch hai chế độ và dò model local đều là chi phí thừa — khi đó làm đúng `openai-compatible` + nhiều key + ước lượng chi phí là đủ, và ba hướng còn lại nên hoãn.

## Bước kiểm chứng

Một spike duy nhất trên fixture hai chương thật, ba đường gọi — một API gốc có structured output (Anthropic hoặc Gemini), một tương thích OpenAI trên cloud (DeepSeek hoặc OpenRouter), một local (Ollama + Qwen3 8B) — đo:

1. **Tỷ lệ phản hồi hỏng ID** theo từng định dạng (JSON schema vs dòng đánh số) và từng đường gọi. Đây là số quyết định việc có tin được structured output hay không.
2. **Token in/out thực tế** cho tiếng Việt, để chốt tỷ lệ đầu ra (~1,2–1,5 đang là phỏng đoán) và kiểm độ lệch ước lượng/thực tế.
3. **Một lô batch thật** cho một chương: thời gian hoàn thành, chi phí thực so với gọi thường, hành vi khi một request trong lô lỗi.
4. **Prompt caching:** đo `cache_read_input_tokens` khi gửi lại cùng glossary/văn phong qua nhiều chương; xác nhận prefix glossary đủ 512/1024 token để cache có hiệu lực.
5. **`safeStorage` async trong Electron 44** trên Windows: ghi/đọc lại sau restart, hành vi khi không khả dụng.
6. **Dò runtime local:** xác nhận `:11434` và `:1234` nhận được khi Ollama/LM Studio đang chạy và không treo UI khi không chạy.
7. **Nhiều key với chiến lược `fill-first`:** hai key Gemini free, dịch tới khi key 1 hết quota, xác nhận chuyển sang key 2 mà job không đứt và không dịch lại segment đã xong. Đây là ca xác thực đồng thời cả tính bền vững của job và thiết kế `cooldown`.
8. **Một lần dựng CLIProxyAPI với API key của chính mình**, trỏ ô "endpoint tương thích OpenAI" của Mira vào `http://127.0.0.1:8317/v1`. Mục đích không phải để dùng nó, mà để chứng minh ô URL trung lập thực sự trung lập — nếu adapter `openai-compatible` của Mira nói chuyện được với một proxy lạ thì nó cũng sẽ nói được với gateway công ty hay runtime local nào khác.

Chưa chốt adapter, chưa chốt model mặc định, chưa chốt giá trong UI trước khi có các số trên.

---

[Mục lục handbook](../README.md)
