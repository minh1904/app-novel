## 1. Characterization và contract

- [x] 1.1 Ghi map caller UI/preload/IPC/service/storage và characterization test cho send/cancel/undo hiện tại; chạy test mới để chứng minh ba khoảng trống trước khi sửa.
- [x] 1.2 Thêm `clientCommandId` + payload digest vào contract/repository bằng migration additive; kiểm schema snapshot, migration lặp và retry cùng/khác payload.

## 2. Runtime và điều phối ghi

- [x] 2.1 Compose singleton AgentService/coordinator trong `createServices` và truyền qua HandlerDeps; kiểm IPC integration gọi capability thật thay vì chỉ insert turn.
- [x] 2.2 Đổi send thành durable accept rồi chạy existing turn; kiểm persistence failure không gọi capability và cùng command không nhân turn/operation.
- [x] 2.3 Nối write-intent/flush/ack/lease/revision qua Main; kiểm dirty flush fail, ack timeout, target closed và hai writer tranh target.
- [x] 2.4 Truyền model/settingsKey, AbortSignal và progress qua runner/provider; kiểm settings đúng và progress chỉ tăng sau journal commit.

## 3. Cancel, terminal, Undo và recovery

- [x] 3.1 Nối cancel tới active controller + commit barrier; kiểm kết quả provider muộn không commit và batch đã commit trước acceptance được giữ.
- [x] 3.2 Chuẩn hóa capability error/exception/persistence error và persist terminal trước emit; kiểm mỗi request có đúng một terminal ở mọi exit path.
- [x] 3.3 Nối Undo IPC/capability vào cùng storage restore; kiểm target text/revision được phục hồi thật và sửa tay gây conflict không mất dữ liệu.
- [x] 3.4 Compose startup reconciler; fault-injection test crash trước commit, sau work commit và trước library update, chạy reconcile hai lần không tạo hiệu ứng mới.

## 4. Gate lát 1

- [x] 4.1 Từ renderer thật, dịch một chapter bằng fake provider, xem progress/usage, cancel giữa batch và Undo; lưu bằng chứng test IPC/E2E rồi chạy `node scripts/check.mjs`.
