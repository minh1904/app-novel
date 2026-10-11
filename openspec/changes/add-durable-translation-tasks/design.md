## Context

Translation runner hiện xử lý một chapter và work journal ghi operation/batches. Library DB chưa có task;
Jobs screen là mock. Change này thêm orchestration bền ở Main, không thay translation core.

## Goals / Non-Goals

**Goals:** task dải chapter có scope cố định, scheduler tuần tự, pause/cancel/retry/recovery, budget và UI thật.

**Non-Goals:** không scheduler song song/DAG/cron, Context extraction, steering, QA domain, MCP, chạy khi app đã thoát.

## Decisions

### Data model additive

Library migration thêm tối thiểu:

| Bảng | Trường chính |
| --- | --- |
| `agent_task` | id, kind, originTurnId nullable, commandId+digest unique, workId, state, reason, inferenceSource, model/settings, instructionVersion, budget JSON, usage JSON/completeness, stateVersion, timestamps |
| `agent_task_item` | id, taskId, ordinal unique/task, chapterId, sourceRev, expectedTargetRev, state, reason, attempt, progress, operationId nullable, timestamps |

Không lưu source/translation text trong library DB. Work DB journal/checkpoint tiếp tục sở hữu dữ liệu
commit/Undo. `chapterId` list được materialize thành items để scope không trôi khi library thay đổi.
Không cascade xóa task khi session bị xóa; MVP chưa cung cấp xóa session.

### State machine hữu hạn

Task: `queued → running → pausing → paused`, `running/paused/waiting_user → cancelling → cancelled`,
`running → completed|partially_completed|failed|waiting_user`, và failed/partial → queued khi retry.
Completed/cancelled terminal; chạy lại tạo task mới liên kết source task.

Item: `queued → running → completed|failed|cancelled`; reason phân biệt missing_raw, conflict,
budget, provider. `skipped` là quyết định người dùng có reason riêng, không tính completed. Transition qua
repository method có compare-and-set `stateVersion`, không update tự do từ UI.

### Scheduler tuần tự, wake theo state

Một scheduler thuộc Main chọn task/item ready theo `(createdAt,id)`. Chỉ một item translation active toàn
app để tránh tranh provider/write và giữ MVP dễ phục hồi. Scheduler không giữ interval bận; được wake khi
task tạo/resume/retry và sau item terminal. Khi app đóng, abort và persist interrupted/recovered intent.

Mỗi item gọi runner hiện có, nhưng operation/batch key gồm taskId/itemId/attempt/batch ordinal. Progress
chỉ chiếu từ committed journal. Không dùng một model call bao trùm 30 chapter.

### Control là command bền

Pause/cancel/retry có commandId và compare stateVersion. Pause đặt `pausing`; runner dừng trước request/batch
mới rồi scheduler ghi paused. Cancel đặt `cancelling`, abort active request, invalidate future commit và
ghi cancelled sau coordinator barrier. Retry tăng attempt cho phần chưa commit; không reset journal cũ.

### Startup recovery fail-safe

Sau migrations và operation reconcile, task reconciler đọc non-terminal tasks và work journal:

- cancelling → hoàn tất cancelled sau khi không còn active process;
- running/pausing → paused với reason `recovered_after_restart` trừ khi evidence đủ completed;
- item có committed batches → phục hồi progress/operation link;
- source/target revision không còn khớp → waiting_user/conflict.

Không auto-resume hoặc gọi provider khi app mở. LangGraph cho thấy resume có thể chạy lại bước dang dở;
vì vậy mọi request/batch có key/digest và kết quả commit được tra trước khi thực thi lại.

### Budget reservation

Task budget hỗ trợ hard max calls/tokens và cost chỉ khi catalog + usage/provider cap đủ để tính upper
bound. Trước mỗi provider call, reserve giới hạn xấu nhất; sau response thay bằng usage thật. Request ID
unique ngăn cộng usage hai lần. Provider không báo usage làm completeness false; nếu hard cost cap không
thể chứng minh, dừng waiting_user thay vì đoán.

### UI Tác vụ đọc snapshot thật

Thay `JobsScreenMock` bằng module agent task surface. List phân trang/filter state, detail có items,
progress, source/model, usage, error và control theo transition. Không hiển thị ETA/speed nếu chưa có dữ
liệu đo; không giữ số mock. Mở đích dùng app navigation callback và target ID.

## Risks / Trade-offs

- **Một worker chậm** → chấp nhận throughput thấp để có recovery đúng; song song là change sau khi đo.
- **Provider call đã tính tiền trước crash** → idempotency ngăn ghi lặp nhưng không đảm bảo không gọi lại; require user Continue và hiện usage unknown.
- **Hai DB lệch** → journal work DB thắng; library là projection có thể reconcile.
- **Schema task phình** → JSON chỉ cho budget/usage ít truy vấn; state/identity/progress quan trọng dùng cột/index.

## Migration Plan

1. Thêm migration + schema snapshot/backup fixtures, repository/state-machine tests.
2. Thêm scheduler với fake item executor, control/recovery/fault-injection.
3. Nối chapter runner và operation journal; gate 3 chapters trước fixture 30 chapters.
4. Nối create task từ capability/chat và Jobs UI.
5. Chạy fixture crash ở trước request, sau response, trong commit và giữa hai DB.

Rollback dừng scheduler và giữ bảng/task read-only. Không xóa result đã commit; app có thể tiếp tục mở
chapter/Undo operation độc lập.

## References

- LangGraph persistence/idempotency và Mira journal: xem
  [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
