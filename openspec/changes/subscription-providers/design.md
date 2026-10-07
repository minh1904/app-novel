## Context

Lý do của change xem `proposal.md`. Change này **phải apply sau** `hermes-settings-modal`, vì nó dùng mục
Tài khoản, máy trạng thái onboarding và form endpoint của change đó.

Mira hiện có (đọc ngày 2026-10-08):

- `OpenAiChatTransport` với `listModels`, `complete`, `stream` trả `ChatStreamEvent` (`delta`, rồi đúng
  một `done` hoặc `tool-calls`). Lỗi được ném ra dưới dạng `ProviderError`.
- `OpenAiCompatibleProvider` (dịch) và `chatService` (chat) gọi transport qua gateway (`keyScheduler`,
  `retryPolicy`, `limiter`). Khóa đi qua `KeySource` / `KeyLease`.
- `compat.ts` chứa khác biệt theo `providerId`. `classifyError.ts` cho `ProviderErrorKind`.
- `safeStorage` đã bọc sẵn (`src/main/electron/safeStorage.ts`, `secretStore.ts`): từ chối lưu khi không mã
  hóa được.

Hằng số giao thức bên dưới lấy từ mã Hermes commit `bf871a5943`, đọc ngày 2026-10-08. Đường dẫn tính từ
gốc repo Hermes.

## Goals / Non-Goals

**Goals:**

- Đăng nhập Codex và Copilot trong app.
- Có ba transport, cùng trả một dạng nội bộ.
- Anthropic bằng khóa API.

**Non-Goals:**

- Không làm gói Claude Pro/Max qua token Claude Code, không giả danh Claude Code, không làm Nous Portal.
- Không làm luồng PKCE trên trình duyệt với cổng 1455 của Codex. Hermes chỉ có luồng này ở CLI; desktop
  của nó dùng mã thiết bị.
- Chưa hiện suy luận (reasoning summary) trong UI. Transport bỏ qua phần này; hiển thị "Thinking" là việc
  của change UI chat.
- Không làm Copilot ACP hay `gh auth token`.
- Không làm Gemini native: Gemini vẫn đi qua endpoint OpenAI-compatible như hiện nay.
- Không làm đăng nhập Google qua Gemini CLI hay Antigravity. Hermes đã gỡ hai provider này (commit
  `7130d60861`) vì Google khóa cả tài khoản Google của người dùng.

## Decisions

### D1. `ChatTransport` và ba cách cài

```ts
interface ChatTransport {
  listModels(call: CallOptions): Promise<ModelListing[]>
  complete(request: ChatRequest, call: CallOptions): Promise<CompleteResult>
  stream(request: ChatRequest, call: CallOptions): AsyncIterable<ChatStreamEvent>
}
```

`ChatRequest` và `ChatStreamEvent` giữ nguyên dạng hiện có; `CallOptions` thêm `credential` thay cho
`apiKey` (D3). Ba cách cài:

- `OpenAiChatTransport`: có sẵn. Thêm `extraHeaders` cố định theo kết nối, để Copilot dùng.
- `ResponsesTransport`.
- `AnthropicMessagesTransport`.

`createTransport(connection, model)` chọn transport theo bảng ở spec, gồm cả luật `gpt-N ≥ 5` của Copilot
(`hermes_cli/models.py:2488-2506`).

Phần dùng chung tách ra `transports/shared.ts`: deadline, `Attempt`, đọc SSE (`parseSseStream`), giới hạn
kích thước body, `classifyHttpError`.

*Phương án loại:* bộ chuyển đổi kiểu "client giả" như Hermes làm với Gemini. Mira đã có một ranh giới
transport rõ ràng nên không cần.

### D2. Responses: đổi định dạng ở rìa

Theo `agent/codex_responses_adapter.py:552-670` và `agent/transports/codex.py:661-830`:

| Dạng nội bộ | Dạng Responses |
| --- | --- |
| `system` | `instructions` (nối nhiều system bằng hai dòng trống) |
| `user` | `{type:"message", role:"user", content:[{type:"input_text", text}]}` |
| `assistant` có chữ | `{type:"message", role:"assistant", content:[{type:"output_text", text}]}` |
| `assistant.tool_calls[i]` | `{type:"function_call", call_id: id, name, arguments}` |
| `tool` | `{type:"function_call_output", call_id, output: content}` |

