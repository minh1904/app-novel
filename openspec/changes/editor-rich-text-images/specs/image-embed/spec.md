## Purpose

Cho phép người dùng chèn ảnh minh hoạ vào bản dịch của một chương bằng dán hoặc kéo-thả, lưu ảnh bền trong đúng tệp dữ liệu của tác phẩm, và hiển thị lại đúng ảnh đó mỗi khi mở chương.

## ADDED Requirements

### Requirement: Dán ảnh từ clipboard vào pane bản dịch

Khi clipboard chứa dữ liệu ảnh ở định dạng được chấp nhận (`Requirement: Định dạng ảnh chấp nhận`) và người dùng dán vào pane bản dịch, hệ thống SHALL lưu ảnh và chèn một cú pháp nhúng tại vị trí con trỏ. Khi clipboard không chứa ảnh, thao tác dán SHALL xử lý như dán văn bản thường, không thay đổi hành vi hiện có.

#### Scenario: Dán ảnh hợp lệ
- **WHEN** người dùng chụp màn hình hoặc sao chép một ảnh PNG rồi dán vào giữa một đoạn trong pane bản dịch
- **THEN** ảnh được lưu, một cú pháp nhúng được chèn tại vị trí con trỏ, và ảnh hiện ra ngay trong pane theo đúng hành vi hiển thị của `full-text-editor`

#### Scenario: Dán clipboard không phải ảnh
- **WHEN** clipboard chỉ chứa văn bản và người dùng dán vào pane bản dịch
- **THEN** văn bản được dán như bình thường, không có ảnh nào được tạo hay lưu

### Requirement: Kéo-thả tệp ảnh vào pane bản dịch

Khi người dùng kéo một tệp ảnh ở định dạng được chấp nhận từ ngoài ứng dụng và thả vào pane bản dịch, hệ thống SHALL lưu ảnh và chèn cú pháp nhúng tại vị trí thả. Khi tệp thả không phải định dạng ảnh được chấp nhận, hệ thống SHALL từ chối kèm thông báo rõ lý do và SHALL NOT thay đổi nội dung pane.

#### Scenario: Kéo-thả ảnh hợp lệ
- **WHEN** người dùng kéo một tệp .jpg từ trình quản lý tệp và thả vào giữa một đoạn trong pane bản dịch
- **THEN** ảnh được lưu, cú pháp nhúng được chèn tại đúng vị trí thả, nội dung xung quanh không đổi

#### Scenario: Thả tệp không phải ảnh
- **WHEN** người dùng thả một tệp .docx vào pane bản dịch
- **THEN** hệ thống báo định dạng không được hỗ trợ, không chèn gì vào văn bản, nội dung pane giữ nguyên

### Requirement: Định dạng ảnh chấp nhận

Hệ thống SHALL chỉ chấp nhận ảnh ở định dạng PNG, JPEG, GIF hoặc WebP (theo nội dung tệp thực tế, không chỉ theo đuôi tên). Ảnh ở định dạng khác (bao gồm SVG) SHALL bị từ chối kèm thông báo liệt định dạng được hỗ trợ.

#### Scenario: Từ chối SVG
- **WHEN** người dùng dán hoặc thả một ảnh .svg
- **THEN** hệ thống từ chối kèm thông báo nêu rõ các định dạng được chấp nhận, không lưu gì

### Requirement: Giới hạn kích thước ảnh

Mỗi ảnh sau khi xử lý SHALL không vượt quá 8.000.000 byte và không vượt quá 2000px ở cạnh dài nhất; ảnh vượt kích thước khi chèn SHALL được co nhỏ xuống đúng giới hạn trước khi lưu, giữ nguyên tỉ lệ gốc. Khi ảnh sau khi co vẫn vượt giới hạn dung lượng, hệ thống SHALL từ chối kèm lý do và SHALL NOT lưu phần nào của ảnh.

#### Scenario: Ảnh lớn được co trước khi lưu
- **WHEN** người dùng dán một ảnh PNG cỡ 4000×3000px
- **THEN** ảnh được co xuống cạnh dài nhất 2000px trước khi lưu, tỉ lệ chiều rộng/chiều cao giữ nguyên

### Requirement: Giới hạn số ảnh mỗi tác phẩm

Mỗi tác phẩm SHALL lưu tối đa 200 ảnh nhúng. Khi đã đạt giới hạn, thao tác dán hoặc kéo-thả ảnh mới SHALL bị từ chối kèm thông báo nêu rõ giới hạn và số ảnh hiện có, và SHALL NOT thay đổi nội dung pane.

#### Scenario: Đã đạt giới hạn
- **WHEN** tác phẩm đã có 200 ảnh và người dùng dán thêm một ảnh
- **THEN** hệ thống từ chối kèm thông báo đã đạt giới hạn 200 ảnh, không chèn gì vào văn bản

### Requirement: Lưu ảnh bền trong tệp dữ liệu tác phẩm

Ảnh SHALL lưu trong đúng tệp dữ liệu của tác phẩm chứa chương đó, qua kênh IPC có kiểu do main process xử lý; renderer SHALL NOT đọc hoặc ghi bytes ảnh trực tiếp xuống đĩa. Lưu ảnh SHALL chỉ báo thành công sau khi dữ liệu đã ghi bền, theo đúng quy tắc của `work-storage`. Mọi thao tác dán, kéo-thả, hiển thị, đổi cỡ và xoá ảnh SHALL hoạt động khi máy không có kết nối mạng.

#### Scenario: Ảnh còn nguyên sau khi đóng mở lại
- **WHEN** người dùng chèn một ảnh, lưu chương, đóng và mở lại tác phẩm
- **THEN** ảnh hiện lại đúng như trước, không bị mất hay đổi khác

#### Scenario: Ngoại tuyến
- **WHEN** máy không có mạng
- **THEN** dán, kéo-thả, hiển thị, đổi cỡ và xoá ảnh vẫn thành công bình thường

### Requirement: Đổi cỡ ảnh bằng kéo góc

Khi người dùng kéo góc dưới-phải của một ảnh đang hiển thị trong pane bản dịch, hệ thống SHALL cập nhật chiều rộng hiển thị theo thời gian thực và ghi lại chiều rộng mới vào cú pháp nhúng khi thả chuột, giữ nguyên tỉ lệ gốc của ảnh. Chiều rộng đổi được SHALL giới hạn trong khoảng từ 40px đến chiều rộng khả dụng của pane tại thời điểm đó.

#### Scenario: Kéo góc để thu nhỏ ảnh
- **WHEN** người dùng kéo góc dưới-phải của một ảnh đang hiển thị để thu nhỏ
- **THEN** ảnh thu nhỏ theo thời gian thực, chiều cao tự điều chỉnh theo đúng tỉ lệ gốc, và cú pháp nhúng trong văn bản ghi lại chiều rộng mới khi thả chuột

### Requirement: Xoá ảnh khỏi bản dịch

Người dùng xoá cú pháp nhúng (bằng phím xoá hoặc chọn và xoá như văn bản thường) SHALL làm ảnh biến mất khỏi pane ngay lập tức, giống xoá bất kỳ đoạn văn bản nào khác. Thao tác này SHALL NOT bắt buộc phải xoá ngay bytes ảnh khỏi tệp dữ liệu tác phẩm.

#### Scenario: Xoá dòng chứa ảnh
- **WHEN** người dùng chọn cả dòng chứa một cú pháp nhúng ảnh và nhấn xoá
- **THEN** ảnh không còn hiện trong pane, phần văn bản còn lại không đổi
