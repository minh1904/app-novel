## 1. Transport spike

- [ ] 1.1 Spike official MCP SDK version với Node/Electron/package manager pinned, stdio shutdown và client interoperability; ghi quyết định dependency bằng test chạy được, không chỉ đọc docs.
- [ ] 1.2 Tạo MCP process + authenticated Named Pipe broker skeleton không import storage; test app open/closed, stdout chỉ protocol và graceful shutdown.

## 2. Identity và read surface

- [ ] 2.1 Thêm pairing/client/grant/revoke bằng SecretStore và work scope; security test read-only, outside-scope, forged actor và revoke fail closed.
- [ ] 2.2 Expose read tools có cursor/revision/size limits qua registry/domain; test chapter dài không cắt im lặng và payload quá limit bị chặn.
- [ ] 2.3 Expose create/get/cancel task, undo/open-target qua cùng services; contract test lỗi/activity/Undo giống IPC và không có direct DB path.

## 3. Claim và submit

- [ ] 3.1 Thêm claim storage/requestKey/TTL/attempt và get-next snapshot; test retry trả cùng claim, một live claim/task, expiry/cấp lại vô hiệu token cũ.
- [ ] 3.2 Thêm submit precondition + structural QA + write coordinator; test stale revision/version, missing/extra/duplicate segment và grant đổi giữa call.
- [ ] 3.3 Thêm idempotency key + payload digest trong journal transaction; fault-injection test timeout sau commit, cùng key khác payload và retry sau claim close.
- [ ] 3.4 Nối report-error/disconnect/waiting_external, pause/cancel/revoke invalidation; test không auto fallback provider và old client result không ảnh hưởng attempt mới.

## 4. UI, bảo mật và gate lát 7

- [ ] 4.1 Nối settings pairing/grants, source label/activity/Jobs controls; test không tạo transcript giả và usage client thiếu hiện unknown.
- [ ] 4.2 Kiểm log redaction/rate/concurrency/payload limits và package artifact; assert không source/translation/token/credential trong log mặc định.
- [ ] 4.3 E2E bằng MCP client thật: pair → read → create external task → claim → submit → open in Mira → Undo, assert zero internal translation-provider calls rồi chạy `node scripts/check.mjs --build`.