Thêm vài xử lý:

- `call_id` dài hơn 64 ký tự được rút gọn bằng hash ổn định, và có bảng đổi ngược trong lượt.
- Các chuỗi `<|start|>`, `<|end|>`, `<|channel|>`, `<|message|>` trong chữ được thay bằng gạch đứng
  fullwidth (`adapter.py:88`), nếu không request bị chặn.
- Mức suy luận: dùng thang `THINKING_LEVELS` của Mira. Mức `off` đi thành `reasoning:{effort:"none"}`
  khi model hỗ trợ `none`; không thì bỏ khóa `reasoning`.

**Riêng cho Codex:**

- thêm `include:["reasoning.encrypted_content"]`;
- `prompt_cache_key = "pck_" + sha256(scope + "\0" + instructions + "\0" + json(tools sắp theo tên))[:24]`;
- bỏ `max_output_tokens`.

Mira không gửi lại `reasoning` đã mã hóa giữa các lượt. Lịch sử chat của Mira chỉ lưu chữ và lời gọi tool,
và bỏ phần này chỉ làm mất cache, không sai kết quả.

**Đọc SSE** theo `agent/codex_runtime.py:844-1077`:

- Ghi `phase` của mục `message` khi `output_item.added`. Delta chữ thuộc phase `commentary` / `analysis` bị
  bỏ qua.
- Lời gọi tool được ghép theo `item_id` từ `function_call_arguments.delta`; `.done` hoặc `output_item.done`
  là bản chốt.
- Ở `response.completed`, chỉ đọc `usage`, `status`, `incomplete_details`, `error`:
  - `status: incomplete` với lý do `max_output_tokens` là `length`;
  - có tool là `tool-calls`;
  - còn lại là `stop`.
- Usage: `input_tokens` (đã gồm cache), `output_tokens`, `input_tokens_details.cached_tokens`.

### D3. Credential thay cho `apiKey`

```ts
type Credential =
  | { kind: 'api_key'; key: string }
  | { kind: 'oauth'; provider: 'codex' | 'copilot'; accessToken: string; accountId?: string; residency?: string; apiBase?: string }
```

`connectionKeySource` trả `Credential`:

- Với kết nối OAuth, nó hỏi `tokenStore` một token còn hạn, làm mới nếu cần (D4, D5).
- Pool nhiều khóa chỉ áp cho `api_key`. Kết nối OAuth có đúng một credential.
- `keyScheduler` coi credential OAuth như một khóa duy nhất: vẫn có cooldown khi 429.

Khi transport nhận 401 với credential OAuth, nó gọi `credential.refresh()` (được truyền vào cùng
`CallOptions`) rồi thử lại **một** lần.

### D4. Codex: đăng nhập và làm mới

Hằng số trong `hermes_cli/auth_constants.py:72,90-93`:

- `CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"`
- `ISSUER = "https://auth.openai.com"`
- `TOKEN_URL = ISSUER + "/oauth/token"`
- `BASE = "https://chatgpt.com/backend-api/codex"`
- `REFRESH_SKEW = 120 s`

**Luồng đăng nhập** (`hermes_cli/web_routers/oauth.py:219-295`):

1. `POST {ISSUER}/api/accounts/deviceauth/usercode`, JSON `{client_id}`. Nhận `user_code`,
   `device_auth_id` và `interval = max(3, int(interval || 5))`. Trang xác minh là
   `https://auth.openai.com/codex/device`. Hết hạn sau 15 phút, tính phía client.
2. Hỏi lại `POST {ISSUER}/api/accounts/deviceauth/token`, JSON `{device_auth_id, user_code}`:
   - 200 trả `{authorization_code, code_verifier}`;
   - 403/404 là còn chờ;
   - mã khác là lỗi;
   - lỗi mạng thử lại im lặng tối đa 6 lần liên tiếp.
