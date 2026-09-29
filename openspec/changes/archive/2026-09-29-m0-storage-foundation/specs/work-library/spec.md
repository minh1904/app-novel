## Purpose

Định nghĩa hành vi của thư viện tác phẩm chạy trên dữ liệu thật: tạo, quản lý và tiếp tục tác phẩm, thay cho dữ liệu mẫu trong bộ nhớ.

## ADDED Requirements

### Requirement: Thư viện phản ánh dữ liệu đã lưu

Thư viện SHALL hiển thị đúng các tác phẩm đã lưu và SHALL NOT hiển thị dữ liệu mẫu ở bản chạy thật. Sau khi đóng và mở lại ứng dụng, danh sách, tên, trạng thái và thời điểm cập nhật SHALL giữ nguyên.

#### Scenario: Mở lại app
- **WHEN** người dùng tạo một tác phẩm rồi đóng và mở lại ứng dụng
- **THEN** tác phẩm vẫn có trong thư viện với cùng thông tin

#### Scenario: Thư viện trống
- **WHEN** chưa có tác phẩm nào
- **THEN** thư viện hiển thị trạng thái trống với một hành động chính là tạo tác phẩm

### Requirement: Tạo tác phẩm

Người dùng SHALL tạo được tác phẩm chỉ với tên và ngôn ngữ nguồn; các thông tin khác (tên gốc, tác giả, thể loại/bối cảnh, mô tả, bìa) là tùy chọn. Thể loại/bối cảnh là văn bản tự do (ví dụ "tiên hiệp, cổ đại") dùng làm ngữ cảnh cho AI ở mốc sau. Hệ thống SHALL từ chối tên rỗng hoặc chỉ gồm khoảng trắng và SHALL báo rõ lý do.

#### Scenario: Tạo thành công
- **WHEN** người dùng nhập tên hợp lệ và chọn ngôn ngữ nguồn
- **THEN** tác phẩm mới xuất hiện trong thư viện ở trạng thái chưa bắt đầu, chưa có chương

#### Scenario: Thông tin tùy chọn
- **WHEN** người dùng nhập thêm tác giả và thể loại có khoảng trắng thừa ở hai đầu
- **THEN** tác phẩm lưu các giá trị đã cắt khoảng trắng và hiển thị chúng trong danh sách; trường để trống được lưu là không có giá trị

#### Scenario: Tên không hợp lệ
- **WHEN** người dùng gửi tên rỗng
- **THEN** không tạo tác phẩm và hiển thị lỗi tại trường tên

### Requirement: Ảnh bìa

Người dùng SHALL thêm ảnh bìa khi tạo tác phẩm hoặc sau đó, đổi ảnh khác, và gỡ ảnh bìa. Hệ thống SHALL nhận các định dạng ảnh phổ biến, thu nhỏ và nén ảnh khi lưu, từ chối tệp không phải ảnh mà không thay đổi tác phẩm, và giữ ảnh bìa sau khi mở lại ứng dụng. Khi có ảnh bìa, nó SHALL hiển thị ở danh sách, thanh bên và khung tiếp tục; khi không có, hệ thống SHALL dùng ký hiệu ngôn ngữ nguồn. Mọi thay đổi ảnh bìa SHALL cập nhật thời điểm sửa đổi của tác phẩm.

#### Scenario: Thêm ảnh bìa khi tạo
- **WHEN** người dùng chọn một ảnh PNG lớn trong form tạo tác phẩm rồi tạo
- **THEN** tác phẩm có ảnh bìa đã thu nhỏ, hiển thị trong danh sách và còn nguyên sau khi mở lại

#### Scenario: Tệp không phải ảnh
- **WHEN** người dùng chọn một tệp văn bản làm ảnh bìa
- **THEN** hệ thống báo lỗi dễ hiểu, không đổi ảnh bìa hiện có và không tạo dữ liệu dở dang

#### Scenario: Đổi và gỡ ảnh bìa
- **WHEN** người dùng chọn "Đổi ảnh bìa" rồi sau đó "Gỡ ảnh bìa" từ menu của tác phẩm
- **THEN** ảnh mới thay ảnh cũ, và sau khi gỡ tác phẩm quay về ký hiệu ngôn ngữ nguồn

### Requirement: Quản lý tác phẩm

Người dùng SHALL đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ tác phẩm. Mỗi thay đổi SHALL cập nhật thời điểm sửa đổi và được lưu bền. Tác phẩm đã lưu trữ SHALL không nằm trong danh sách mặc định nhưng vẫn truy cập được qua mục lưu trữ và SHALL NOT bị xóa dữ liệu.

#### Scenario: Lưu trữ tác phẩm
- **WHEN** người dùng lưu trữ một tác phẩm
- **THEN** tác phẩm rời danh sách mặc định, xuất hiện ở mục lưu trữ, và dữ liệu chương còn nguyên

#### Scenario: Đổi tên rồi mở lại app
- **WHEN** người dùng đổi tên tác phẩm rồi mở lại ứng dụng
- **THEN** tên mới được giữ

### Requirement: Tìm và lọc cơ bản

Thư viện SHALL cho tìm theo tên tác phẩm không phân biệt hoa thường và dấu tiếng Việt, và lọc theo mục Tất cả / Gần đây / Lưu trữ cùng bộ lọc trạng thái (Đang dịch, Tạm dừng, Chưa bắt đầu).

#### Scenario: Tìm không dấu
- **WHEN** người dùng gõ "tien hiep" và có tác phẩm tên "Tiên Hiệp"
- **THEN** tác phẩm đó nằm trong kết quả
