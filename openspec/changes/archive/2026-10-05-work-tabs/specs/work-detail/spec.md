## MODIFIED Requirements

### Requirement: Khung màn gồm đầu trang tác phẩm và vùng nội dung theo khu vực

Màn chi tiết SHALL gồm hai phần độc lập: đầu trang tác phẩm (breadcrumb, thông tin, hành động của tác phẩm) và vùng nội dung của khu vực đang chọn. Vùng nội dung SHALL lấy các khu vực từ một danh mục có thứ tự mà màn khác có thể đăng ký vào sau này mà không phải sửa đầu trang, điều hướng hay màn Chương. Khi danh mục chỉ có một khu vực, màn SHALL hiển thị khu vực đó trực tiếp, không vẽ thanh tab một mục. Khi danh mục có từ hai khu vực, màn SHALL hiển thị thanh khu vực dạng tab, đánh dấu khu vực đang chọn. Một khu vực chưa có chức năng thật MAY được đăng ký dưới dạng minh họa (xem yêu cầu về tính năng chưa triển khai); khu vực ấy SHALL mang nhãn "Sắp có" ngay trên tab và SHALL NOT dẫn tới màn giữ chỗ trống hay báo lỗi. Mỗi khu vực SHALL nhận `workId` từ khung (không lấy ngầm từ mục thư viện đang chọn); lỗi hay trạng thái tải của một khu vực SHALL không làm hỏng đầu trang hay khu vực khác. Khu vực được chọn SHALL giữ riêng theo tab tác phẩm qua việc chuyển tab và khôi phục phiên. Tác phẩm chưa có tab hoặc tab vừa được tạo SHALL bắt đầu ở Chương. Chọn khu vực không ghi dữ liệu tác phẩm; trạng thái tạm của khu vực như bộ lọc và trang SHALL giữ trong phiên chạy khi tab còn mở.

#### Scenario: Chỉ có Chương
- **WHEN** ứng dụng chỉ đăng ký khu vực Chương
- **THEN** danh sách chương hiện ngay dưới đầu trang và không có thanh tab hay tab vô hiệu

#### Scenario: Có thêm một khu vực
- **WHEN** một khu vực thứ hai được đăng ký vào danh mục
- **THEN** thanh tab xuất hiện với Chương trước, đầu trang không đổi và khu vực mới nhận đúng `workId`

#### Scenario: Khu vực lỗi
- **WHEN** nội dung của một khu vực không tải được
- **THEN** lỗi chỉ hiện trong vùng nội dung của khu vực đó, đầu trang và các khu vực khác vẫn dùng được

#### Scenario: Quay lại tab tác phẩm
- **WHEN** người dùng chọn Ngữ cảnh ở tab A, chuyển sang tab B rồi trở lại tab A
- **THEN** tab A vẫn ở Ngữ cảnh, còn tab B giữ khu vực riêng của mình
