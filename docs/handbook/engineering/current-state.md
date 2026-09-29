# Hiện trạng triển khai

Kiểm tra code: **2026-09-29** (sau change `m0-storage-foundation`) · Trạng thái: quan sát repository, không phải cam kết tính năng. Cập nhật trang này khi code thay đổi, không dùng roadmap làm bằng chứng đã hoàn thành.

| Lớp | Đang có | Bằng chứng | Chưa có |
| --- | --- | --- | --- |
| Desktop | Electron main/preload, sandbox, context isolation; bridge có kiểu cho tác phẩm và ảnh bìa; lỗi trả dạng dữ liệu; chỉ nhận yêu cầu từ khung chính | [main](../../../src/main/index.ts), [preload](../../../src/preload/index.ts), [IPC](../../../src/main/ipc), [types](../../../src/shared/desktop-api.ts) | IPC cho chương, văn bản, sao lưu |
| UI shell | Sidebar, light/dark, ẩn sidebar, điều hướng trong bộ nhớ | [App](../../../src/renderer/src/App.tsx), [AppShell](../../../src/renderer/src/app/AppShell.tsx) | Routing/editor chương hoàn chỉnh |
| Thư viện | Danh sách tác phẩm đọc từ kho thật: tạo (tên, ngôn ngữ nguồn, tên gốc, tác giả, thể loại/bối cảnh, mô tả, ảnh bìa), đổi tên, tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa, tìm không dấu, thông báo tệp không mở được. Dữ liệu mẫu và khung hoạt động gần đây đã gỡ | [LibraryScreen](../../../src/renderer/src/features/library/LibraryScreen.tsx), [CreateWorkScreen](../../../src/renderer/src/features/library/CreateWorkScreen.tsx), [useLibrary](../../../src/renderer/src/features/library/useLibrary.ts) | Xóa tác phẩm (chưa có trong spec), mở chương, danh sách chương |
| Tạo/mở tác phẩm | Tạo tác phẩm thật. “Mở tác phẩm” và “Tiếp tục” vẫn dẫn tới màn thông báo chưa xây | [PendingScreen](../../../src/renderer/src/app/PendingScreen.tsx), [App](../../../src/renderer/src/App.tsx) | Màn chi tiết truyện, chương (change `work-detail-screen`); mở từ backup |
| Biên tập | Chưa triển khai | [Dependencies và scripts](../../../package.json) | Hai mode, Markdown editor, alignment, undo dữ liệu |
| Thiết kế | Token, font local, component Base UI (màn preview design system đã gỡ ngày 2026-09-29) | [tokens](../../../src/renderer/src/styles/tokens.css), [components](../../../src/renderer/src/components) | Nghiệm thu editor dài/IME/accessibility |
| Lưu và phục hồi | `node:sqlite` trong main process: `library.db` (chỉ mục, dựng lại được) + một tệp `.mira` mỗi tác phẩm, WAL, `synchronous=FULL`, migration theo `user_version` (schema v3, nâng cấp tại chỗ từ v1/v2 đã kiểm chứng trong Electron thật). Test kill tiến trình đang ghi: không mất thay đổi đã xác nhận, không tệp dở. Snapshot đóng băng schema v1–v3 | [storage](../../../src/main/storage), [crash test](../../../src/main/storage/crash.test.ts), [ADR-003](../decisions/0003-technology-stack.md) | Nội dung chương/segment/liên kết (change `content-backup-provider`), autosave, lịch sử, backup/restore. Chưa thử mất điện đột ngột |
| Build | electron-vite; `node:sqlite` và `valibot` là external; bản `--dir` (asar) mở được và tạo dữ liệu; 100 test Vitest; `pnpm smoke:sqlite` kiểm tra `node:sqlite` trong Electron thật | [Build config](../../../electron-builder.yml), [smoke script](../../../scripts/smoke-sqlite.mjs) | Bản NSIS trên máy thử lỗi giải nén `winCodeSign` do thiếu quyền tạo symlink (bật Developer Mode); bản có ký, updater, kiểm thử máy sạch |

Theme scaffold lấy theo hệ thống lúc khởi tạo; chưa lưu lựa chọn. MIR-01 (thư viện → tác phẩm → chương) hoàn thành **một phần**: thư viện và tác phẩm là thật, chương thì chưa.

## Điểm vào cho lần phát triển tiếp

Đọc [roadmap](../delivery/roadmap.md). Việc kế tiếp là change `work-detail-screen` (màn chi tiết truyện và chương), rồi `content-backup-provider`. Điều kiện còn treo cho CodeMirror là thử tay IME tiếng Việt trong Electron 44 ([ADR-003](../decisions/0003-technology-stack.md)).

Sau khi có storage: cập nhật bằng chứng file/API, luồng đã chạy, trường hợp lỗi và giới hạn. Chỉ ghi “đã triển khai” cho đúng phạm vi; build thành công không chứng minh dữ liệu an toàn.

---

[Mục lục handbook](../README.md)
