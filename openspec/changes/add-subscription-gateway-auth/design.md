## Context

Lý do của change xem `proposal.md`. Change này **phải apply sau** `subscription-providers` và không phụ thuộc
chuỗi change agent.

Mira hiện có (đọc ngày 2026-10-12):

- [`accountLogins.ts`](../../../src/main/services/ai/accountLogins.ts):
  - `LOGIN_HOSTS` chỉ có `auth.openai.com` và `github.com` (L30);
  - `ACCOUNT_BASES` cho hai nhà cung cấp (L44-L47);
  - `start`/`run` chọn hàm theo `provider === 'codex'` (L90-L93, L158-L161);
  - `store` khóa việc hủy với việc ghi token trong cùng một giao dịch (L205-L263).
- [`accountCredentials.ts`](../../../src/main/services/ai/accountCredentials.ts):
  - `credential()` giữ một promise làm mới cho mỗi kết nối (L120-L128);
  - `keySource()` coi tài khoản là **một** khóa và đóng băng trong bộ nhớ khi bị giới hạn (L213-L237).
- [`connections.ts`](../../../src/main/infra/storage/connections.ts) L48: `OAuthProvider = 'codex' | 'copilot'`.
- [`librarySchema.ts`](../../../src/main/infra/storage/librarySchema.ts) L174-L190:
  - `CHECK (oauth_provider IN ('codex', 'copilot'))`;
  - chỉ mục unique theo `oauth_provider`;
  - `ai_oauth_token` có khóa chính là `connection_id`.
- [`transportFactory.ts`](../../../src/main/infra/providers/transports/transportFactory.ts) L49-L60: chọn
  transport và base theo `oauthProvider`.
- [`connectionKeySource.ts`](../../../src/main/infra/providers/connectionKeySource.ts): `KeyScheduler` chọn và
  đóng băng khóa API của một kết nối.
- [`fallback.ts`](../../../src/main/services/ai/fallback.ts) `shouldFallback`: `quota` và `rate_limited` đều
  tự chuyển dự phòng.
- [`aiConnections.ts`](../../../src/shared/contracts/aiConnections.ts) L95-L100: preset "Gateway tự dựng" là
  `http://127.0.0.1:8317/v1`.
- [`AccountsPage.tsx`](../../../src/renderer/src/modules/ai-connections/settings/AccountsPage.tsx):
  - `ACCOUNT_CARDS` (L42-L51);
  - thẻ Claude dẫn sang khóa Anthropic (L317-L324).

