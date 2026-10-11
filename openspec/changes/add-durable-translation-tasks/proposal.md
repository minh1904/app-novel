## Why

Dịch 30 chương không thể là một turn dài hoặc vòng lặp do model điều khiển. Mira cần task lưu bền với item cố định để pause, cancel, retry và phục hồi mà không dịch/ghi lặp phần đã commit.

## What Changes

- Thêm task/item trong library DB, state machine và danh sách chương đã resolve tại lúc tạo.
- Chạy tuần tự qua translation core hiện có; lưu operation/batch và progress sau commit.
- Thêm pause/resume/cancel/retry, budget/usage và startup recovery từ work journal.
- Thay Jobs mock bằng màn Tác vụ thật và tách control task khỏi Stop turn.
- Chưa trích Context, steering, QA hậu dịch hoặc expose MCP.

## Capabilities

### New Capabilities

- `durable-translation-task`: contract cho task dịch dải chương bền, tuần tự, có điều khiển và recovery.

### Modified Capabilities

Không có.

## Impact

- Phụ thuộc `repair-agent-runtime`; tích hợp tạo task từ chat sau `add-agent-conversation`.
- Migration library DB, repository/task runner, startup lifecycle, shared/preload/IPC.
- Translation core, operation journal/reconciler và Jobs UI.
- Schema snapshots, backup fixtures, crash/retry/budget E2E.
