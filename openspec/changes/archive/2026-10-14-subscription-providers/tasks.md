## 1. Transport chung

- [x] 1.1 Tách `transports/shared.ts` khỏi `openAiChatTransport.ts` (deadline, `Attempt`, đọc SSE, giới hạn
  body); định nghĩa `ChatTransport`, `Credential`, `CallOptions.credential` / `refresh` / `turnRound`.
  Kiểm: toàn bộ test provider hiện có vẫn xanh, không đổi hành vi.
- [x] 1.2 `createTransport(connection, model)` theo bảng chọn transport, gồm luật `gpt-N ≥ 5` của Copilot và
  chế độ Tự nhận. Kiểm: unit test bảng chọn.
- [x] 1.3 `connectionKeySource` trả `Credential`; credential OAuth lấy từ `tokenStore` và có `refresh`.
  `keyScheduler` coi OAuth là một khóa. Kiểm: unit test với tokenStore giả.

## 2. Transport Responses

- [x] 2.1 Đổi tin nhắn và tool sang `input` / `instructions` / `tools`:
  - rút gọn `call_id` > 64 ký tự kèm bảng đổi ngược;
  - thay các ký hiệu `<|…|>`;
  - map mức suy luận;
  - với Codex: `include`, `prompt_cache_key`, bỏ `max_output_tokens`.

  Kiểm: unit test thân request cho lịch sử có tool, chuỗi assistant, mức `off`.
- [x] 2.2 Đọc SSE:
  - chữ, bỏ phase commentary;
  - ghép tool theo `item_id`;
  - chốt tool thiếu `.done`;
  - `completed` / `incomplete` / `failed` / `error`;
  - usage.

  Kiểm: test bằng fixture SSE (văn bản, tool, incomplete do max tokens, error) đặt trong `__fixtures__`.

## 3. Codex

- [x] 3.1 `tokenStore` (mã hóa bằng `safeStorage`, từ chối khi không mã hóa được) và migration thư viện D7.
  Kiểm: test migration trên thư viện cũ; test từ chối lưu khi `safeStorage` không khả dụng.
- [x] 3.2 `codexAuth`:
  - `start`: xin mã;
  - `poll`: 200, 403/404 là chờ, mã khác là lỗi, lỗi mạng thử lại 6 lần;
  - đổi mã lấy token;
  - hết hạn 15 phút.

  Kiểm: unit test bằng server giả cho từng nhánh.
- [x] 3.3 Làm mới:
  - trước 120 giây theo `exp`;
  - khi 401 thì làm mới một lần rồi thử lại;
  - ghi refresh token mới;
  - khóa promise theo tài khoản;
  - phân loại lỗi relogin và quota.

  Kiểm: test hai lời gọi song song chỉ gửi một refresh; test `refresh_token_reused` chuyển `state =
  relogin`.
- [x] 3.4 (Thang suy luận theo họ model: `accountReasoning.ts` theo bảng `agent/reasoning_effort.py` của Hermes, đọc 2026-10-14; `toView` và bước kiểm mức trước khi gọi dùng chung.) Header (Bearer, account id, residency, `originator: mira`, `session_id`), danh sách model theo hai
  `client_version` kèm danh sách dự phòng tĩnh, thang suy luận theo họ model. Kiểm: unit test claim JWT,
  lọc và sắp model.
- [x] 3.5 (IPC tên `ai:accounts:usage`, cùng nhóm kênh `ai:accounts:*`.) Hạn mức `/wham/usage` (gán Phiên/Tuần theo độ dài cửa sổ, lưu đệm 5 phút) và IPC `ai:usage:get`.
  Kiểm: unit test parse hai dạng `reset_at`.

## 4. Copilot

- [x] 4.1 `copilotAuth`: device flow (`authorization_pending`, `slow_down`, `expired_token`, `access_denied`) và
  lưu token GitHub. Kiểm: unit test bằng server giả.
- [x] 4.2 Đổi token Copilot:
  - lưu đệm, đổi lại trước 120 giây;
  - `endpoints.api`;
  - 401/403/404 là vĩnh viễn, lỗi tạm thử lại 3 lần.

  Kiểm: unit test.
- [x] 4.3 Header Copilot cho Chat Completions và Responses; `x-initiator` theo `turnRound`; header vision; đổi
  lại token và thử lại khi gặp `model_not_available_for_integrator`. Kiểm: test `chatService` với
  transport giả ghi header của ba vòng.
