## 1. Lưu trữ

- [ ] 1.1 Migration thư viện (D8):
  - dựng lại `ai_connection`: thêm `kimi` vào CHECK, thêm cột `management_secret`;
  - dựng lại `ai_oauth_token` thành nhiều dòng mỗi kết nối, chép dữ liệu cũ thành `ord = 0`;
  - thêm fixture `library-vNN.schema.sql`.

  Kiểm:
  - test migration trên thư viện v10 có một kết nối Codex và một kết nối Copilot: token vẫn đọc được;
  - test backup/khôi phục.
- [ ] 1.2 `connections.ts`, `oauthTokens.ts`:
  - `OAuthProvider` thêm `kimi`;
  - đọc/ghi nhiều tài khoản;
  - đọc/ghi `management_secret`, chỉ qua `SecretStore`.

  Kiểm: unit test; test từ chối lưu khi `safeStorage` không khả dụng.

## 2. Kimi Code

- [ ] 2.1 `accounts/kimi.ts` theo D1: xin mã, hỏi lại, làm mới, header `X-Msh-*` của Mira, device ID lưu
  cùng token, danh sách model kèm danh sách tĩnh. Kiểm: unit test bằng server giả cho
  `authorization_pending`, `slow_down`, `expired_token`, `access_denied`, làm mới 401.
- [ ] 2.2 `accountLogins.ts` và `accountCredentials.ts` dùng bảng theo nhà cung cấp; `LOGIN_HOSTS` theo nhà
  cung cấp; làm mới trước 300 giây cho Kimi. Kiểm:
  - toàn bộ test Codex/Copilot hiện có vẫn xanh mà không sửa test;
  - test hai lời gọi song song chỉ gửi một refresh cho Kimi.
- [ ] 2.3 `transportFactory.ts`: Kimi Chat Completions; 401 thì làm mới một lần.
  Kiểm: unit test bảng chọn transport và header.

## 3. Thẻ tài khoản

- [ ] 3.1 Contract và IPC:
  - `ACCOUNT_PROVIDERS` thêm `kimi`;
  - `ACCOUNT_LABELS`, `ACCOUNT_NAMES`;
  - `ai:accounts:*` nhận nhà cung cấp mới.

  Kiểm: test schema IPC từ chối nhà cung cấp lạ.
- [ ] 3.2 `AccountsPage` và onboarding:
  - thẻ Kimi Code, có cảnh báo điều khoản;
  - thẻ Claude Pro/Max và Antigravity ghi "Chỉ qua gateway tự chạy, rủi ro khóa tài khoản", có link hướng
    dẫn;
  - nút "Đăng nhập qua gateway" chỉ khi có gateway loopback có khóa quản lý, và hỏi xác nhận rủi ro.

  Kiểm: render test từng trạng thái thẻ.
- [ ] 3.3 Công tắc "Dùng nhiều tài khoản" và nút "Thêm tài khoản"; `keySource` chọn tài khoản bằng
  `KeyScheduler`. Kiểm:
  - test tài khoản 1 hết hạn mức thì dùng tài khoản 2;
  - test hết cả hai thì `exhausted` với mốc sớm nhất;
  - test tắt công tắc thì chỉ dùng tài khoản đầu.

## 4. Gateway CLIProxyAPI

- [ ] 4.1 `gatewayManagement.ts`: tính gốc quản lý, luật loopback, nhận diện bằng `X-CPA-VERSION`, thử
  `127.0.0.1:8317`. Kiểm: unit test với server giả trả 401 có header, 404 không header, host LAN.
- [ ] 4.2 Khóa quản lý: lưu/xóa, chỉ gửi tới origin của kết nối, không theo redirect, không về renderer.
  Kiểm:
  - test redirect 302 sang host khác thì không gửi lại;
  - test IPC trả về chỉ có 4 ký tự cuối.
- [ ] 4.3 Đăng nhập qua `oauth/auth-url` → `oauth/status` → `DELETE oauth/session`, dùng `FlowPanel`; đọc
  `credentials`, `quota.signals`, `observability/usage/api-keys` và `server.host`. Kiểm:
  - unit test với server giả cho `wait`, `ok`, `error` và hủy;
  - render test "Hạn mức: không rõ";
  - render test cảnh báo `server.host` rỗng.

  Ghi shape thật của `usage/api-keys` vào tài liệu module khi có bản chạy thật.
- [ ] 4.4 Form Endpoint tùy chỉnh và onboarding: khối "CLIProxyAPI <phiên bản>", ô khóa quản lý, cảnh báo
  loopback và cảnh báo mọi giao diện, danh sách credential. Kiểm: render test.

## 5. Không tự chuyển

- [ ] 5.1 `shouldFallback` trả `false` cho kết nối OAuth và gateway CLIProxyAPI; lỗi hết hạn mức mang mốc
  đặt lại. Kiểm:
  - test `chatService`: Codex hết hạn mức thì không gọi dự phòng, có nút "Thử bằng";
  - test kết nối khóa API vẫn tự chuyển như cũ.

## 6. Điều khoản, thử thật, tài liệu

- [ ] 6.1 Trước khi phát hành, đọc và ghi lại điều khoản client bên thứ ba của Kimi Code: có cho dùng
  client ID của Kimi Code từ ứng dụng khác không.

  Kiểm: ghi nguồn (URL, ngày đọc) vào `docs/modules/ai-connections/README.md`. Nếu điều khoản cấm thì giữ thẻ ẩn
  và hỏi chủ sản phẩm.
- [ ] 6.2 Thử thật với tài khoản của chủ sản phẩm:
  - đăng nhập Kimi, dịch một lô, chat có tool;
  - ghi host thật của trang xác minh;
  - xem Kimi có nhận `X-Msh-Platform: Mira` không;
  - gateway CLIProxyAPI trên máy: đăng nhập một tài khoản, đọc credential và hạn mức.

  Kiểm: ghi model, usage và lỗi gặp vào `docs/modules/ai-connections/README.md`. Nếu chưa có tài khoản thì
  để mở và nói rõ.
- [ ] 6.3 Cập nhật `docs/modules/ai-connections/README.md` (tiếng Việt): hành vi đã chạy, hằng số và nguồn,
  hướng dẫn dựng gateway loopback, rủi ro. Kiểm: link tương đối trỏ tới file có thật.
- [ ] 6.4 Chạy `node scripts/check.mjs --build`. Kiểm: mọi bước báo ok.
