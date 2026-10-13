## 1. Library DB v12

- [x] 1.1 Thêm migration v12 (sau v11 của `add-agent-conversation`): `agent_task`, `agent_task_item`,
  `agent_task_attempt` với CHECK theo từ vựng trạng thái/reason; dựng lại `agent_operation` với `turn_id`
  nullable, `task_item_id`, CHECK đúng một chủ sở hữu; giữ nguyên `agent_activity.operation_id`.
- [x] 1.2 Thêm fixture `library-v12.schema.sql`, cập nhật `schemaSnapshot.test.ts`, test migration từ v11 có
  operation và activity cũ, test `libraryBackup` với task đang `running` giữa chừng.

## 2. Repository và state machine

- [x] 2.1 Repository task/item/attempt với compare-and-set `state_version`; bảng chuyển trạng thái task và item
  đúng như spec; test mọi chuyển hợp lệ, mọi chuyển không hợp lệ bị `conflict`, trạng thái kết thúc bất biến.
- [x] 2.2 Tạo task: resolve chapter ID có thứ tự, item cố định, `clientCommandId` + digest, Run again với
  `source_task_id`; test 30 item đúng thứ tự, gửi lại trả task cũ, chương thêm sau không vào task.

## 3. Runner

- [x] 3.1 Runner nhận `runKey` và dựng prompt mỗi batch bằng `getRunContext` + `promptFromSnapshot`; bỏ đọc kho
  trực tiếp và bỏ `catch` nuốt lỗi; chat tạo bản chụp `agent:<operationId>`; test hai batch cùng hash bản chụp.
- [x] 3.2 Một `CallBudget(batches, defaultExtra(batches))` cho mọi batch của operation, cổng ngoài cho trần
  task; usage ghi sau mỗi batch và giữ khi lỗi không phải abort (`complete = false`); test theo
  `translation-call-budget` và test lỗi batch ba còn usage hai batch.
- [x] 3.3 `fill_untranslated`, khóa batch `item:<itemId>:<sha256>`, tra khóa qua các operation của item; test
  Retry không gọi/ghi lại hàng đã commit (kể cả hàng AI), khóa trùng khác checksum → `conflict`.
- [x] 3.4 `shouldStop()` trước mỗi batch, operation `interrupted` khi dừng; rào cancel trước commit; trả
  `failedIds`/`refusedIds`/`budgetIds`; test bảng ánh xạ kết quả runner → item.
- [x] 3.5 `pruneOrphanRunContexts` bỏ qua `run_key` `task:%`; test bản chụp item cũ hơn 30 ngày không bị xóa.

## 4. Scheduler, ghi và vòng đời

- [x] 4.1 Scheduler tuần tự đánh thức theo sự kiện, ghim bản chụp + `source_rev` + `expected_target_rev` lúc
  item bắt đầu, operation và attempt mới mỗi lần chạy; test thứ tự, một item toàn app, thiếu raw không chặn
  item sau, kết thúc `completed`/`partially_completed`/`failed`.
- [x] 4.2 Publisher write-intent tới mọi cửa sổ và đợi ack từng cửa sổ; tập chương đang chạy chặn ghi của chat
  trước khi gọi provider; test editor flush trước batch, `flush-failed` → `waiting_user(conflict)`, chat →
  `conflict`.
- [x] 4.3 Đường `will-quit` ghi `paused(app_closed)` trước khi đóng library; task reconciler sau
  `operationReconciler`; fault injection: trước request, sau response, trong commit, giữa hai DB; xác nhận
  khởi động không gọi provider.
- [x] 4.4 Trần task (lời gọi, token, chi phí khi có giá) qua cổng `CallBudget`; test `paused(budget)` trước
  request, usage không rõ không hiện 0, không fallback.

## 5. IPC, UI và chat

- [x] 5.1 Contract shared, kênh `agentTaskList`/`agentTaskGet`/`agentTaskCreate`/`agentTaskControl`, sự kiện
  `agentTaskChanged` tới mọi cửa sổ, preload; test schema đầu vào và lệnh với `state_version` cũ.
- [x] 5.2 Thay `JobsScreenMock` và `JobsAreaMock` bằng màn thật: refetch khi mount và khi có sự kiện,
  `ProgressBar` có nhãn, vùng `aria-live`, control theo trạng thái, `Mở đích`; xóa hai mock và cờ mock liên quan;
  test UI 29/30 partial, Stop turn không cancel task.
- [x] 5.3 Sau khi `add-agent-conversation` xong: capability `create_translation_task` với policy `needs_user`,
  trả taskId; test task chạy tiếp sau khi turn kết thúc.
- [x] 5.4 Ghi trạng thái hiện thực vào module docs liên quan, rồi chạy `node scripts/check.mjs --build`.