- [x] 4.4 (`supports.reasoning_effort` vào `modelCapability` của mục Copilot qua lần liệt kê model gần nhất; sau khởi động lại dùng catalog cho tới lần liệt kê sau, có ghi chú `shortcut:`.) Danh sách model `/models` (lọc theo type, endpoint, `model_picker_enabled`) kèm danh sách dự phòng
  tĩnh và mức suy luận từ `supports.reasoning_effort`. Kiểm: unit test với fixture.

## 5. Anthropic Messages

- [x] 5.1 Đổi định dạng:
  - `system`;
  - `tool_use` / `tool_result`;
  - gộp vai liền nhau;
  - `max_tokens` bắt buộc;
  - `cache_control`;
  - thinking theo họ model.

  Kiểm: unit test thân request cho Claude 4.6, 4.5 mức Cao (ngân sách 16000, `max_tokens` ≥ 20096) và
  Haiku.
- [x] 5.2 Đọc SSE (text, `input_json_delta`, `message_delta`), lý do dừng, usage có cache, danh sách
  `/v1/models` theo trang. Từ chối khóa không phải `sk-ant-api`. Kiểm: test fixture SSE; test từ chối
  `sk-ant-oat`.
- [x] 5.3 (Chưa có khóa Anthropic thật: đã thử bằng server giả trong `anthropicTransport.test.ts`.) Thẻ Anthropic ở Khóa API chuyển từ `soon` sang `ready`. Kiểm: chạy app với khóa thật nếu có; nếu
  không, ghi rõ đã thử bằng server giả.

## 6. Phiên đăng nhập và giao diện

- [x] 6.1 (Kênh tên `ai:accounts:login-start` / `login-poll` / `login-cancel` / `login-reopen` / `disconnect`.) `oauthService` và IPC `start` / `poll` / `cancel` / `disconnect`:
  - `isTrustedSender`;
  - `openExternal` chỉ với host trong danh sách;
  - hủy khóa với việc lưu token;
  - dọn phiên quá hạn.

  Kiểm: test hủy trong lúc đổi token thì không lưu.
- [x] 6.2 `FlowPanel` với các trạng thái starting, polling (ô OTP sao chép được, mở lại trang, Hủy), success,
  confirm model, error (Chi tiết đã che token, ba nút). Thêm các trạng thái này vào máy trạng thái
  onboarding. Kiểm: unit test máy trạng thái; render test từng trạng thái.
- [x] 6.3 Mục Tài khoản:
  - thẻ hoạt động;
  - nhóm Đã kết nối có ✓ và nút ngắt (spinner khi đang ngắt);
  - "Cần đăng nhập lại";
  - cảnh báo điều khoản;
  - thẻ Claude dẫn sang Anthropic.

  Kiểm: render test các trạng thái.
- [x] 6.4 Chip hạn mức trong menu model (dưới 20 %, cảnh báo dưới 10 %) và trên thẻ Codex. Kiểm: render test với
  dữ liệu giả.
- [x] 6.5 Form endpoint có thêm chế độ Responses và Anthropic Messages; Kiểm tra thăm dò đúng route. Kiểm: unit test
  `probeEndpoint` với từng chế độ.

## 7. Lỗi, thử thật, tài liệu

- [x] 7.1 `classifyError` thêm các lỗi theo nhà cung cấp ở D9. Kiểm: unit test từng mã.
- [ ] 7.2 (Chưa thử: cần tài khoản ChatGPT và Copilot của chủ sản phẩm. Chuyển ra `docs/modules/ai-connections/README.md` khi archive 2026-10-14.) Thử thật với tài khoản của chủ sản phẩm: đăng nhập Codex, dịch một lô, chat có tool; đăng nhập Copilot,
  chat với một model gpt-5 và một model Claude. Kiểm: ghi kết quả (model, usage, lỗi gặp phải) vào
  `docs/modules/ai-connections/README.md`. Nếu chưa có tài khoản thì để mở và nói rõ.
- [x] 7.3 Cập nhật `docs/modules/ai-connections/README.md` (tiếng Việt): hành vi đã chạy, hằng số và nguồn,
  rủi ro, cách revert. Kiểm: link tương đối trỏ tới file có thật.
- [x] 7.4 Chạy `node scripts/check.mjs --build`. Kiểm: mọi bước báo ok.
