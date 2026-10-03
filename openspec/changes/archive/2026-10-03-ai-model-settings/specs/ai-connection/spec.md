## MODIFIED Requirements

### Requirement: Danh sách model và model mặc định

Người dùng SHALL quản lý một danh sách **mục model** cho mỗi kết nối: thêm, đổi tên, nhân bản, xóa, xếp thứ tự, và đặt một mục làm mặc định. Một mục SHALL thêm được bằng tên model bất kỳ gõ tay, kể cả khi endpoint không liệt kê model; danh sách lấy từ endpoint chỉ là **gợi ý** để thêm nhanh. Hệ thống SHALL hiển thị giới hạn ngữ cảnh và giá của model khi biết, lấy từ một bảng dữ liệu đi kèm bản cài; model không có trong bảng SHALL khai được bằng tay.

#### Scenario: Chọn model từ danh sách lấy được
- **WHEN** kiểm tra kết nối trả về nhiều model
- **THEN** người dùng chọn được một hoặc nhiều model từ danh sách đó để thêm thành các mục, và đặt một mục làm mặc định

#### Scenario: Thêm mục bằng tên không có trong danh sách
- **WHEN** người dùng gõ một tên model mà endpoint không liệt kê
- **THEN** mục được thêm vào danh sách của kết nối và chọn được để dịch hoặc chat như mọi mục khác

#### Scenario: Endpoint không liệt kê model
- **WHEN** kiểm tra kết nối cho biết endpoint nối được nhưng không liệt kê model
- **THEN** người dùng vẫn thêm được mục bằng cách gõ tên và dùng được ngay

#### Scenario: Model không có trong bảng dữ liệu
- **WHEN** người dùng dùng một model không có trong bảng đi kèm
- **THEN** model vẫn dùng được, và chỗ hiện giá nói rõ là chưa biết giá thay vì hiện số không

#### Scenario: Bảng dữ liệu dùng được khi không có mạng
- **WHEN** ứng dụng chạy không có mạng
- **THEN** giới hạn và giá của các model trong bảng vẫn hiển thị được, kèm ngày của bảng dữ liệu
