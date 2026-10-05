## 1. Phụ thuộc và hợp đồng dữ liệu

- [x] 1.1 Thêm gói `docx` vào dependencies trong `package.json` và cấu hình build tương thích Electron main process.
- [x] 1.2 Tạo hợp đồng `src/shared/contracts/export.ts` định nghĩa các kiểu xuất (`ExportFormat`, `ExportScope`, `ExportOptions`, `ExportResult`) và đăng ký kênh IPC `export:chapter`, `export:work` trong `channels.ts`.

## 2. Các bộ Formatter tiểu thuyết (Formatters)

- [x] 2.1 Xây dựng `src/main/services/export/formatters/txtFormatter.ts` và test: xuất văn bản thuần UTF-8 không BOM, chuẩn hóa ngắt dòng LF, tiêu đề chương và thông tin sách.
- [x] 2.2 Xây dựng `src/main/services/export/formatters/markdownFormatter.ts` và test: xuất Markdown chuẩn với Heading 1/2, trích dẫn, ảnh và nội dung đoạn.
- [x] 2.3 Xây dựng `src/main/services/export/formatters/docxFormatter.ts` và test: tạo tệp Word `.docx` bằng thư viện `docx` với styles chuẩn novel, ngắt trang giữa các chương, thụt lề đoạn văn.
- [x] 2.4 Xây dựng `src/main/services/export/formatters/pdfFormatter.ts`: sinh HTML template với CSS `@page` chuẩn sách (khổ A5/A4, lề trang, font chữ tiếng Việt, số trang tự động, ngắt trang trước mỗi chương).

## 3. Dịch vụ ExportService và IPC Main Process

- [x] 3.1 Xây dựng `ExportService` trong `src/main/services/export/exportService.ts`: đọc metadata tác phẩm và văn bản chương từ `LibraryStore`, điều phối formatter tương ứng và ghi tệp ra đĩa.
- [x] 3.2 Tích hợp kết xuất PDF thông qua `webContents.printToPDF` của Electron trong tiến trình main.
- [x] 3.3 Xây dựng IPC handler `src/main/ipc/handlers/export.ts` với native save/open dialogs (`dialog.showSaveDialog`, `dialog.showOpenDialog`) hỗ trợ cả xuất 1 chương và xuất cả tác phẩm (gộp hoặc file rời).
- [x] 3.4 Phơi bày các phương thức xuất qua `preload/index.ts` và `src/shared/contracts/desktop-api.ts`.

## 4. Giao diện người dùng (Renderer UI)

- [x] 4.1 Xây dựng modal `ExportDialog.tsx` cho phép người dùng chọn định dạng (TXT, MD, DOCX, PDF), phạm vi (chương hiện tại / toàn bộ), và các tùy chọn novel.
- [x] 4.2 Thêm nút kích hoạt xuất vào thanh công cụ của `ChapterWorkspace.tsx` để xuất nhanh chương đang soạn thảo.
- [x] 4.3 Thêm nút kích hoạt xuất tác phẩm tại màn hình chi tiết truyện `WorkDetailScreen.tsx`.

## 5. Kiểm chứng và hoàn thiện tài liệu

- [x] 5.1 Kiểm chứng round-trip text cho TXT và MD: xuất văn bản rồi nhập lại qua bộ importer để bảo đảm không mất ký tự.
- [x] 5.2 Kiểm tra kết xuất tệp DOCX và PDF trong Electron thật: kiểm tra hiển thị tiếng Việt, ngắt trang và căn lề đoạn văn chuẩn novel ebook.
- [x] 5.3 Cập nhật tài liệu handbook (`current-state.md`, `roadmap.md`, `changelog.md`) cho Module 6.
- [x] 5.4 Chạy `node scripts/check.mjs` bảo đảm toàn bộ typecheck, test, lint và build đều thành công.