3. `POST TOKEN_URL`, dạng form: `grant_type=authorization_code`, `code`,
   `redirect_uri=https://auth.openai.com/deviceauth/callback`, `client_id`, `code_verifier`. Nhận
   `access_token` và `refresh_token`.

**Làm mới** (`hermes_cli/auth_codex.py:443-539`):

- `POST TOKEN_URL`, dạng form: `grant_type=refresh_token`, `refresh_token`, `client_id`. Header
  `Accept: application/json`.
- Có `refresh_token` mới thì ghi đè ngay, trong cùng giao dịch với access token.
- Mỗi tài khoản có một promise làm mới duy nhất. Lời gọi đến sau đợi promise đó, không gửi refresh thứ hai.
- Lỗi `invalid_grant`, `invalid_token`, `invalid_request`, `refresh_token_reused`, hoặc 401/403 nghĩa là
  "Cần đăng nhập lại". 429 là hết hạn mức, không phải đăng nhập lại.

**Claim JWT** đọc bằng giải mã base64url không kiểm chữ ký: `exp`; `https://api.openai.com/auth` →
`chatgpt_account_id`, `chatgpt_data_residency` hoặc `chatgpt_compute_residency`. Chỉ dùng để định tuyến và
hẹn giờ, không dùng để xác thực.

**Danh tính:** Hermes gửi `originator: hermes-agent` lên host chính thức (`agent/codex_headers.py:34-81`).
Mira gửi `originator: mira` và `User-Agent: Mira/<phiên bản>`, không giả danh `codex_cli_rs`.

**Hạn mức** (`agent/account_usage.py:316-493`): `GET https://chatgpt.com/backend-api/wham/usage` với
Bearer và `ChatGPT-Account-ID`. Đọc `rate_limit.primary_window` và `secondary_window`
(`used_percent`, `reset_at`, `limit_window_seconds`). Cửa sổ 18000 giây là "Phiên", 604800 giây là "Tuần".
Lưu đệm 5 phút.

**Model** (`hermes_cli/codex_models.py:22-35,160-232`): `GET {BASE}/models?client_version=99.0.0`. Không
có model thì thử `client_version=0.0.0`. Lọc theo `visibility`, sắp theo `priority`. Danh sách dự phòng
tĩnh:

> `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini`,
> `gpt-5.4`, `gpt-5.3-codex-spark`

Thang suy luận theo họ model (`agent/reasoning_effort.py:32-36,100-109`). Mức không hỗ trợ thì hạ xuống mức
gần nhất. Thang này ghi vào `modelCapability` như một nguồn bên cạnh catalog.

### D5. Copilot: đăng nhập, đổi token, header

Hằng số trong `hermes_cli/copilot_auth.py:27-34,166-219,376-511`:

- `CLIENT_ID = "Iv1.b507a08c87ecfe98"`, scope `read:user`.

**Đăng nhập:**

1. `POST https://github.com/login/device/code`, dạng form `client_id`, `scope`, header
   `Accept: application/json`. Nhận `device_code`, `user_code`, `verification_uri`, `interval`.
2. Hỏi lại `POST https://github.com/login/oauth/access_token` với `client_id`, `device_code`,
   `grant_type=urn:ietf:params:oauth:grant-type:device_code`. Đợi `interval + 3` giây giữa các lần:
   - `authorization_pending` là còn chờ;
   - `slow_down` là tăng khoảng chờ;
   - `expired_token` / `access_denied` là lỗi.

   Token GitHub nhận được (`ghu_…`) lưu bằng `safeStorage`.

**Đổi token:**

- `GET https://api.github.com/copilot_internal/v2/token` với `Authorization: token <github token>`,
  `Editor-Version: vscode/1.104.1`, `User-Agent: GitHubCopilotChat/0.26.7`.
- Nhận `token`, `expires_at` (mặc định là bây giờ + 1800 giây) và `endpoints.api`.
- Lưu đệm trong bộ nhớ, đổi lại khi còn dưới 120 giây.
- 401/403/404 là lỗi vĩnh viễn ("Tài khoản không có Copilot", "Cần đăng nhập lại"). Lỗi tạm thì thử lại 3
  lần, mỗi lần chờ 1,5 s × số lần.

