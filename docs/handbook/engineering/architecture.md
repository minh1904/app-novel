# Đề xuất công nghệ cho bản Windows offline đầu tiên

Cập nhật: 2026-09-23. Người dùng đã yêu cầu scaffold Electron; Electron + React + TypeScript + Tailwind CSS v4 + Base UI hiện là nền thử nghiệm trong repo. Các lớp editor, lưu trữ và đóng gói bên dưới vẫn là **đề xuất kỹ thuật**, chưa được khóa cho P0. Ràng buộc đã chốt: app Windows trước, biên tập cốt lõi chạy offline, app lưu dữ liệu nội bộ và cho xuất/backup. AI thuộc giai đoạn sau bản đầu.

## Stack đề xuất

| Lớp | Công nghệ | Lý do |
| --- | --- | --- |
| Desktop shell | **Electron** | Một Chromium đóng gói cùng app giúp trải nghiệm editor và hành vi nhập liệu nhất quán trên các bản Windows; có API hệ điều hành cho file, menu, cửa sổ. Tradeoff: bộ cài và RAM lớn hơn Tauri. |
| UI | **React + TypeScript + Tailwind CSS v4 + Base UI** | Xây hai mode trên một mô hình tài liệu; Tailwind giữ token/style, Base UI cung cấp hành vi cho component tương tác dùng chung, TypeScript giữ type cho dữ liệu chương/segment. |
| Build | **electron-vite** | Tách main, preload, renderer và có quy trình phát triển với Vite. |
| Editor toàn văn | **CodeMirror 6 + Markdown extension** | Văn bản dài, transaction/change set, selection và trang trí giao diện phù hợp prototype Markdown/Live Preview. Live Preview kiểu Obsidian là phần phải tự xây, không phải tính năng có sẵn chỉ nhờ cài CodeMirror. |
| Editor từng câu | **React row UI + một editor hoạt động cho hàng đang sửa**; cân nhắc **TanStack Virtual** cho danh sách rất dài | Tránh tạo hàng nghìn editor cùng lúc; giao diện segment Smartcat-inspired dùng cùng nội dung chương. Virtualization cần thử kỹ với chiều cao hàng thay đổi và ô đang focus. |
| Lưu local | **SQLite**, kèm xuất/nhập TXT/Markdown | Một kho dữ liệu app quản lý nội bộ cho project, document, văn bản, phiên bản và metadata căn chỉnh; transaction giúp cập nhật nhất quán. SQLite là đề xuất, chưa chốt một DB toàn thư viện hay một file DB mỗi project. |
| Ranh giới quyền | Electron main/preload + **typed IPC/contextBridge** | Renderer không được truy cập trực tiếp filesystem/database. Bật context isolation, sandbox và tắt Node integration. |
| Đóng gói Windows | **electron-builder** trong scaffold, thử installer NSIS | Có lệnh tạo installer cho người dùng thử. Cơ chế ký app và cập nhật sẽ chốt trước khi phân phối rộng. |

AI thuộc giai đoạn sau P0; lúc đó có thể là adapter riêng gọi dịch vụ khi online. Việc chạy AI offline/chạy model local chưa được chốt. Truy cập internet không được chặn đọc, sửa, lưu, lịch sử, nhập/xuất hoặc backup.

## Vì sao nghiêng Electron thay vì Tauri lúc này?

Tauri cũng dùng web UI với backend Rust và Windows WebView. Nó có thể giảm kích thước đóng gói, nhưng cần thêm bề mặt Rust/WebView vào đội ngũ và phải kiểm tương thích editor thật. Electron có cùng Chromium đóng gói và khớp với kỹ năng React/TypeScript của prototype trước; đây là **suy luận về thời gian giảm rủi ro cho MVP**, không phải khẳng định Tauri không đáp ứng được. Nếu prototype cho thấy chi phí RAM/bộ cài của Electron không chấp nhận được, thử Tauri trên đúng bộ chương mẫu trước khi đổi.

## Mô hình dữ liệu sơ bộ để hai mode dùng chung

- Một chương có bản gốc và bản dịch toàn văn, mỗi bên có phiên bản. Markdown là định dạng soạn/xuất; không lấy “dòng hiển thị” làm ID.
- Mode Từng câu hiển thị các segment được suy ra/duy trì từ cùng văn bản và metadata liên kết 1:1, 1:n, n:1, n:m. Sửa ở một mode phải cập nhật văn bản chung và đánh dấu liên kết chưa chắc cần kiểm tra.
- SQLite giữ phiên bản, ghi chú, từ điển và liên kết; xuất Markdown/TXT giúp người dùng mang bản dịch đi. Quyết định **Markdown là dữ liệu chuẩn hay dạng xuất** vẫn cần prototype.
- Tự động lưu phải có phục hồi sau crash và backup có thể mở độc lập với bản cài. Chưa chốt thời điểm snapshot và định dạng backup.

## Spike phải làm trước khi khóa stack

1. Một chương dài thật: mở và sửa trong CodeMirror toàn văn; chuyển qua bảng segment; đo cuộn, focus, undo, tiếng Việt IME.
2. Sửa/gộp/tách câu ở cả hai mode, lưu, đóng app, mở lại, kiểm tra văn bản và metadata căn chỉnh.
3. Nhập TXT/MD, xuất lại, backup/restore, giả lập mất điện/crash giữa lúc lưu.
4. Tạo bản cài Windows chạy offline trên máy sạch; đo kích thước, RAM và thời gian mở.
5. Kiểm tra IPC, sandbox, CSP, nhập file không đáng tin và quyền ghi file.

## Tài liệu gốc

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [security](https://www.electronjs.org/docs/latest/tutorial/security).
- [Tauri architecture](https://v2.tauri.app/concept/architecture/).
- [electron-vite](https://electron-vite.org/guide/), [electron-builder](https://www.electron.build/).
- [CodeMirror 6 guide](https://codemirror.net/docs/guide/), [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction).
- [SQLite application file format](https://www.sqlite.org/appfileformat.html).

---

[Mục lục handbook](../README.md)
