## 0. Điều kiện trước

- [ ] 0.1 Archive `repair-agent-runtime` để spec `agent-runtime-integration` tồn tại trước khi apply/archive change này (delta `MODIFIED` cần spec gốc).

## 1. Lưu trữ và contract

- [ ] 1.1 Thêm cờ `foreignKeysOff` cho migration trong `migrate.ts` (tắt FK ngoài transaction, `foreign_key_check` trước commit, bật lại); test hàng con không bị cascade xóa và lỗi FK làm migration rollback.
- [ ] 1.2 Migration library v11: bảng `agent_tool_call`, dựng lại `agent_turn` với `expired`, index một-turn-active gồm `waiting_user`; thêm fixture `library-v11.schema.sql` và test backup trước migration giữ turn/operation/activity.
- [ ] 1.3 Contract: `expired` và `waiting_user → running | cancelled | expired`; `AgentSendInput.continuesTurnId` + `pendingReply`; `AgentSessionDetailView` thêm `activities`, `operations`, `pending`; repository đọc/ghi tool call; test chuyển trạng thái và schema input.

## 2. Vòng model–tool

- [ ] 2.1 Thêm `parameters` viết tay cho capability dùng trong chat và test khớp với schema valibot; không thêm dependency.
- [ ] 2.2 Thay nhánh regex trong `runExistingTurn` bằng vòng trên `provider.chat(messages, { tools })`: lưu call trước khi chạy, lưu kết quả trước khi trả model, persistence lỗi → `failed`; test bằng model giả cho câu hỏi đọc, ghi rõ target, tool lạ, call sai schema và lưu thất bại.
- [ ] 2.3 Model `toolCall: false` chạy một vòng không tool; provider lỗi → `failed`, không fallback; test cả hai.

## 3. Target, policy, budget

- [ ] 3.1 Capability `resolve_target` cấp handle theo turn (gồm `ctx` cho snapshot); đổi tham số target của capability sang handle và bỏ ID khỏi `list_works`; test resolved/ambiguous/not_found và ID thô bị từ chối.
- [ ] 3.2 Policy thuần theo bảng ở design D4; test từng hàng, prompt injection trong raw và `undo_operation` của session khác.
- [ ] 3.3 Nối `TurnBudgetTracker` (6 vòng, vòng cuối không tool) và loop detector theo `args_digest` lặp 3 lần; test vòng cuối không có tool, loop/đọc/ghi vượt trần dừng không gọi model, trần call chuyển sang vòng cuối.
- [ ] 3.4 Lắp context theo thứ tự ưu tiên và ghi `droppedTurns` vào activity; test không bỏ system/instruction/snapshot/cặp call-result.

## 4. Continuation và vòng đời turn

- [ ] 4.1 Pending action từ `needs_user` và `ambiguous`; continuation kiểm `waiting_user` + call ID + digest trong một transaction rồi đánh giá lại policy; test chọn ứng viên, duyệt rồi đổi tham số, digest sai, gửi lại cùng command.
- [ ] 4.2 Lệnh mới expire turn đang chờ trong cùng transaction; Stop trên `waiting_user` → `cancelled`; shutdown/startup giữ turn đang chờ; test cả ba.
- [ ] 4.3 Bỏ hủy turn khi cửa sổ đóng; phát event, write-intent, target-changed tới mọi cửa sổ; coordinator chờ ack mọi cửa sổ; test đóng cửa sổ giữa turn và hai cửa sổ.

## 5. Renderer

- [ ] 5.1 Store upsert turn/activity/operation theo ID + `updatedAt`, đọc lại snapshot khi terminal hoặc turn lạ, draft theo session; test bỏ lỡ event sau commit và event đến lúc đang hydrate.
- [ ] 5.2 Màn Trợ lý (Chat mới, lịch sử, transcript, composer với chip bỏ được, activity, pending action, Mở đích) và shell side panel `Trợ lý | Ngữ cảnh` dùng chung store; test đổi bề mặt giữ draft, một session đi qua hai tác phẩm, scroll không bị kéo.
- [ ] 5.3 Kiểm bàn phím, focus của drawer, vùng live cho trình đọc màn hình, theme và chuỗi Việt/CJK.

## 6. Gate

- [ ] 6.1 Chạy các scenario của spec và `node scripts/check.mjs`; cập nhật module docs về phần chat legacy còn lại.