Hằng số giao thức bên dưới đọc từ CLIProxyAPI v8.0.26, commit
[`a27799e`](https://github.com/router-for-me/CLIProxyAPI/tree/a27799ec2b0cc5a60e49970d5467829ceaab8131),
ngày 2026-10-12. Đó là mã của bên thứ ba, chỉ dùng làm bằng chứng giao thức. Mira không chép mã và không thêm
dependency. Tiền tố link: `CPA = https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131`.

## Goals / Non-Goals

**Goals:**

- Đăng nhập Kimi Code và xAI Grok trong Mira, cùng khung với Codex và Copilot.
- Claude Pro/Max và Antigravity dùng được qua gateway do người dùng tự chạy, và Mira không chạm token của
  chúng.
- Chế độ gateway an toàn hơn: chỉ quản lý gateway loopback; khóa quản lý không rời main; cảnh báo khi gateway
  nghe trên mọi giao diện mạng.
- Hết hạn mức thì dừng có thông tin; không tự chuyển sang API trả tiền.

**Non-Goals:**

- **Đóng gói CLIProxyAPI làm sidecar.** Bị bác ở thời điểm này, vì:
  - bản phát hành là một file exe thứ hai khoảng 24 MB, không ký số;
  - phát hành hằng tuần, nên Mira phải theo kịp;
  - token lưu thành file chữ thường trong `oauth.auth-dir` (mặc định `~/.cli-proxy-api`,
    [config.example.yaml#L880-L883](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L880-L883));
  - mặc định bật giả danh: `disable-codex-cloaking: false`
    ([#L318-L324](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L318-L324)),
    `disable-claude-cloak-mode: false`
    ([#L413-L418](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L413-L418));
  - mặc định nghe trên mọi giao diện mạng: `server.host: ""`
    ([#L23-L30](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L23-L30)).

  Kích thước và nhịp phát hành là số liệu chủ sản phẩm đưa ra ngày 2026-10-12. Có thể mở lại thành change
  riêng.
- **Sign in with ChatGPT (SIWC) cho Codex.** Có thể là một change sau; Codex giữ mã thiết bị như hiện nay.
- Mira tự làm OAuth cho Claude Pro/Max hay Antigravity, hoặc giả danh Claude Code, Grok CLI hay Kimi CLI.
- Tự chuyển sang nhà cung cấp, model hay kết nối khác khi hết hạn mức.
- Kimi bản `kimi.ai`. CLIProxyAPI có cả hai miền
  ([kimi.go#L30-L50](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L30-L50));
  MVP chỉ làm `kimi.com`.
- Quản lý gateway ở xa (không phải loopback), TLS, cấu hình gateway từ Mira (sửa `config`), cài plugin.
- Chip hạn mức cho Kimi/xAI gọi trực tiếp: chưa thấy endpoint hạn mức công khai, nên hiện "không rõ".

## Decisions

### D1. Kimi Code: mã thiết bị và Chat Completions

Hằng số
([kimi.go#L26-L58](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L26-L58)):

| Mục | Giá trị |
| --- | --- |
| Client ID (của Kimi Code) | `17e5f671-d194-4dfb-9706-5516cb48c098` |
| Xin mã | `POST https://auth.kimi.com/api/oauth/device_authorization`, form `client_id` |
| Đổi mã, làm mới | `POST https://auth.kimi.com/api/oauth/token` |
| API | `https://api.kimi.com/coding`, chat ở `/v1/chat/completions` |
| Hỏi lại | tối thiểu 5 giây, tối đa 15 phút |
| Làm mới trước hạn | 300 giây |

- **Xin mã:** gửi form `client_id`, nhận `device_code`, `user_code`, `verification_uri`,
  `verification_uri_complete`, `expires_in`, `interval`
  ([token.go#L71-L84](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/token.go#L71-L84),
  [kimi.go#L411-L451](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L411-L451)).
  Mira mở `verification_uri_complete` nếu có, nếu không thì mở `verification_uri`.
- **Hỏi lại:** Kimi trả 200 cho cả lúc đang chờ lẫn lúc xong, nên Mira đọc trường `error`
  ([kimi.go#L496-L575](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L496-L575)):
  - `authorization_pending` và `slow_down` là chờ (`slow_down` cộng 5 giây như Copilot);
  - `expired_token` là hết hạn;
  - `access_denied` là bị từ chối;
  - lỗi khác là lỗi.
- **Làm mới:** gửi `grant_type=refresh_token`; 401/403 là phải đăng nhập lại; refresh token mới (nếu có)
  được ghi ngay
  ([kimi.go#L601-L668](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L601-L668)).
- **Header:** CLIProxyAPI gửi `X-Msh-Platform`, `X-Msh-Version`, `X-Msh-Device-Name`, `X-Msh-Device-Model` và
  `X-Msh-Device-Id`, với platform là chính nó (`CLIProxyAPI`)
  ([kimi.go#L400-L409](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/kimi/kimi.go#L400-L409),
  [kimi_executor.go#L1124-L1141](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/kimi_executor.go#L1124-L1141)).
  Mira làm như sau:
  - gửi `X-Msh-Platform: Mira` và phiên bản của Mira;
  - device ID là một UUID sinh lúc đăng nhập, lưu cùng token;
  - tên máy **không** gửi; Mira gửi `Mira` thay cho hostname, vì hostname là dữ liệu cá nhân.

  Nếu thử thật cho thấy Kimi chỉ nhận platform của Kimi CLI, task 6.2 dừng lại và hỏi chủ sản phẩm. Mira
  không tự đổi sang giả danh.
- **Transport:** Chat Completions, base `https://api.kimi.com/coding/v1`
  ([kimi_responses.go#L43-L50](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/helps/kimi_responses.go#L43-L50)).
- **Danh sách model:** thử `GET /v1/models`. Không được thì dùng danh sách tĩnh lấy từ catalog CLIProxyAPI
  ([models.json#L3726-L3979](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/registry/models/models.json#L3726-L3979)).
  Chưa xác minh `/v1/models` có tồn tại trên `api.kimi.com/coding`.

### D2. xAI Grok: discovery, mã thiết bị và Responses ở `api.x.ai`

Hằng số
([types.go#L6-L32](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/types.go#L6-L32)):

| Mục | Giá trị |
| --- | --- |
| Issuer | `https://auth.x.ai`, discovery ở `/.well-known/openid-configuration` |
| Client ID (của Grok CLI) | `b1a00492-073a-47ea-816f-4c329264a828` |
| Scope | `openid profile email offline_access grok-cli:access api:access` |
| API chính thức | `https://api.x.ai/v1` |
| Hỏi lại | tối thiểu 5 giây, tối đa 30 phút |
| Làm mới trước hạn | 5 phút |

- **Discovery:** đọc `device_authorization_endpoint` và `token_endpoint`. Mira chỉ chấp nhận URL `https` có
  host là `x.ai` hoặc `*.x.ai`
  ([xai.go#L47-L112](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/xai.go#L47-L112)).
  Token endpoint được lưu cùng token để làm mới.
- **Xin mã:** gửi form `client_id`, `scope`. Phải có `device_code`, `user_code` và một trong hai URL xác minh
  ([xai.go#L123-L177](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/xai.go#L123-L177)).
- **Hỏi lại:** như Kimi; `slow_down` cộng 5 giây. Nhãn tài khoản lấy từ claim `email` của `id_token`
  ([xai.go#L263-L340](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/xai.go#L263-L340),
  [#L464-L486](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/xai.go#L464-L486)).
- **Làm mới:** gửi `grant_type=refresh_token` tới token endpoint đã lưu
  ([xai.go#L373-L423](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/auth/xai/xai.go#L373-L423)).
  `invalid_grant` hoặc 400/401/403 thì chuyển sang "Cần đăng nhập lại".
- **Gọi model: Mira dùng `https://api.x.ai/v1/responses` với Bearer token OAuth, không dùng cli-chat-proxy.**
  Với tài khoản OAuth, CLIProxyAPI mặc định đi qua `https://cli-chat-proxy.grok.com/v1` và gắn danh tính Grok
  CLI:
  - `User-Agent: xai-grok-workspace/<ver>`;
  - `x-grok-client-identifier: grok-shell`;
  - `X-XAI-Token-Auth: xai-grok-cli`;
  - phiên bản client được ghim; bản cũ bị trả 426.

  Nguồn:
  [xai_executor_request.go#L253-L273](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/xai_executor_request.go#L253-L273),
  [#L347-L367](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/xai_executor_request.go#L347-L367),
  [xai_executor.go#L50-L62](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/xai_executor.go#L50-L62).
  Đó là giả danh, nên Mira không làm. Đường `using_api` của CLIProxyAPI gọi `/responses` trên `api.x.ai`
  ([xai_executor_execute.go#L49](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/runtime/executor/xai_executor_execute.go#L49)).

  **Chưa xác minh:** request ở `api.x.ai` có tính vào gói SuperGrok/X Premium không, hay trừ credit API. Task
  6.1 phải trả lời trước khi phát hành. Nếu chỉ cli-chat-proxy dùng được gói, thì xAI native **không phát
  hành**, và chủ sản phẩm quyết định lại.
- **Danh sách model:** `GET /v1/models`. Không được thì dùng danh sách tĩnh
  ([models.json#L4399-L4693](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/registry/models/models.json#L4399-L4693)).

### D3. Dùng lại khung tài khoản, không thêm lớp mới

- `OAuthProvider` và `ACCOUNT_PROVIDERS` thêm `kimi` và `xai`. `AccountLogins` và `AccountCredentials` đổi
  phần rẽ nhánh `codex ? … : …` thành bảng theo nhà cung cấp gồm `requestCode`, `poll`, `refresh`, `base` và
  `loginHosts`. Codex và Copilot giữ đúng hàm hiện có, không đổi hành vi.
- `LOGIN_HOSTS` theo nhà cung cấp:
  - Kimi: `kimi.com` và `*.kimi.com`;
  - xAI: `x.ai` và `*.x.ai`.

  Mã CLIProxyAPI lấy URL xác minh từ phản hồi, nên host thật chưa biết. Task 6.2 ghi lại host thật; danh
  sách chỉ được sửa theo bằng chứng đó.
- `AccountSecret` thêm các trường tùy chọn:
  - `deviceId` cho Kimi;
  - `tokenEndpoint` và `expiresAt` cho xAI.

  Token không phải JWT có `exp` nên hạn lấy từ `expires_in`.
- `transportFactory`:
  - `kimi` dùng `chat_completions`, base `https://api.kimi.com/coding/v1`, header D1;
  - `xai` dùng `responses` flavor `standard`, base `https://api.x.ai/v1`.
- 401 khi gọi model thì làm mới một lần rồi thử lại, như Codex.

### D4. Thẻ Claude Pro/Max và Antigravity: chỉ qua gateway

- Hai thẻ ở mục Tài khoản và trong onboarding ghi "Chỉ qua gateway tự chạy, rủi ro khóa tài khoản", kèm link
  "Cách dựng gateway" tới mục hướng dẫn trong tài liệu module. Bấm thẻ không mở luồng OAuth nào của Mira.
- Khi đã có kết nối gateway CLIProxyAPI loopback có khóa quản lý, thẻ có thêm nút "Đăng nhập qua gateway"
  (D6). Trước lần đầu, Mira hỏi xác nhận rủi ro (một hộp thoại, phải bấm "Tôi hiểu rủi ro").
- Thẻ Claude vẫn giữ link sang Khóa API › Anthropic như đường không rủi ro.

Bằng chứng rủi ro:

- **Anthropic.** [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) ghi rằng OAuth
  của gói Free/Pro/Max chỉ dành cho Claude Code và ứng dụng gốc của Anthropic. Bên thứ ba không được đưa
  đăng nhập Claude.ai vào ứng dụng của mình, không được chuyển request bằng credential gói thay người dùng,
  và không được giữ hay làm trung gian token.
- **CLIProxyAPI.** Người dùng báo bị khóa tài khoản:
  - issue [#2211](https://github.com/router-for-me/CLIProxyAPI/issues/2211) (2026-03-18, "claude code
    subscription banned");
  - issue [#5343](https://github.com/router-for-me/CLIProxyAPI/issues/5343) (2026-08-29, "Anthropic account
    bans");
  - issue [#3797](https://github.com/router-for-me/CLIProxyAPI/issues/3797) (2026-06-10): người dùng nói
    Antigravity khóa client bên thứ ba.
- **Google.** gemini-cli discussion [#20632](https://github.com/google-gemini/gemini-cli/discussions/20632)
  (2026-02-27, "Addressing Antigravity Bans & Reinstating Access").
- **Hermes.** PR [#50492](https://github.com/NousResearch/hermes-agent/pull/50492) (merge 2026-06-22) gỡ hai
  provider OAuth google-gemini-cli và google-antigravity.

Vì vậy Mira không giữ token, không tự làm OAuth, và cảnh báo trước. Đăng nhập Claude **qua gateway** vẫn là
"đưa đăng nhập vào ứng dụng" theo cách đọc chặt câu chữ của Anthropic. Chủ sản phẩm chốt ngày 2026-10-12: giữ
nút "Đăng nhập qua gateway" cho cả Claude và Antigravity, kèm xác nhận rủi ro.

### D5. Nhận diện CLIProxyAPI và luật loopback

- Gateway là một kết nối `api_key` thường; không thêm loại kết nối. Mira tính **gốc quản lý** từ base URL
  (bỏ `/v1`).
- **Loopback** là host `127.0.0.1`, `::1` hoặc `localhost` với scheme `http`/`https`.
  - Base URL không phải loopback: form hiện cảnh báo, và mọi tính năng quản lý bị tắt cho kết nối đó.
  - Gọi model vẫn chạy như một endpoint thường.
- **Nhận diện:** gửi `GET <gốc>/v8/management/config`.
  - Middleware quản lý gắn header `X-CPA-VERSION` trước khi kiểm khóa
    ([handler.go#L265-L271](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/handler.go#L265-L271)),
    nên có header thì là CLIProxyAPI, kể cả khi trả 401.
  - Không có header (ví dụ quản lý bị tắt vì `secret-key` rỗng,
    [config.example.yaml#L81-L92](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L81-L92))
    thì Mira coi đó là gateway thường và ghi "Không bật Management API".
- Onboarding và preset "Gateway tự dựng" thử `http://127.0.0.1:8317` một lần, timeout ngắn. Cổng mặc định:
  [config.example.yaml#L23-L30](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L23-L30).
- **Nghe trên mọi giao diện:** khi có khóa quản lý, Mira đọc `GET /v8/management/config` (JSON, bố cục v8;
  [management-api-v8.md#L15-L35](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/docs/management-api-v8.md#L15-L35)).
  `server.host` rỗng hoặc vắng (mặc định rỗng là mọi giao diện) thì hiện cảnh báo, kèm cách sửa
  `server.host: "127.0.0.1"`. Mira không tự sửa config.

### D6. Khóa quản lý và Management API v8

- Khóa quản lý được niêm phong bằng `SecretStore` (`safeStorage`) vào cột mới
  `ai_connection.management_secret`. Xóa kết nối là khóa mất theo. Máy không mã hóa được thì Mira từ chối
  lưu. Renderer chỉ biết "đã có khóa" và 4 ký tự cuối.
- Khóa chỉ được gửi tới đúng origin loopback của kết nối, bằng `Authorization: Bearer <key>`
  ([management-api-v8.md#L8-L13](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/docs/management-api-v8.md#L8-L13)).
  Main kiểm lại origin trước mỗi request; redirect không được đi theo.
- **Đăng nhập** (routes:
  [server_management_v8.go#L43-L54](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/server_management_v8.go#L43-L54);
  tài liệu:
  [management-api-v8.md#L118-L138](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/docs/management-api-v8.md#L118-L138)):
  - `GET /v8/management/oauth/auth-url?provider=<p>` trả `{status, url, state}`, luồng thiết bị có thêm
    `flow: "device"`
    ([auth_files_provider_oauth.go#L195](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/auth_files_provider_oauth.go#L195),
    [#L627](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/auth_files_provider_oauth.go#L627)).
    Mira mở `url` bằng `openExternal`, chỉ khi scheme là `https`.
  - Hỏi `GET /v8/management/oauth/status?state=` mỗi 2 giây: `wait` là chờ, `ok` là xong, `error` thì kèm
    `error`
    ([#L938-L1026](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/auth_files_provider_oauth.go#L938-L1026)).
  - Hủy bằng `DELETE /v8/management/oauth/session?state=`.

  Phiên dùng lại `FlowPanel`: polling không có ô OTP, chỉ có "Mở lại trang", "Đang chờ…" và Hủy. Provider
  Mira cho chọn: `claude`, `codex`, `antigravity`, `kimi`, `xai`. Token nằm trong gateway; Mira không đọc
  và không tải về (không gọi `/credentials/download`).
- **Trạng thái credential:** `GET /v8/management/credentials`. Mỗi mục có `provider`, `email`, `status`,
  `status_message`, `disabled`, `unavailable` và `quota`
  ([auth_files.go#L663-L705](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/auth_files.go#L663-L705)).
  `quota` là `{observed_at?, signals}`, trong đó `signals` là một map chuỗi tự do
  ([#L800-L818](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/internal/api/handlers/management/auth_files.go#L800-L818)).
  Mira hiện `signals` dạng khóa–giá trị kèm thời điểm quan sát khi map không rỗng. Không có thì ghi "Hạn
  mức: không rõ". Mira không đoán phần trăm.
- **Usage:** `GET /v8/management/observability/usage/api-keys`
  ([management-api-v8.md#L99](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/docs/management-api-v8.md#L99))
  chỉ có số liệu khi người dùng bật `usage-statistics-enabled` (mặc định tắt,
  [config.example.yaml#L1132-L1134](https://github.com/router-for-me/CLIProxyAPI/blob/a27799ec2b0cc5a60e49970d5467829ceaab8131/config.example.yaml#L1132-L1134)).
  Lỗi hoặc rỗng là "không rõ". Shape của body chưa được đọc kỹ; task 4.3 phải ghi lại từ bản thật.

### D7. Hết hạn mức, không tự chuyển, nhiều tài khoản

- `shouldFallback` trả `false` khi model lỗi thuộc một trong hai loại kết nối:
  - kết nối tài khoản (`authKind = 'oauth'`, gồm cả Codex và Copilot);
  - kết nối gateway được nhận là CLIProxyAPI.

  Lượt dừng với lỗi hết hạn mức kèm mốc đặt lại (`retryAfterMs` hoặc `resets_at` khi lớp phân loại lỗi đọc
  được), và vẫn có nút "Thử bằng Y" như hiện nay. Hộp thoại dịch vẫn mời "Dịch tiếp bằng Y" mà không tự
  chạy.
- **Nhiều tài khoản (tự bật):** thẻ tài khoản đã kết nối có công tắc "Dùng nhiều tài khoản". Bật thì có nút
  "Thêm tài khoản", chạy lại luồng đăng nhập cùng nhà cung cấp.
  - Mỗi tài khoản là một dòng `ai_oauth_token` trên cùng kết nối.
  - `AccountCredentials.keySource` dùng `KeyScheduler` để chọn tài khoản và đóng băng tài khoản bị giới hạn
    hoặc hết hạn mức.
  - Hết mọi tài khoản thì trả `exhausted` với mốc hồi sớm nhất, và lượt dừng.
  - Không bao giờ trộn nhà cung cấp.
  - Tắt công tắc thì chỉ dùng tài khoản đầu tiên; các dòng khác vẫn giữ cho tới khi người dùng xóa.
- Usage provider không báo thì là `unknown`, không phải 0 (theo canon chung và `provider-reported-usage`).

### D8. Migration thư viện

Một migration thư viện (số phiên bản lấy lúc triển khai, sau v11/v12 của chuỗi agent nếu chúng vào trước):

1. Dựng lại `ai_connection`:
   - `CHECK (oauth_provider IN ('codex', 'copilot', 'kimi', 'xai'))`;
   - thêm `management_secret BLOB`;
   - giữ chỉ mục unique theo `oauth_provider`.
2. Dựng lại `ai_oauth_token`:
   - khóa chính `id`;
   - thêm `connection_id`, `ord`, `secret`, `expires_at`, `account_label`, `state`, `updated_at`;
   - thêm cột đóng băng giống bảng khóa API (`frozen_until`, `freeze_strikes`).

   Dữ liệu cũ được chép sang, mỗi kết nối một dòng `ord = 0`, `id = connection_id`.
3. Thêm fixture `library-vNN.schema.sql` và test backup/khôi phục như các migration trước.

Revert: app cũ không mở được thư viện có số phiên bản mới hơn, như mọi migration khác. Muốn quay lại thì khôi
phục backup trước migration.

## Risks / Trade-offs

- **Điều khoản bên thứ ba.** Hai client ID là của Kimi Code và Grok CLI (D1, D2). Nhà cung cấp có thể chặn,
  hoặc khóa tài khoản. Mitigation:
  - task 6.1 đọc ToS của Kimi và xAI trước khi phát hành;
  - thẻ có dòng cảnh báo như Codex/Copilot;
  - không giả danh.
- **xAI có thể không tính vào gói** khi gọi `api.x.ai` (D2). Mitigation: task 6.1/6.2; không phát hành nếu
  chưa rõ.
- **Đăng nhập Claude/Antigravity qua gateway** có thể trái điều khoản của Anthropic/Google ngay cả khi Mira
  không giữ token (D4). Chủ sản phẩm chấp nhận rủi ro này (2026-10-12). Mitigation: chỉ có trên gateway của
  người dùng và có xác nhận rủi ro.
- **API nội bộ đổi.** Endpoint Kimi `coding` và Management API v8 có thể đổi. Mọi hằng số nằm trong
  `accounts/kimi.ts`, `accounts/xai.ts` và `gatewayManagement.ts`.
- **Khóa quản lý lộ ra LAN** nếu người dùng trỏ tới host khác. Mitigation: tính năng quản lý chỉ cho loopback.
- **Bỏ tự chuyển dự phòng cho Codex/Copilot** là đổi hành vi đã có. Đó là hệ quả của quyết định "không tự
  chuyển", được ghi ở MODIFIED `model-defaults`.

## Migration Plan

1. Migration thư viện (D8) cùng fixture và test.
2. Kimi, rồi xAI, sau cờ "chưa phát hành": thẻ ẩn cho tới khi task 6.1–6.2 xong.
3. Gateway: nhận diện, rồi khóa quản lý, rồi đăng nhập/trạng thái.
4. Thẻ Claude/Antigravity và `shouldFallback`.

## Open Questions

1. xAI: nếu chỉ cli-chat-proxy tính vào gói, có chấp nhận giả danh Grok CLI như đã chấp nhận header VS Code
   cho Copilot không?
