## Why

Sau khi hoàn thành Module 5 (Đề xuất & Phiên AI), Mira đã hỗ trợ đầy đủ luồng dịch từng đoạn và duyệt đề xuất tại chỗ. Tuy nhiên, ứng dụng vẫn thiếu mắt xích cuối cùng để khép kín chu trình dịch một chương và toàn tác phẩm: **xuất bản dịch ra các định dạng chuẩn để đọc, lưu trữ và biên tập** (Module 6 trong lộ trình).

Dịch giả tiểu thuyết/truyện dài cần xuất ra nhiều định dạng tùy mục đích sử dụng:
1. **TXT / Markdown (.md)**: Lưu trữ thuần, tra cứu, đẩy lên kho raw hoặc web novel mà không mất ký tự (round-trip lossless).
2. **DOCX**: Định dạng văn bản tiêu chuẩn cho biên tập viên, nhà xuất bản hoặc nộp bản thảo soát lỗi.
3. **PDF**: Định dạng sách điện tử (novel ebook) dàn trang hoàn chỉnh để đọc trên thiết bị cá nhân hoặc chia sẻ.

## What Changes

- **Thêm dịch vụ xuất (ExportService) trong main process**:
  - Hỗ trợ xuất một chương hoặc gộp nhiều chương của tác phẩm.
  - Hỗ trợ 4 định dạng theo chuẩn novel ebook: TXT, Markdown (`.md`), Microsoft Word (`.docx`), PDF (`.pdf`).
  - Áp dụng cấu trúc tiểu thuyết tiêu chuẩn: Trang tiêu đề/metadata (tên tác phẩm, tác giả, mô tả), mục lục/tiêu đề chương (`Chương N: Tên`), ngắt trang giữa các chương (với DOCX và PDF), thụt lề đầu đoạn (paragraph indentation) hoặc khoảng cách đoạn trang nhã.
  - Sử dụng Electron native `printToPDF` với template HTML/CSS typography dành riêng cho tiểu thuyết để tạo PDF chất lượng cao, không cần công cụ ngoài.
  - Sử dụng thư viện `docx` tạo tệp Word chuẩn OpenXML với heading styles và ngắt trang.
  - Đảm bảo tính toàn vẹn ký tự cho TXT/MD: UTF-8 sạch, chuẩn hóa ngắt dòng, xuất rồi nhập lại giữ nguyên vẹn nội dung (round-trip text fidelity).
- **Thêm IPC channels và Desktop API bridge**:
  - `export:chapter`: Xuất một chương đang mở.
  - `export:work`: Xuất nhiều chương hoặc toàn bộ tác phẩm thành một tệp duy nhất hoặc thư mục tệp riêng lẻ.
  - Sử dụng native `dialog.showSaveDialog` hoặc `dialog.showOpenDialog` để chọn nơi lưu an toàn trong main process.
- **Thêm giao diện người dùng**:
  - Hộp thoại `ExportDialog`: Cho phép chọn định dạng (TXT, MD, DOCX, PDF), phạm vi chương, và các tùy chọn novel (kèm tiêu đề, ngắt trang).
  - Tích hợp nút kích hoạt xuất trên thanh công cụ `ChapterWorkspace` (xuất chương hiện tại) và màn hình `WorkDetailScreen` (xuất tác phẩm).

## Capabilities

### New Capabilities
- `work-export`: Xuất bản dịch tác phẩm và chương ra các định dạng chuẩn novel ebook (TXT, MD, DOCX, PDF) với bố cục trang, typography và ngắt chương tiêu chuẩn.

### Modified Capabilities
<!-- Không có capability nào thay đổi yêu cầu cũ -->

## Impact

- **Phụ thuộc gói mới**: Thêm thư viện `docx` vào dependencies để dựng tệp Word `.docx` thuần trong Electron main process.
- **Main process**:
  - Module mới `src/main/services/export/` gồm các bộ formatter (`txtFormatter`, `markdownFormatter`, `docxFormatter`, `pdfFormatter`) và `exportService`.
  - Handler IPC `src/main/ipc/handlers/export.ts`.
- **Renderer UI**:
  - `ExportDialog` component và tích hợp vào `ChapterWorkspace` và `WorkDetailScreen`.
- **Desktop API**: Cập nhật `src/shared/contracts/desktop-api.ts` và preload bridge cho các phương thức xuất.
