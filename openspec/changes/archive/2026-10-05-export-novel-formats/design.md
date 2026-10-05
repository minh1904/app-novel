## Context

Mira hiện đã lưu trữ văn bản dịch của chương trong SQLite (`chapter_text`) và hỗ trợ soạn thảo bằng CodeMirror 6 kèm duyệt đề xuất AI (Module 5). Tuy nhiên, ứng dụng chưa có cơ chế xuất bản dịch ra tệp ngoài cho người dùng ngoài thao tác sao chép thủ công.

Theo lộ trình phát triển (Module 6), ứng dụng cần khép kín chu trình 1 chương và hỗ trợ xuất tác phẩm ra các định dạng chuẩn tiểu thuyết: TXT, Markdown (`.md`), Microsoft Word (`.docx`), và PDF (`.pdf`).

## Goals / Non-Goals

**Goals:**
- Cung cấp dịch vụ xuất đa định dạng (TXT, MD, DOCX, PDF) ở `main process`.
- Chuẩn hóa cấu trúc theo định dạng một ebook novel: Trang thông tin (Tên truyện, Tác giả), tiêu đề chương, ngắt trang giữa các chương cho PDF/DOCX, thụt lề/khoảng cách đoạn văn bản đọc truyện dễ chịu.
- Hỗ trợ cả 2 phạm vi: Xuất 1 chương hiện tại (trong Editor) và xuất toàn bộ hoặc nhiều chương của tác phẩm (trong màn Chi tiết tác phẩm).
- Tích hợp an toàn với hệ điều hành thông qua native save/folder dialogs của Electron.
- Đảm bảo kiểm chứng round-trip text cho TXT và MD (xuất ra rồi nhập lại giữ nguyên văn bản).

**Non-Goals:**
- Chưa hỗ trợ biên tập layout chuyên sâu (như kéo thả lề tùy biến theo từng mm, đổi watermark).
- Chưa hỗ trợ định dạng EPUB (sẽ phát triển sau bản đầu theo lộ trình).
- Chưa hỗ trợ xuất song ngữ đối chiếu song song (side-by-side bilingual) trong đợt này.

## Decisions

### 1. Kiến trúc xuất ở Main Process (ExportService)
- **Quyết định:** Toàn bộ logic thu thập văn bản chương, xử lý định dạng và ghi tệp diễn ra tại tiến trình `main`, không chuyển toàn bộ nội dung lớn về `renderer` để lưu.
- **Lý do:** Tránh nghẽn kênh IPC khi xuất toàn bộ tác phẩm dung lượng lớn, và có quyền truy cập trực tiếp hệ thống tệp và native dialogs (`dialog.showSaveDialog`, `dialog.showOpenDialog`).
- **Các bộ Formatter chuyên biệt:**
  - `TxtFormatter`: Xuất văn bản thuần UTF-8 không BOM, chuẩn hóa LF, tiêu đề chương rõ ràng.
  - `MarkdownFormatter`: Xuất Markdown chuẩn với heading và định dạng nguyên bản.
  - `DocxFormatter`: Dùng thư viện `docx` (npm) để tạo tệp Office OpenXML `.docx` với styles chuẩn: Heading 1 cho tên truyện, Heading 2 cho chương, Paragraph indent, và PageBreak giữa các chương.
  - `PdfFormatter`: Dùng `webContents.printToPDF` của Electron in từ một cửa sổ ẩn kết xuất HTML template với CSS `@page` (khổ A5/A4, typography tiểu thuyết thanh lịch, chân trang đánh số trang tự động).

### 2. Định dạng PDF thông qua Electron Native `printToPDF`
- **Quyết định:** Dùng Chromium rendering engine có sẵn trong Electron để in PDF thông qua HTML template tối ưu typography sách, thay vì cài các thư viện PDF cồng kềnh như `pdfkit` hay binary ngoài.
- **Lý do:** Chromium hỗ trợ CSS Paged Media hoàn hảo (`@page`, `break-before: page`, `@bottom-center`), render font chữ tiếng Việt sắc nét và không tăng kích thước bundle của ứng dụng.

### 3. Chuẩn Typography Novel Ebook
- **Bố cục:**
  - Tên tác phẩm: Cỡ chữ lớn, căn giữa trang bìa/đầu sách.
  - Tên tác giả: Đặt dưới tên tác phẩm.
  - Tiêu đề chương: Bắt đầu trang mới (với DOCX và PDF), in đậm rõ ràng.
  - Thân đoạn văn: Thụt lề đầu dòng chuẩn (1.5em) hoặc khoảng cách đoạn (paragraph spacing) thanh thoát, giãn dòng 1.5 - 1.6, căn đều hai bên (justify) để tạo cảm giác đọc sách chuyên nghiệp.

### 4. IPC API và Phân quyền thao tác
- **Kênh IPC:**
  - `export:chapter`: `{ workId, chapterId, format, options }` -> trả về `{ success, filePath?, canceled }`.
  - `export:work`: `{ workId, chapterIds?, format, mode: 'combined' | 'separate', options }` -> trả về `{ success, filePath?, canceled, count }`.

## Risks / Trade-offs

- **[Risk] Dung lượng tệp PDF khi tác phẩm có hàng trăm chương**
  → *Mitigation:* Kết xuất theo batch hoặc hiển thị thông báo tiến trình; `printToPDF` của Chromium rất tối ưu bộ nhớ nếu HTML không chứa ảnh quá nặng chưa nén.
- **[Risk] Font chữ tiếng Việt bị lỗi trên các máy Windows khác nhau khi mở DOCX/PDF**
  → *Mitigation:* Với PDF, font chữ được nhúng trực tiếp vào tệp PDF. Với DOCX, sử dụng các font tiêu chuẩn phổ biến rộng rãi trên Windows và Word (Times New Roman / Arial / Segoe UI / Calibri).
- **[Risk] Xung đột thư viện `docx` với quy chuẩn bundle của electron-vite**
  → *Mitigation:* Thư viện `docx` chạy hoàn toàn trong Node.js main process, được khai báo rõ ràng trong dependencies.
