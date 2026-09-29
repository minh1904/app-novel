# Hiện trạng triển khai

Kiểm tra code: **2026-09-29** · Trạng thái: quan sát repository, không phải cam kết tính năng. Cập nhật trang này khi code thay đổi, không dùng roadmap làm bằng chứng đã hoàn thành.

| Lớp | Đang có | Bằng chứng | Chưa có |
| --- | --- | --- | --- |
| Desktop | Electron main/preload, sandbox, context isolation, typed bridge lấy thông tin app | [main](../../../src/main/index.ts), [preload](../../../src/preload/index.ts), [types](../../../src/shared/desktop-api.ts) | API lưu tác phẩm, migration database |
| UI shell | Sidebar, light/dark, ẩn sidebar, điều hướng trong bộ nhớ | [App](../../../src/renderer/src/App.tsx), [AppShell](../../../src/renderer/src/app/AppShell.tsx) | Routing/editor chương hoàn chỉnh |
| Thư viện | Danh sách và thao tác trên state trong phiên | [LibraryScreen](../../../src/renderer/src/features/library/LibraryScreen.tsx), [sample data](../../../src/renderer/src/features/library/works.ts) | Persistence; mở lại sẽ về dữ liệu mẫu |
| Tạo/mở tác phẩm | Các đích điều hướng có màn thông báo chưa xây | [PendingScreen](../../../src/renderer/src/app/PendingScreen.tsx), [App](../../../src/renderer/src/App.tsx) | Tạo tác phẩm/chương thực; import backup |
| Biên tập | Chưa triển khai | [Dependencies và scripts](../../../package.json) | Hai mode, Markdown editor, alignment, undo dữ liệu |
| Thiết kế | Token, font local, Base UI, preview component | [tokens](../../../src/renderer/src/styles/tokens.css), [components](../../../src/renderer/src/components), [preview](../../../src/renderer/src/features/design-system/DesignSystemPreview.tsx) | Nghiệm thu editor dài/IME/accessibility |
| Lưu và phục hồi | Chưa có kho tác phẩm | [App state](../../../src/renderer/src/App.tsx) | Autosave nội dung, history, export, backup/restore |
| Build | electron-vite và cấu hình electron-builder NSIS | [Build config](../../../electron-builder.yml) | Bản phát hành có ký, updater, kiểm thử máy sạch |

Theme scaffold lấy theo hệ thống lúc khởi tạo; chưa lưu lựa chọn. Các nút “Mở tác phẩm”, “Tiếp tục dịch” có ý định điều hướng khác nhau nhưng chưa mở editor thực. Màn thư viện mẫu không được mô tả là đã hoàn thành MIR-01.

## Điểm vào cho lần phát triển tiếp

Đọc [roadmap](../delivery/roadmap.md) và làm spike một chương trước. Dữ liệu mẫu ở renderer chỉ để thử UI; không dùng schema `Work` hiện tại làm quyết định database mặc định. CodeMirror, SQLite và virtualization vẫn là đề xuất ở [kiến trúc](architecture.md).

Sau khi có storage: cập nhật bằng chứng file/API, luồng đã chạy, trường hợp lỗi và giới hạn. Chỉ ghi “đã triển khai” cho đúng phạm vi; build thành công không chứng minh dữ liệu an toàn.

---

[Mục lục handbook](../README.md)
