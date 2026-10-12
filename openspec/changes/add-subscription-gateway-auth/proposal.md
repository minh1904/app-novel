## Why

Chủ sản phẩm chốt ngày 2026-10-12 (ghi ở `docs/modules/ai-connections/README.md`, mục "Quyết định
2026-10-12"): bỏ lát MCP `add-external-translation-worker`, thay bằng một track riêng cho người dùng có gói
thuê bao. Track này không nằm trong chuỗi change agent.

Change `subscription-providers` đã có đăng nhập mã thiết bị cho Codex và Copilot, `tokenStore` bằng
`safeStorage`, làm mới một-lần-một-lúc, `FlowPanel` và IPC `ai:accounts:*`. Người dùng gói Kimi Code hoặc
SuperGrok/X Premium vẫn phải tự dựng gateway. Người dùng Claude Pro/Max hoặc Google Antigravity thì không có
đường nào trong app, và Mira không được giữ token của hai loại này. Chế độ "Gateway tự dựng" hiện chỉ là một
endpoint OpenAI-compatible: Mira không biết đó có phải CLIProxyAPI không, gateway có mở ra mạng LAN không,
tài khoản bên trong còn sống hay đã hết hạn mức.

## What Changes

- **Kimi Code và xAI Grok đăng nhập ngay trong Mira** bằng mã thiết bị (RFC 8628), viết bằng TypeScript.
  Change dùng lại `AccountLogins`, `AccountCredentials`, `tokenStore`, làm mới một-lần-một-lúc, `FlowPanel` và
  thẻ tài khoản của `subscription-providers`. Kimi gọi Chat Completions; xAI gọi Responses. Mira tự xưng là
  Mira và không giả danh Kimi CLI hay Grok CLI.
- **Codex và Copilot giữ nguyên** như đã triển khai: không đổi luồng đăng nhập, header hay transport.
- **Claude Pro/Max và Antigravity chỉ đi qua gateway CLIProxyAPI do người dùng tự chạy.** Mira không bao giờ
  lưu token của hai loại này. Thẻ của chúng ghi "chỉ qua gateway tự chạy, rủi ro khóa tài khoản" và có link
  hướng dẫn dựng gateway.
- **Chế độ gateway hiểu CLIProxyAPI:**
  - nhận ra CLIProxyAPI trên máy (mặc định `http://127.0.0.1:8317`);
  - cảnh báo khi base URL không phải loopback; khi đó tính năng quản lý bị tắt;
  - lưu khóa quản lý (management key) bằng `safeStorage`, chỉ gửi tới đúng host đó, không bao giờ gửi về
    renderer;
  - đăng nhập tài khoản trong gateway qua Management API v8 (`oauth/auth-url`, `oauth/status`,
    `oauth/session`);
  - hiện trạng thái credential, và hạn mức hay usage chỉ khi endpoint trả về; còn lại ghi "không rõ";
  - cảnh báo khi gateway nghe trên mọi giao diện mạng.
- **Không tự chuyển sang API trả tiền hay nhà cung cấp khác.** Kết nối tài khoản hoặc gateway hết hạn mức
  thì dừng, kèm mốc đặt lại nếu biết. Usage không biết là "không rõ", không phải 0. Nhiều tài khoản chỉ được
  dùng trong cùng một nhà cung cấp, qua `KeyScheduler` sẵn có, và người dùng phải tự bật.
- **Không đóng gói CLIProxyAPI làm sidecar** trong change này (xem Non-Goals trong `design.md`).

## Capabilities

### New Capabilities

- `subscription-gateway-auth`: đăng nhập Kimi Code và xAI Grok bằng mã thiết bị; thẻ Claude và Antigravity
  chỉ qua gateway; nhận diện và quản lý gateway CLIProxyAPI trên máy; dừng khi hết hạn mức; nhiều tài khoản
  trong một nhà cung cấp.

### Modified Capabilities

- `model-defaults`: requirement "Chuyển sang dự phòng" không tự chuyển khi model lỗi thuộc kết nối tài khoản
  thuê bao hoặc gateway.

<!--
`subscription-login` và `provider-transports` thuộc change `subscription-providers`, chưa archive nên chưa
nằm trong openspec/specs. Phần mở rộng cho Kimi/xAI được đặc tả như yêu cầu mới trong
`subscription-gateway-auth`. Change này phải apply sau `subscription-providers`.
-->

## Impact

**Main.**

- Thêm `src/main/infra/providers/accounts/kimi.ts` và `xai.ts`, theo mẫu của `codex.ts` và `copilot.ts`.
- `src/main/services/ai/accountLogins.ts` và `accountCredentials.ts`: thêm hai nhà cung cấp; nguồn khóa
  nhiều tài khoản đi qua `KeyScheduler`.
- `src/main/infra/providers/transports/transportFactory.ts`: Kimi dùng Chat Completions, xAI dùng Responses.
- Thêm `src/main/services/ai/gatewayManagement.ts`: nhận diện, khóa quản lý, đăng nhập, trạng thái.
- `src/main/services/ai/fallback.ts`: không tự chuyển với kết nối tài khoản hoặc gateway.

**Lưu trữ.** Thêm một migration thư viện; số phiên bản lấy lúc triển khai, sau các change đang chờ:

- `ai_connection.oauth_provider` nhận thêm `kimi` và `xai`;
- `ai_connection` thêm cột `management_secret`;
- `ai_oauth_token` cho phép nhiều tài khoản trên một kết nối.

Migration có fixture schema và test backup.

**IPC.** `ai:accounts:*` nhận thêm `kimi` và `xai`. Thêm nhóm kênh `ai:gateway:*`.

**Renderer.** Thẻ Kimi, xAI, Claude và Antigravity ở mục Tài khoản và trong onboarding; khối "CLIProxyAPI"
trong form Endpoint tùy chỉnh.

**Mạng.** Thêm `auth.kimi.com`, `api.kimi.com`, `auth.x.ai`, `api.x.ai`, và gateway loopback do người dùng
khai. Mọi request đi qua `net.fetch` ở main.

**Tài liệu.** `docs/modules/ai-connections/README.md`.
