## 1. Library DB v12

- [ ] 1.1 Thêm migration v12 (sau v11 của `add-agent-conversation`): `agent_task`, `agent_task_item`,
  `agent_task_attempt` với CHECK theo từ vựng trạng thái/reason; dựng lại `agent_operation` với `turn_id`
  nullable, `task_item_id`, CHECK đúng một chủ sở hữu; giữ nguyên `agent_activity.operation_id`.
- [ ] 1.2 Thêm fixture `library-v12.schema.sql`, cập nhật `schemaSnapshot.test.ts`, test migration từ v11 có
  operation và activity cũ, test `libraryBackup` với task đang `running` giữa chừng.

## 2. Repository và state machine

- [ ] 2.1 Repository task/item/attempt với compare-and-set `state_version`; bảng chuyển trạng thái task và item
  đúng như spec; test mọi chuyển hợp lệ, mọi chuyển không hợp lệ bị `conflict`, trạng thái kết thúc bất biến.
- [ ] 2.2 Tạo task: resolve chapter ID có thứ tự, item cố định, `clientCommandId` + digest, Run again với
  `source_task_id`; test 30 item đúng thứ tự, gửi lại trả task cũ, chương thêm sau không vào task.

## 3. Runner

- [ ] 3.1 Runner nhận `runKey` và dựng prompt mỗi batch bằng `getRunContext` + `promptFromSnapshot`; bỏ đọc kho
  trực tiếp và bỏ `catch` nuốt lỗi; chat tạo bản chụp `agent:<operationId>`; test hai batch cùng hash bản chụp.
- [ ] 3.2 Một `CallBudget(batches, defaultExtra(batches))` cho mọi batch của operation, cổng ngoài cho trần
  task; usage ghi sau mỗi batch và giữ khi lỗi không phải abort (`complete = false`); test theo
  `translation-call-budget` và test lỗi batch ba còn usage hai batch.
- [ ] 3.3 `fill_untranslated`, khóa batch `item:<itemId>:<sha256>`, tra khóa qua các operation của item; test
  Retry không gọi/ghi lại hàng đã commit (kể cả hàng AI), khóa trùng khác checksum → `conflict`.
- [ ] 3.4 `shouldStop()` trước mỗi batch, operation `interrupted` khi dừng; rào cancel trước commit; trả
  `failedIds`/`refusedIds`/`budgetIds`; test bảng ánh xạ kết quả runner → item.
- [ ] 3.5 `pruneOrphanRunContexts` bỏ qua `run_key` `task:%`; test bản chụp item cũ hơn 30 ngày không bị xóa.

## 4. Scheduler, ghi và vòng đời

- [ ] 4.1 Scheduler tuần tự đánh thức theo sự kiện, ghim bản chụp + `source_rev` + `expected_target_rev` lúc
  item bắt đầu, operation và attempt mới mỗi lần chạy; test thứ tự, một item toàn app, thiếu raw không chặn
  item sau, kết thúc `completed`/`partially_completed`/`failed`.
- [ ] 4.2 Publisher write-intent tới mọi cửa sổ và đợi ack từng cửa sổ; tập chương đang chạy chặn ghi của chat
  trước khi gọi provider; test editor flush trước batch, `flush-failed` → `waiting_user(conflict)`, chat →
  `conflict`.
- [ ] 4.3 Đường `will-quit` ghi `paused(app_closed)` trước khi đóng library; task reconciler sau
  `operationReconciler`; fault injection: trước request, sau response, trong commit, giữa hai DB; xác nhận
  khởi động không gọi provider.
- [ ] 4.4 Trần task (lời gọi, token, chi phí khi có giá) qua cổng `CallBudget`; test `paused(budget)` trước
  request, usage không rõ không hiện 0, không fallback.

## 5. IPC, UI và chat

- [ ] 5.1 Contract shared, kênh `agentTaskList`/`agentTaskGet`/`agentTaskCreate`/`agentTaskControl`, sự kiện
  `agentTaskChanged` tới mọi cửa sổ, preload; test schema đầu vào và lệnh với `state_version` cũ.
- [ ] 5.2 Thay `JobsScreenMock` và `JobsAreaMock` bằng màn thật: refetch khi mount và khi có sự kiện,
  `ProgressBar` có nhãn, vùng `aria-live`, control theo trạng thái, `Mở đích`; xóa hai mock và cờ mock liên quan;
  test UI 29/30 partial, Stop turn không cancel task.
- [ ] 5.3 Sau khi `add-agent-conversation` xong: capability `create_translation_task` với policy `needs_user`,
  trả taskId; test task chạy tiếp sau khi turn kết thúc.
- [ ] 5.4 Ghi trạng thái hiện thực vào module docs liên quan, rồi chạy `node scripts/check.mjs --build`.
