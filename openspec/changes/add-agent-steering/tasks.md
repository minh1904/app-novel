## 1. Version và command

- [ ] 1.1 Thêm schema instruction version/steering record cùng audit/index; kiểm migration, full materialization/hash và version không bị sửa tại chỗ.
- [ ] 1.2 Thêm resolver requested chapter/item → effective ordinal và command idempotency; test ngoài scope, mơ hồ, cùng key cùng/khác payload.

## 2. Scheduler integration

- [ ] 2.1 Serialize steering/pause/cancel/item-start bằng coordinator + stateVersion; concurrency test xác định đúng bên thắng ở từng ordering.
- [ ] 2.2 Chốt instruction/context version trong transaction `queued → running`; test running/completed item giữ version cũ và item tương lai dùng version mới.
- [ ] 2.3 Thêm workflow pause/decision khi muốn đổi item running; test committed batches không bị xóa hoặc redo ngầm.
- [ ] 2.4 Nối Context steering qua review owner; test pending mapping không xuất hiện trong snapshot item sau trước approval.

## 3. UI và gate lát 5

- [ ] 3.1 Nối chat capability + task timeline/diff/status superseded; test summary map chapter ranges tới version thực tế.
- [ ] 3.2 E2E task 10 items với steering trước/đúng/sau item-start, hai steering cạnh tranh và restart; chạy `node scripts/check.mjs`.
