## Why

Foundation agent có schema, registry, journal và UI nhưng đường runtime chưa nối thật: IPC send chỉ lưu turn, cancel không abort request và Undo không khôi phục nội dung. Đây là blocker dữ liệu và độ tin cậy phải sửa trước mọi tính năng agent mới.

## What Changes

- Compose một AgentService sống theo lifecycle Main và gọi nó từ IPC sau khi turn được lưu bền.
- Truyền model/settings, AbortSignal, progress, usage và lỗi qua toàn bộ đường thực thi.
- Dùng write-intent/flush, revision guard, operation journal và lease hiện có cho mọi ghi.
- Gọi Undo storage thật, reconcile operation bị gián đoạn và chỉ phát terminal event sau persistence.
- Thêm kiểm thử IPC đầu-cuối và fault injection cho một chương; chưa thay regex bằng model/tool loop.

## Capabilities

### New Capabilities

- `agent-runtime-integration`: contract đầu-cuối cho gửi, hủy, stream, operation, usage và Undo của runtime agent hiện có.

### Modified Capabilities

Không sửa spec chuẩn đã archive. Change `app-agent-foundation` là hồ sơ nền chưa nghiệm thu runtime; change này cung cấp gate tích hợp riêng và phải được đối chiếu trước khi archive foundation.

## Impact

- `src/main/services/createServices.ts`, service agent/capability/runner và startup reconciler.
- shared contract, preload, IPC handlers/deps/channels và renderer agent store/adapter.
- library/work storage, backup/schema fixtures và test IPC/E2E.
- Không đổi UI sản phẩm ngoài trạng thái/lỗi thật; không thêm dependency.