**Header** (`copilot_auth.py:502-511`): `Editor-Version: vscode/1.104.1`, `Copilot-Integration-Id:
vscode-chat`, `Openai-Intent: conversation-edits`, `x-initiator`. Thiếu `Copilot-Integration-Id` thì nhận
400 `model_not_available_for_integrator`.

Đây là chỗ Mira, như Hermes, **mượn danh tính VS Code**. Rủi ro này chủ sản phẩm đã chấp nhận và ghi trong
`docs/modules/ai-connections/README.md`. `User-Agent` của request model là `Mira/<phiên bản>`.

**`x-initiator`:** `chatService` truyền `turnRound` vào `CallOptions`. Vòng 0 là `user`, các vòng sau là
`agent`. Lô dịch luôn là `user`, vì mỗi lô là một yêu cầu của người dùng.

**Model:** `GET https://api.githubcopilot.com/models` (`hermes_cli/models.py:2345-2380`). Lọc
`capabilities.type == "chat"`, có endpoint hỗ trợ, và `model_picker_enabled !== false` (nếu lọc theo trường
này làm danh sách rỗng thì bỏ điều kiện đó). Mức suy luận lấy từ `capabilities.supports.reasoning_effort`.
Danh sách dự phòng tĩnh lấy từ `models_catalog_static.py:146-148`.

**Suy luận qua Chat Completions:** gửi `reasoning:{effort}` ở cấp trên cùng (`extraBody`) khi model khai
mức.

### D6. Anthropic Messages

Theo `agent/anthropic_adapter.py:223-697` và `agent/prompt_caching.py`:

- **Đổi định dạng:**
  - `system` thành trường `system`;
  - `assistant.tool_calls` thành khối `tool_use {id, name, input: JSON.parse(arguments)}`;
  - `tool` thành `user` chứa `tool_result {tool_use_id, content}`;
  - các lượt cùng vai liền nhau được gộp, vì Anthropic bắt vai luân phiên.
- **SSE:** `content_block_start` / `delta` (`text_delta`, `input_json_delta`) / `stop`, rồi
  `message_delta` (`stop_reason`, `usage.output_tokens`).
- **Lý do dừng:** `end_turn` → `stop`; `tool_use` → `tool_calls`; `max_tokens` → `length`; `refusal` →
  `filter`.
- **Usage:** `input_tokens` + `cache_read_input_tokens` + `cache_creation_input_tokens`.
- **Thinking:** theo bảng của spec. Họ model được nhận theo tên, có bảng trong `compat.ts`:
  - 4.6+: `adaptive`;
  - cũ hơn: `budget_tokens` với `{low:4000, medium:8000, high:16000, xhigh:32000}`;
  - Haiku: không có.
  - Mức `off`: `{type:"disabled"}`, trừ các họ bắt buộc thinking (bỏ trường).
- **Cache:** `cache_control:{type:"ephemeral"}` ở khối system cuối và tool cuối.

Đây là chỗ Mira hưởng lợi rõ nhất, vì system prompt dịch rất dài.

### D7. Lưu trữ

Migration thư viện:

```sql
ALTER TABLE ai_connection ADD COLUMN auth_kind TEXT NOT NULL DEFAULT 'api_key'
  CHECK (auth_kind IN ('api_key','oauth'));
ALTER TABLE ai_connection ADD COLUMN oauth_provider TEXT
  CHECK (oauth_provider IN ('codex','copilot'));
ALTER TABLE ai_connection ADD COLUMN api_mode TEXT NOT NULL DEFAULT 'auto'
  CHECK (api_mode IN ('auto','chat_completions','responses','anthropic_messages'));
CREATE TABLE ai_oauth_token (
  connection_id TEXT PRIMARY KEY REFERENCES ai_connection(id) ON DELETE CASCADE,
  secret BLOB NOT NULL,   -- JSON {access, refresh?, githubToken?} mã hóa bằng safeStorage
  expires_at INTEGER,
  account_label TEXT,     -- email hoặc login hiển thị, không bí mật
  state TEXT NOT NULL DEFAULT 'ok' CHECK (state IN ('ok','relogin')),
  updated_at INTEGER NOT NULL
);
```

