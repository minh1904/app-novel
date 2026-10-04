# addressing-screen Specification

## Purpose
Cung cấp giao diện trực quan cho người dịch quản lý danh sách nhân vật và xem/chỉnh sửa ma trận quan hệ xưng hô trong khu vực Ngữ cảnh của tác phẩm.

## Requirements

### Requirement: Quản lý danh sách nhân vật trên giao diện

Giao diện người dùng SHALL cung cấp khu vực quản lý nhân vật cho phép xem danh sách, lọc theo tên/bí danh, thêm nhân vật mới, chỉnh sửa thông tin (tên, giới tính, vai vế, danh sách bí danh), và xóa nhân vật.

#### Scenario: Xem danh sách nhân vật của tác phẩm
- **WHEN** người dùng mở tab Xưng hô trong khu vực Ngữ cảnh
- **THEN** giao diện hiển thị danh sách các nhân vật đã tạo kèm thông tin giới tính và vai vế

#### Scenario: Tạo nhân vật mới từ hộp thoại
- **WHEN** người dùng bấm nút "Thêm nhân vật" và điền đầy đủ thông tin vào hộp thoại
- **THEN** nhân vật mới được lưu và xuất hiện ngay lập tức trong danh sách

### Requirement: Xem và chỉnh sửa ma trận quan hệ xưng hô

Giao diện SHALL hiển thị ma trận quan hệ xưng hô đối thoại giữa các nhân vật và cho phép người dùng bấm vào một cặp nhân vật $A \to B$ để xem và chỉnh sửa từ tự xưng, từ gọi đối phương và phạm vi chương.

#### Scenario: Chỉnh sửa xưng hô trực tiếp giữa hai nhân vật
- **WHEN** người dùng chọn ô quan hệ từ nhân vật A đến nhân vật B và nhập từ xưng hô
- **THEN** hệ thống lưu cập nhật quan hệ $A \to B$ và phản ánh trực quan trên bảng ma trận

#### Scenario: Thiết lập nhanh cả hai chiều quan hệ
- **WHEN** người dùng chỉnh sửa trong hộp thoại quan hệ và chọn lưu cả chiều ngược lại phù hợp
- **THEN** cả hai bản ghi $A \to B$ và $B \to A$ được cập nhật đồng thời

### Requirement: Lọc ma trận xưng hô theo chương

Giao diện SHALL cho phép chọn một chương cụ thể để xem các quy ước xưng hô nào đang có hiệu lực tại chương đó.

#### Scenario: Chọn chương để xem xưng hô hiệu lực
- **WHEN** người dùng chọn "Chương 15" trong bộ lọc chương của màn hình
- **THEN** ma trận chỉ hiển thị các quy ước xưng hô có phạm vi bao hàm Chương 15
