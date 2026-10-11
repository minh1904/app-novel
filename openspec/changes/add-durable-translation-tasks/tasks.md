## 1. Persistence và state machine

- [ ] 1.1 Thêm migration `agent_task`/`agent_task_item`, indexes và repository compare-and-set; kiểm schema snapshots, backup/restore DB cũ và migration idempotent.
- [ ] 1.2 Viết state-machine tests cho task/item cùng invalid transitions, stateVersion và terminal immutability.
- [ ] 1.3 Thêm create-task preflight, fixed ordered items và command idempotency; test 30 IDs đúng, chapter thêm sau không vào task, missing raw/overwrite cần xử lý.

## 2. Scheduler và control

- [ ] 2.1 Thêm singleton sequential scheduler với fake executor và deterministic ordering; kiểm tối đa một item active toàn app và wake không busy-poll.
- [ ] 2.2 Nối chapter translation runner với task/item/attempt/batch keys; kiểm progress chỉ chiếu từ committed journal và completed cần đủ batch.
- [ ] 2.3 Thêm Pause/Continue/Cancel barrier; test pause trong commit, cancel khi provider chạy và không commit sau acceptance.
- [ ] 2.4 Thêm Retry chỉ phần chưa commit và attempt mới; test hai batch cũ không bị gọi/ghi lại và cùng batch key khác digest conflict.

## 3. Recovery và budget

- [ ] 3.1 Thêm startup task reconciler sau operation reconcile; fault-injection test ở bốn biên và xác nhận startup không tự gọi provider.
- [ ] 3.2 Nối request identity, usage completeness và budget reservation; test replay không cộng đôi, hard cap dừng trước request, thiếu giá/usage không hiện 0 hoặc tự fallback.

## 4. UI và gate lát 3

- [ ] 4.1 Thay Jobs mock bằng list/detail/control thật và Mở đích; test UI transition hợp lệ, partial 29/30 và Stop turn không cancel task.
- [ ] 4.2 Chạy E2E fixture 30 chapters: pause, close/reopen, Continue, one failure/retry và cancel; assert không batch committed nào chạy lại rồi chạy `node scripts/check.mjs`.
