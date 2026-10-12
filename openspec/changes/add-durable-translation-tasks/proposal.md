## Why

Dịch 30 chương không thể là một turn chat dài hay vòng lặp do model điều khiển. Mira cần task lưu bền với
danh sách item cố định để Pause, Continue, Cancel, Retry và phục hồi sau khi đóng app mà không gọi lại
hoặc ghi lại phần đã commit.

Runner hiện tại chưa đủ cho việc đó (kiểm tại HEAD `e6090be`):

- Batch được khóa theo vị trí `batch-${batchIdx + 1}` và runner lập kế hoạch lại từ hàng hiện tại
  ([`chapterTranslationRunner.ts` L231](../../../src/main/services/agent/chapterTranslationRunner.ts#L231));
  journal khóa batch theo `(operation_id, batch_key)`
  ([`workSchema.ts` L562-L570](../../../src/main/infra/storage/workSchema.ts#L562-L570)) và từ chối batch
  mới trên operation đã kết thúc
  ([`agentOperationJournal.ts` L207](../../../src/main/infra/storage/agentOperationJournal.ts#L207)).
  Hàng do AI viết không được bảo vệ
  ([`chapterTranslation.ts` L57-L58](../../../src/main/services/ai/chapterTranslation.ts#L57-L58)), nên
  chạy lại sẽ dịch đè chính kết quả của lần trước.
- `agent_operation.turn_id` là `NOT NULL` và cascade theo turn
  ([`librarySchema.ts` L270-L272](../../../src/main/infra/storage/librarySchema.ts#L270-L272)); operation
  của task không có turn.
- Runner chỉ biết `signal.aborted`
  ([L138-L141](../../../src/main/services/agent/chapterTranslationRunner.ts#L138-L141)) nên không có điểm
  dừng an toàn cho Pause.
- Runner đọc glossary/xưng hô trực tiếp mỗi batch và nuốt lỗi
  ([L160-L180](../../../src/main/services/agent/chapterTranslationRunner.ts#L160-L180)), không gọi
  `executeTranslateBatch` với `CallBudget` của lượt
  ([`translationCore.ts` L35-L39, L92](../../../src/main/services/ai/translate/translationCore.ts#L35-L39)),
  và làm mất usage khi lỗi không phải abort
  ([L304-L305](../../../src/main/services/agent/chapterTranslationRunner.ts#L304-L305)). Hai điều này trái
  spec đã chấp nhận `translation-context-snapshot` và `translation-call-budget`.
- Không có publisher thì `writeCoordinator.request` trả `not-open` ngay
  ([`writeCoordinator.ts` L28-L30](../../../src/main/services/agent/writeCoordinator.ts#L28-L30)): task
  chạy nền sẽ ghi mà không flush editor.

## What Changes

- Library DB v12 (sau v11 của `add-agent-conversation`): bảng `agent_task`, `agent_task_item`,
  `agent_task_attempt`; dựng lại `agent_operation` với `turn_id` nullable, `task_item_id` mới và CHECK đúng
  một chủ sở hữu.
- Bộ từ vựng trạng thái chung cho task/item/reason (change này sở hữu) và bảng chuyển trạng thái đầy đủ.
- Scheduler tuần tự trong Main; mỗi lần chạy item là một operation mới với một `CallBudget`; khóa batch theo
  nội dung; chính sách ghi mặc định `fill_untranslated`.
- Item ghim bản chụp ngữ cảnh (`run_key` → `translate_run_context`) lần đầu chuyển queued → running; runner
  dựng prompt từ bản chụp, không đọc kho trực tiếp.
- Pause bằng `shouldStop()` giữa các batch; Cancel bằng abort + rào commit; đóng app ghi
  `paused(app_closed)`; reconciler lúc khởi động chỉ xử lý crash, không gọi provider.
- Ghi của task phát write-intent tới mọi cửa sổ; chat ghi vào chương đang có item chạy bị từ chối `conflict`.
- Trần task (lời gọi, token; chi phí chỉ khi catalog có giá) kiểm trước mỗi lời gọi model; usage không rõ là
  `unknown`, không phải 0.
- IPC/preload cho list/get/create/control và sự kiện `agentTaskChanged`; thay `JobsScreenMock` và
  `JobsAreaMock` bằng màn Tác vụ thật.
- Capability chat `create_translation_task` (cần người dùng duyệt), làm sau khi `add-agent-conversation` có.

## Capabilities

### New Capabilities

- `durable-translation-task`: task dịch dải chương lưu bền, tuần tự, có điều khiển, ngân sách và phục hồi.

### Modified Capabilities

- `translation-context-snapshot`: bản chụp được item task tham chiếu không bị dọn như bản chụp mồ côi.

## Impact

- Phụ thuộc `repair-agent-runtime` (đã xong) và migration v11 của `add-agent-conversation`; capability
  chat tạo task cần conversation. `add-agent-context-workflow`, `add-agent-steering` và
  `add-translation-task-qa` dựa trên trạng thái và bảng của change này.
- Main: `librarySchema.ts`, repository task, `chapterTranslationRunner.ts`, `callBudget.ts`,
  `writeCoordinator.ts`, `translateRunContext.ts`, `operationReconciler.ts`, đường thoát app trong
  `src/main/index.ts`.
- Shared/preload/IPC: contract task, kênh và sự kiện mới.
- Renderer: `app/screens/jobs`, `modules/workspace/work-detail/workAreas.tsx`.
- Fixture `library-v12.schema.sql`, test backup giữa lúc task chạy, test state machine và fault injection.
