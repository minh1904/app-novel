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

Người dùng SHALL tạo được tác phẩm chỉ với tên và ngôn ngữ nguồn; các thông tin khác (tên gốc, mô tả, bìa) là tùy chọn. Hệ thống SHALL từ chối tên rỗng hoặc chỉ gồm khoảng trắng và SHALL báo rõ lý do.

#### Scenario: Tạo thành công
- **WHEN** người dùng nhập tên hợp lệ và chọn ngôn ngữ nguồn
- **THEN** tác phẩm mới xuất hiện trong thư viện ở trạng thái chưa bắt đầu, chưa có chương

#### Scenario: Tên không hợp lệ
- **WHEN** người dùng gửi tên rỗng
- **THEN** không tạo tác phẩm và hiển thị lỗi tại trường tên

### Requirement: Quản lý tác phẩm

Người dùng SHALL đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ tác phẩm. Mỗi thay đổi SHALL cập nhật thời điểm sửa đổi và được lưu bền. Tác phẩm đã lưu trữ SHALL không nằm trong danh sách mặc định nhưng vẫn truy cập được qua mục lưu trữ và SHALL NOT bị xóa dữ liệu.

#### Scenario: Lưu trữ tác phẩm
- **WHEN** người dùng lưu trữ một tác phẩm
- **THEN** tác phẩm rời danh sách mặc định, xuất hiện ở mục lưu trữ, và dữ liệu chương còn nguyên

#### Scenario: Đổi tên rồi mở lại app
- **WHEN** người dùng đổi tên tác phẩm rồi mở lại ứng dụng
- **THEN** tên mới được giữ

### Requirement: Danh sách chương

Người dùng SHALL thêm chương (tiêu đề tùy chọn), đổi tên chương và sắp xếp lại thứ tự chương. Số thứ tự hiển thị SHALL suy từ vị trí hiện tại, không lưu cứng.

#### Scenario: Thêm chương
- **WHEN** người dùng thêm một chương vào tác phẩm
- **THEN** chương được thêm vào cuối danh sách và lưu bền

#### Scenario: Sắp xếp lại
- **WHEN** người dùng chuyển chương 5 lên trước chương 2
- **THEN** các số thứ tự hiển thị cập nhật theo vị trí mới và thứ tự này được giữ sau khi mở lại

### Requirement: Tiếp tục chương gần nhất

Hệ thống SHALL ghi nhớ chương làm việc gần nhất của mỗi tác phẩm. "Tiếp tục" SHALL đưa người dùng tới chương đó; nếu tác phẩm chưa có chương nào, hành động này SHALL không khả dụng và "Mở tác phẩm" vẫn dùng được.

#### Scenario: Có chương gần nhất
- **WHEN** người dùng chọn Tiếp tục trên tác phẩm đã có chương gần nhất
- **THEN** điều hướng tới chương đó

#### Scenario: Tác phẩm chưa có chương
- **WHEN** tác phẩm chưa có chương
- **THEN** nút Tiếp tục không hiển thị hoặc bị vô hiệu kèm giải thích, Mở tác phẩm vẫn dùng được

### Requirement: Tìm và lọc cơ bản

Thư viện SHALL cho tìm theo tên tác phẩm không phân biệt hoa thường và dấu tiếng Việt, và lọc theo mục Tất cả / Gần đây / Đang dịch / Tạm dừng / Lưu trữ.

#### Scenario: Tìm không dấu
- **WHEN** người dùng gõ "tien hiep" và có tác phẩm tên "Tiên Hiệp"
- **THEN** tác phẩm đó nằm trong kết quả
