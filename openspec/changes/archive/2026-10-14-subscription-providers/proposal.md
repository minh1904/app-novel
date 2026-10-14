## Why

Chủ sản phẩm chốt ngày 2026-10-08: đăng nhập gói thuê bao làm giống Hermes Desktop, trừ Nous Portal.
Nguồn: `docs/modules/ai-connections/README.md`, mục "Quyết định 2026-10-08". Quyết định này thay ADR-004
ở hai điểm: được đăng nhập OAuth ngay trong app, và được có nhiều transport.

Người dùng có gói ChatGPT Plus/Pro hoặc GitHub Copilot hiện phải dựng gateway riêng mới dịch được bằng
gói đó. Mục Tài khoản trong modal Cài đặt (change `hermes-settings-modal`) đã có khung; change này làm cho
các thẻ bấm được. Nó cũng thêm transport Anthropic Messages để thẻ khóa Anthropic dùng được.

Rủi ro điều khoản đã được chấp nhận và ghi trong tài liệu: Codex và Copilot đăng nhập bằng client ID của
công cụ chính hãng, giống Hermes. Gói Claude Pro/Max qua token của Claude Code **không** làm, vì đó là lách
cách tính phí của Anthropic.

## What Changes

**ChatGPT/Codex, đăng nhập bằng mã thiết bị.**

- **Đăng nhập:**
  - Mira xin mã từ `auth.openai.com`.
  - Màn hình hiện mã dạng ô OTP (bấm để sao chép) và mở trang xác minh trong trình duyệt.
  - Mira hỏi lại mỗi vài giây cho tới khi người dùng xác nhận, tối đa 15 phút.
  - Mira đổi mã lấy access token và refresh token.
- **Token:**
  - Lưu bằng `safeStorage`.
  - Tự làm mới trước khi hết hạn 120 giây, và một lần khi gặp 401.
  - Refresh token chỉ dùng được một lần, nên mỗi lần làm mới phải ghi lại token mới, và chỉ một lần làm
    mới được chạy cùng lúc.
- **Gọi model:** qua transport **Responses API** mới, tới `chatgpt.com/backend-api/codex/responses`, có
  header tài khoản lấy từ JWT. Mira tự xưng là Mira (`originator`), không giả danh client khác.
- **Danh sách model:** lấy từ `/codex/models`. Mức suy luận theo thang của từng họ model.
- **Chip hạn mức:** lấy từ `/wham/usage`, hiện phần trăm còn lại của phiên và của tuần.

**GitHub Copilot, đăng nhập bằng mã thiết bị của GitHub.**

- **Đăng nhập:** device flow của GitHub, rồi đổi token GitHub lấy token Copilot (`copilot_internal/v2/token`).
  Token Copilot được đổi lại khi sắp hết hạn.
- **Gọi model:** với header tích hợp Copilot. Model `gpt-5+` dùng Responses API; các model khác (Claude,
  Gemini, gpt-4.x) dùng Chat Completions.
- **Lượt gọi tool:** chỉ request đầu của mỗi lượt người dùng mang `x-initiator: user`; các vòng tool tiếp
  theo mang `agent`, như client chính hãng.
- **Danh sách model:** lấy từ `/models`.

**Anthropic bằng khóa API.** Transport **Anthropic Messages** mới (`/v1/messages`, `x-api-key`,
`anthropic-version`), có:

- `thinking` adaptive hoặc ngân sách token theo model;
- tool use;
- prompt cache;
- danh sách model từ `/v1/models`.

Chỉ nhận khóa `sk-ant-api…`. Token OAuth (`sk-ant-oat…`) bị từ chối, kèm lời giải thích.

**Transport chung.**

- Một interface `ChatTransport` gồm `listModels`, `complete`, `stream`. Định dạng nội bộ vẫn là tin nhắn
  và tool chuẩn OpenAI; mỗi transport đổi định dạng ở rìa.
- Kết nối có thêm `apiMode`: `chat_completions` | `responses` | `anthropic_messages`. Form endpoint tùy
  chỉnh cho chọn ba chế độ này, kèm lựa chọn Tự nhận.

**Giao diện đăng nhập như Hermes.**

- Thẻ ở mục Tài khoản và trong onboarding.
- Các trạng thái: đang bắt đầu → chờ xác nhận (mã OTP, "Mở lại trang xác minh", "Đang chờ bạn xác
  nhận…", Hủy) → thành công → chọn model mặc định → lỗi (Chi tiết, Thử lại, Chọn cách khác).
- Thẻ đã kết nối có ✓ và nút Ngắt kết nối (thùng rác). Khi đang ngắt, nút thành spinner.
- Thẻ hiện cảnh báo điều khoản.

## Capabilities

### New Capabilities

- `subscription-login`: đăng nhập, lưu, làm mới và ngắt kết nối tài khoản Codex và Copilot. Bao gồm các
  trạng thái giao diện và chip hạn mức.
- `provider-transports`: các transport Responses, Anthropic Messages và Copilot. Bao gồm cách chọn transport
  theo kết nối và model, cách đổi định dạng tin nhắn, tool, suy luận, usage, và danh sách model của mỗi
  loại.

### Modified Capabilities

<!--
`provider-settings` chưa nằm trong openspec/specs: nó đến từ change `hermes-settings-modal`, chưa archive.
Phần đổi trên giao diện (thẻ Tài khoản hoạt động, thẻ Anthropic nhận khóa, chế độ API mới) được đặc tả như
yêu cầu mới trong `subscription-login` và `provider-transports`. Change này phải apply sau
`hermes-settings-modal`.
-->

## Impact

**Main.**

- Thêm `src/main/infra/providers/transports/`: `responses.ts`, `anthropicMessages.ts`, `copilot.ts`, cùng
  interface chung. Tách phần dùng chung ra khỏi `openAiChatTransport.ts`.
- Thêm `src/main/infra/auth/`: `codexAuth.ts`, `copilotAuth.ts`, `tokenStore.ts` (dùng `safeStorage`).
- `connectionKeySource.ts` lấy token OAuth và làm mới khi cần.
- `classifyError.ts` thêm mã lỗi của ba nhà cung cấp.

**Lưu trữ.** Migration thư viện: `ai_connection` thêm `auth_kind` (`api_key` | `oauth`), `oauth_provider`
và `api_mode`. Token nằm trong bảng mới `ai_oauth_token`, đã mã hóa.

**IPC.** `ai:oauth:start`, `ai:oauth:poll`, `ai:oauth:cancel`, `ai:oauth:disconnect`, `ai:usage:get`.

**Renderer.** Thẻ Tài khoản, `FlowPanel` (các trạng thái đăng nhập), chip hạn mức trong menu model, và các
trạng thái OAuth thêm vào máy trạng thái onboarding.

**Mạng.** Thêm các host gọi ra:

- `auth.openai.com`, `chatgpt.com`;
- `github.com`, `api.github.com`, `api.githubcopilot.com`;
- `api.anthropic.com`.

Mọi request đi qua `net.fetch` ở main; CSP của renderer không đổi.

**Tài liệu.** `docs/modules/ai-connections/`.
