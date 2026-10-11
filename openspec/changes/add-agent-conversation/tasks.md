## 1. Model round và policy

- [ ] 1.1 Characterize vòng tool của ChatService legacy và tách model-round adapter nhỏ nhất không kéo proposal/work-session contract; kiểm test legacy vẫn đạt.
- [ ] 1.2 Thêm per-turn tool allowlist/policy evaluator theo capability kind, target và grant; test allow/deny/needs-user cùng args chứa ID ngoài scope.
- [ ] 1.3 Nối schema validation cho tool call/result và mixed invalid calls; kiểm mọi tool call ID có result và invalid call không chạy side effect.

## 2. Context, continuation và giới hạn

- [ ] 2.1 Lưu context snapshot/revision khi send và hiển thị removable context chips; test đổi navigation sau gửi không đổi target.
- [ ] 2.2 Thêm pending-action identity/fingerprint và continuation API; test chọn target mơ hồ, stale continuation và args đổi phải đánh giá policy lại.
- [ ] 2.3 Nối TurnBudgetTracker + repeated-tool fingerprint detector; test giới hạn round/call/read/write và vòng lặp dừng không gọi model tổng kết thêm.
- [ ] 2.4 Lắp context window theo thứ tự ưu tiên và dropped-turn metadata; test không cắt system/current instruction/tool pair và source dài phải đọc qua cursor.

## 3. Session UI và reconnect

- [ ] 3.1 Thay regex dispatcher bằng model/tool loop sau runtime gate; test câu hỏi read-only, write rõ target, tool error và prompt injection trong raw.
- [ ] 3.2 Nối màn Trợ lý thật với session list/transcript/composer/activity/open-target; test tạo chat ngoài work và một session đi qua hai work.
- [ ] 3.3 Compose side-panel shell và dùng cùng agent store/draft; test đổi bề mặt giữ draft, transcript và không tạo session phụ.
- [ ] 3.4 Thực hiện subscribe-before-snapshot, seq/gap recovery và scroll behavior; test event đúng lúc hydrate, reconnect sau commit và người dùng đọc lịch sử không bị kéo xuống.

## 4. Gate lát 2

- [ ] 4.1 Kiểm keyboard/focus/screen-reader/theme/chuỗi Việt-CJK và chạy toàn bộ spec scenarios + `node scripts/check.mjs`; ghi rõ phần chat legacy còn lại.
