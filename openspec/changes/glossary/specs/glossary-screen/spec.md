## Purpose

Giao diện quản lý danh mục thuật ngữ cho tác phẩm tại tab Ngữ cảnh, cho phép tìm kiếm, lọc theo trạng thái, tạo mới, chỉnh sửa, duyệt mục và nhập tệp Names.txt trực tiếp từ ứng dụng.

## ADDED Requirements

### Requirement: Hiển thị danh sách thuật ngữ và tìm kiếm lọc

Giao diện Thuật ngữ SHALL thay thế mockup tạm thời trong khu vực Ngữ cảnh, hiển thị bảng danh sách các thuật ngữ của tác phẩm bao gồm từ gốc, bản dịch, alias, trạng thái, và phạm vi chương. Giao diện SHALL cung cấp thanh tìm kiếm theo từ gốc/bản dịch và bộ lọc theo trạng thái (`approved`, `pending`, `rejected`).

#### Scenario: Xem danh sách thuật ngữ
- **WHEN** người dùng mở tab Ngữ cảnh -> Thuật ngữ
- **THEN** thấy danh sách các thuật ngữ đã lưu của tác phẩm kèm các cột thông tin rõ ràng

#### Scenario: Tìm kiếm thuật ngữ
- **WHEN** người dùng gõ từ khóa vào ô tìm kiếm
- **THEN** danh sách lọc tức thì chỉ hiển thị các mục có từ gốc, bản dịch hoặc alias khớp với từ khóa tìm kiếm

### Requirement: Thao tác thêm, sửa, xóa thuật ngữ trên giao diện

Giao diện SHALL cung cấp form tạo mới và chỉnh sửa thuật ngữ tại chỗ hoặc qua hộp thoại/drawer, hỗ trợ nhập từ gốc, bản dịch đích, danh sách alias phân tách bằng dấu phẩy, chọn phạm vi chương, và đánh dấu thuật ngữ cấm.

#### Scenario: Tạo mục thuật ngữ mới
- **WHEN** người dùng điền thông tin vào form tạo và bấm Lưu
- **THEN** mục mới xuất hiện ngay trong danh sách và được cập nhật vào kho dữ liệu

#### Scenario: Xóa mục thuật ngữ
- **WHEN** người dùng chọn hành động Xóa và xác nhận
- **THEN** mục được xóa khỏi cơ sở dữ liệu và biến mất khỏi danh sách hiển thị

### Requirement: Thao tác nhập tệp Names.txt

Giao diện SHALL có nút "Nhập Names.txt", cho phép mở hộp thoại chọn tệp văn bản từ máy tính, xem trước số mục đọc được và xác nhận nhập vào tác phẩm.

#### Scenario: Nhập tệp thành công qua giao diện
- **WHEN** người dùng chọn tệp `Names.txt` và xác nhận nhập
- **THEN** giao diện hiển thị thông báo kết quả (số mục đã thêm, số mục bỏ qua) và làm mới danh sách hiển thị