Mỗi `oauth_provider` có tối đa một kết nối (unique index). Đăng nhập lại sẽ thay token, không tạo kết nối
mới.

### D8. Phiên đăng nhập ở main

`oauthService` giữ các phiên trong bộ nhớ: `sessionId → { provider, state, userCode, verificationUrl,
expiresAt, abort }`. Phiên quá 15 phút thì bị dọn khi có lần start mới.

IPC:

| Kênh | Tác dụng |
| --- | --- |
| `ai:oauth:start(provider)` | Trả `{sessionId, userCode, verificationUrl, expiresAt}` và mở trình duyệt bằng `shell.openExternal`, chỉ khi URL thuộc danh sách host cho phép |
| `ai:oauth:poll(sessionId)` | Trả `pending` / `approved` / `denied` / `expired` / `error`. Main tự hỏi lại nhà cung cấp trong nền; renderer gọi poll mỗi 2 giây chỉ để đọc trạng thái |
| `ai:oauth:cancel(sessionId)` | Hủy phiên |
| `ai:oauth:disconnect(connectionId)` | Ngắt kết nối |

Mọi kênh dùng `isTrustedSender`. Hủy và lưu token được khóa với nhau, để một phiên đã hủy không thể lưu
token.

### D9. Lỗi theo nhà cung cấp

`classifyError` có thêm:

| Nhà cung cấp | Lỗi | Kết quả |
| --- | --- | --- |
| Codex | 429 có `usage_limit_reached` | `quota`, kèm mốc đặt lại nếu có |
| Codex | 401 sau khi đã làm mới | `auth` với gợi ý "Cần đăng nhập lại" |
| Codex | Thân lỗi không có account id | `auth` với gợi ý "Tài khoản chưa có quyền Codex" |
| Copilot | 400 `model_not_available_for_integrator` / `model_not_supported` | Đổi lại token rồi thử lại; lần sau mới là `invalid_request` |
| Copilot | 402, hoặc thông báo về premium request | `quota` |
| Anthropic | `overloaded_error` (529) | `rate_limited`, có thể thử lại |
| Anthropic | `invalid_request_error` | `invalid_request` |

## Risks / Trade-offs

- **[Nhà cung cấp đổi giao thức nội bộ]** `chatgpt.com/backend-api` và `copilot_internal` không phải API
  công khai, có thể đổi bất kỳ lúc nào. → Mọi hằng số nằm ở một chỗ. Lỗi "không đăng nhập được" báo rõ là
  phía nhà cung cấp và gợi ý dùng khóa API.
- **[Rủi ro điều khoản và tài khoản]** Mượn client ID, và với Copilot là mượn danh tính VS Code. → Chủ sản
  phẩm đã chấp nhận. Thẻ có cảnh báo. Mira tự xưng đúng tên ở `originator` và `User-Agent` ở mọi chỗ không
  bắt buộc giả danh.
- **[Refresh token dùng một lần]** Hai lời gọi song song có thể làm mới hai lần và làm hỏng phiên. → Khóa
  promise theo tài khoản (D4). Ghi token mới trong cùng giao dịch.
- **[Định dạng Responses khác nhiều]** → Có test bằng fixture SSE ghi từ Hermes cho văn bản, tool,
  incomplete và error. Chạy thật một lượt khi có tài khoản.
- **[Không có tài khoản để thử]** → Task chạy thật được đánh dấu cần tài khoản của chủ sản phẩm. Phần còn
  lại thử bằng server giả.

## Migration Plan

Migration thư viện ở D7: chỉ thêm cột và bảng, giá trị mặc định giữ đúng hành vi cũ. Muốn quay lại thì
revert code. Kết nối OAuth và token còn trong DB thì code cũ không đọc tới các cột mới, nhưng sẽ thấy các
kết nối đó như kết nối khóa API không có khóa. Ghi lưu ý này trong tài liệu.

## Open Questions

- Danh sách dự phòng tĩnh của Codex và Copilot sẽ cũ dần. Có cập nhật nó cùng `scripts/refresh-model-catalog.mjs`
  không? Không ảnh hưởng spec.
