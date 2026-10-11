## Why

Task dài cần nhận điều chỉnh như “từ chương 8 dùng cách xưng hô mới” mà không sửa ngược kết quả hoặc đổi snapshot của item đang chạy. Steering cần điểm hiệu lực và lịch sử riêng thay vì chèn text tùy ý vào loop.

## What Changes

- Lưu phiên bản instruction/Context overlay cùng điểm hiệu lực theo item/chương.
- Áp thay đổi mặc định từ item chưa bắt đầu; item đang chạy giữ snapshot đã chốt.
- Nếu muốn đổi item đang chạy, pause tại ranh giới an toàn và yêu cầu quyết định cho phần đã commit.
- Hiển thị steering đã nhận, đã áp dụng, bị supersede hoặc cần xử lý.
- Không tự dịch lại chương cũ và không triển khai replace-all theo từ khóa.

## Capabilities

### New Capabilities

- `agent-task-steering`: contract điều chỉnh task đang chạy với version và điểm hiệu lực xác định.

### Modified Capabilities

Không có.

## Impact

- Phụ thuộc `add-durable-translation-tasks`; Context-aware steering dùng `add-agent-context-workflow`.
- Task/item schema, scheduler boundary, instruction/context snapshot và activity/UI.
- Test concurrent pause/steer/cancel, revision và chương trước/sau điểm hiệu lực.
