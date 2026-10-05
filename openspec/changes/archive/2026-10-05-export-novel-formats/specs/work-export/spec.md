## Purpose

Cung cấp khả năng xuất bản dịch của từng chương hoặc toàn bộ tác phẩm ra các định dạng chuẩn tiểu thuyết (TXT, Markdown, DOCX, PDF) phục vụ đọc sách điện tử, lưu trữ và biên tập bản thảo.

## ADDED Requirements

### Requirement: Xuất chương đơn lẻ ra 4 định dạng tiểu thuyết
Hệ thống PHẢI cho phép người dùng xuất bản dịch của chương đang mở ra một trong bốn định dạng: TXT, Markdown (`.md`), Microsoft Word (`.docx`), hoặc PDF (`.pdf`). Tệp xuất ra PHẢI chứa tiêu đề chương và nội dung dịch đã hoàn thiện của chương đó.

#### Scenario: Xuất chương đơn lẻ thành công ra file TXT
- **WHEN** người dùng chọn xuất chương hiện tại dưới định dạng TXT và chọn vị trí lưu tệp
- **THEN** hệ thống tạo tệp `.txt` chứa tiêu đề chương và các đoạn văn bản dịch phân tách bằng ký tự xuống dòng tiêu chuẩn (LF), được mã hóa UTF-8 không có BOM

#### Scenario: Xuất chương đơn lẻ thành công ra file Markdown
- **WHEN** người dùng chọn xuất chương hiện tại dưới định dạng Markdown
- **THEN** hệ thống tạo tệp `.md` chứa tiêu đề chương dạng `# Tiêu đề` cùng nội dung Markdown giữ nguyên các thẻ định dạng văn bản (in nghiêng, in đậm, ảnh nếu có)

#### Scenario: Xuất chương đơn lẻ thành công ra file Word DOCX
- **WHEN** người dùng chọn xuất chương hiện tại dưới định dạng DOCX
- **THEN** hệ thống tạo tệp `.docx` hợp lệ chuẩn OpenXML với tiêu đề chương kiểu Heading 1, các đoạn thân bài có cỡ chữ và thụt đầu dòng hoặc khoảng cách đoạn chuẩn tiểu thuyết

#### Scenario: Xuất chương đơn lẻ thành công ra file PDF
- **WHEN** người dùng chọn xuất chương hiện tại dưới định dạng PDF
- **THEN** hệ thống tạo tệp `.pdf` được định dạng trang in thanh lịch (khổ A5/A4, lề trang, font chữ hiển thị đầy đủ tiếng Việt, số trang chân trang)

---

### Requirement: Xuất nhiều chương hoặc toàn bộ tác phẩm
Hệ thống PHẢI cho phép người dùng xuất nhiều chương đã chọn hoặc tất cả các chương có nội dung của tác phẩm từ màn hình chi tiết tác phẩm.

#### Scenario: Xuất gộp toàn bộ tác phẩm thành một tệp sách điện tử duy nhất
- **WHEN** người dùng chọn xuất tất cả các chương thành một tệp gộp (single file) định dạng PDF hoặc DOCX
- **THEN** hệ thống tạo một tệp duy nhất mở đầu bằng trang thông tin tác phẩm (Tên truyện, Tác giả, Giới thiệu), theo sau là các chương tuần tự, mỗi chương được bắt đầu bằng một ngắt trang (page break)

#### Scenario: Xuất nhiều chương thành các tệp riêng lẻ
- **WHEN** người dùng chọn xuất nhiều chương thành các tệp rời (separate files) vào một thư mục
- **THEN** hệ thống mở hộp thoại chọn thư mục và lưu từng chương thành một tệp riêng với quy tắc đặt tên chuẩn `[Số thứ tự] - [Tên chương].[ext]`

---

### Requirement: Chuẩn trình bày tiểu thuyết (Novel Ebook Formatting)
Các định dạng tài liệu được tạo ra PHẢI tuân thủ quy chuẩn trình bày sách văn học / tiểu thuyết:
- Trang metadata hoặc phần đầu tài liệu thể hiện tên tác phẩm và tên tác giả.
- Mỗi chương có tiêu đề rõ ràng.
- Với DOCX và PDF, giữa các chương PHẢI có ngắt trang bắt buộc (`break-before: page` hoặc section/page break).
- Văn bản thân bài có thụt lề đầu dòng hoặc khoảng cách đoạn đồng nhất, font chữ dễ đọc và hỗ trợ đầy đủ ký tự tiếng Việt có dấu.

#### Scenario: Đảm bảo ngắt trang giữa các chương trong PDF và DOCX
- **WHEN** hệ thống kết xuất tệp PDF hoặc DOCX chứa từ 2 chương trở lên
- **THEN** mỗi chương mới luôn bắt đầu từ đầu một trang mới, không nối tiếp vào cuối trang của chương trước

---

### Requirement: Bảo toàn văn bản nguyên vẹn (Round-trip Text Fidelity)
Với định dạng TXT và Markdown, việc xuất văn bản dịch rồi nhập lại vào hệ thống PHẢI bảo toàn nguyên vẹn nội dung câu chữ, không làm mất ký tự, không thay đổi dấu câu hay sinh ra lỗi mã hóa ký tự.

#### Scenario: Xuất và nhập lại tệp TXT
- **WHEN** người dùng xuất một chương ra tệp `.txt` rồi thực hiện nhập tệp đó vào một chương nguồn
- **THEN** toàn bộ câu chữ, từ ngữ và thứ tự các đoạn văn được bảo tồn chính xác 100%

---

### Requirement: Xử lý an toàn đường dẫn và hủy thao tác
Quá trình xuất tệp PHẢI diễn ra trong tiến trình chính (main process) thông qua hộp thoại hệ thống native (`showSaveDialog` hoặc `showOpenDialog`). Nếu người dùng hủy hộp thoại, hệ thống KHÔNG được báo lỗi hoặc tạo tệp rác.

#### Scenario: Người dùng bấm Hủy trong hộp thoại chọn nơi lưu
- **WHEN** hộp thoại chọn vị trí lưu tệp xuất hiện và người dùng bấm nút Cancel / Hủy
- **THEN** thao tác xuất dừng lại an toàn, không có tệp nào được tạo trên ổ đĩa và giao diện người dùng trở về trạng thái bình thường mà không báo lỗi
