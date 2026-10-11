## Context

Task bền đã cố định items; Context workflow cung cấp snapshot. Steering thêm version tương lai mà không
đổi item đang chạy. Hermes có cơ chế steer giữa tool iterations, nhưng Mira dịch batch có side effect nên
chỉ nhận thay đổi tại boundary do scheduler kiểm soát.

## Goals / Non-Goals

**Goals:** instruction/context versions bền, effective point xác định, concurrency đúng và timeline dễ hiểu.

**Non-Goals:** không inject message tùy ý giữa provider stream, không sửa ngược item completed, không tự
approve Context, không auto-redo.

## Decisions

### Steering là command domain, không là chat message đặc biệt

Chat gọi capability `steer_translation_task`; Jobs detail có form tương đương. Cả hai tạo cùng record:

| Trường | Ý nghĩa |
| --- | --- |
| id / clientCommandId / digest | idempotency |
| taskId / actor / createdAt | audit |
| requestedFromItem / resolvedFromOrdinal | điểm hiệu lực |
| instructionDelta / contextChangeRefs | nội dung thay đổi |
| baseVersion / resultingVersion | optimistic concurrency |
| state / reason | pending, effective, superseded, rejected |

Text chat không trực tiếp chèn vào prompt item đang chạy. Resolver chuyển “từ chương 8” sang item ID
trong scope task và hiển thị lại trước khi commit nếu mơ hồ.

### Version là immutable overlay

Instruction version mới tham chiếu version trước và lưu full effective instruction hoặc deterministic
patch + materialized hash. Chọn full materialized text nếu patch làm replay khó; instruction nhỏ nên ưu
tiên đơn giản. Context change vẫn tạo/duyệt entry ở Context owner; steering version chỉ tham chiếu approved
Context revision/overlay.

Item chốt version trong transaction khi `queued → running`. Sau đó version không đổi cho attempt đó.
Retry cùng attempt/batches dùng snapshot cũ; retry do người dùng muốn version mới là attempt mới có quyết
định rõ về batch cũ.

### Coordinator xác định điểm hiệu lực thực tế

Steering request dùng task `stateVersion`. Trong cùng queue coordinator:

1. kiểm task chưa terminal và target thuộc scope;
2. đọc running item + next queued item;
3. resolve requested point thành earliest eligible item;
4. persist version/steering + increment stateVersion;
5. scheduler chỉ đọc version sau commit.

Nếu requested item đã running, steering ở `needs_user`: đề nghị áp từ next item hoặc pause/resolve current.
Pause current giữ các committed batches. Workflow redo dùng Undo/new attempt của task, không nằm trong
steering transaction.

### Supersede theo field và phạm vi, giữ audit

Version mới materialize toàn instruction nên runtime không cần merge động. UI diff cho biết field/text
thay đổi. Steering sau supersede version trước chỉ cho items chưa start; items đã start vẫn liên kết
version cũ. Không xóa record/version để summary lập được map chapter ranges → version.

### UI và feedback

Khi chat nhận steering, câu trả lời dựa trên record bền: “đã áp dụng từ chương 8”, “chapter 8 đã chạy;
có thể áp từ 9”, hoặc “đang chờ duyệt Context”. Task timeline hiển thị requested/effective point và
first item thực dùng. Không nói “đã cập nhật toàn bộ task” khi chỉ phần tương lai đổi.

## Risks / Trade-offs

- **Steering race item-start** → một coordinator/stateVersion; test barrier ở đúng transaction boundary.
- **Quá nhiều versions** → giữ vì audit; UI collapse, chưa cần compaction.
- **Instruction patch khó replay** → ưu tiên materialized full text + hash.
- **Người dùng kỳ vọng sửa chương cũ** → wording rõ và link workflow redo riêng, không tự hành động.

## Migration Plan

1. Thêm version/steering schema additive và state transition tests.
2. Thêm resolver effective point + command idempotency/concurrency tests.
3. Nối scheduler item-start snapshot.
4. Nối chat capability và Jobs timeline.
5. Gate với task 10 items, steering trước/đúng lúc/sau item-start, restart và hai steering cạnh tranh.

Rollback ngừng nhận steering mới; scheduler tiếp tục với version đã gắn item. Không xóa versions đang được
snapshot/task tham chiếu.

## References

- Hermes `run_busy.py` minh họa queue/steer/stop riêng; Mira chọn boundary bền thay vì chèn mid-stream.
  Xem [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
