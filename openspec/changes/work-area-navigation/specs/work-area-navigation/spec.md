## Purpose

Định nghĩa cách người dùng chuyển giữa các phần việc của cùng một tác phẩm khi Mira bổ sung ngữ cảnh dịch, nguồn raw và tác vụ, đồng thời tránh điều hướng tới những màn chưa có chức năng.

## ADDED Requirements

### Requirement: Cấu trúc khu vực cấp tác phẩm

Màn chi tiết tác phẩm SHALL tổ chức các khu vực theo thứ tự **Chương, Ngữ cảnh, Nguồn, Tác vụ**. Ngữ cảnh SHALL gom các mục con theo thứ tự **Thuật ngữ, Xưng hô, Văn phong**; ba mục này SHALL NOT là tab ngang cấp với Chương. Tên khu vực SHALL phản ánh công việc trong đó: Nguồn dành cho raw của tác phẩm và Tác vụ dành cho công việc dịch.

#### Scenario: Đã có đủ khu vực
- **WHEN** cả bốn khu vực và ba mục con Ngữ cảnh đều có màn làm việc sẵn sàng
- **THEN** người dùng thấy bốn khu vực theo đúng thứ tự và tìm thấy Thuật ngữ, Xưng hô, Văn phong bên trong Ngữ cảnh

### Requirement: Chỉ hiện điều hướng tới chức năng sẵn sàng

Một khu vực hoặc mục con SHALL xuất hiện trong điều hướng chỉ khi phiên bản ứng dụng có màn làm việc thật cho khả năng đó, hoặc khi nó được đăng ký rõ ràng là minh họa "Sắp có" và có mục trong backlog (xem spec `work-detail`, change `work-detail-screen`); minh họa không dẫn tới màn giữ chỗ trống. Không có dữ liệu trong một tác phẩm SHALL được xử lý bằng trạng thái trống và hành động phù hợp bên trong màn đã triển khai, SHALL NOT làm biến mất khu vực. Khi chỉ có Chương, màn SHALL hiển thị nội dung Chương trực tiếp, không có thanh tab một mục hoặc tab vô hiệu dẫn tới màn giữ chỗ. Ngữ cảnh SHALL xuất hiện khi ít nhất một mục con của nó sẵn sàng; các mục con chưa sẵn sàng SHALL không xuất hiện.

#### Scenario: Mốc đầu chỉ có Chương
- **WHEN** phiên bản ứng dụng chỉ có màn quản lý chương và không đăng ký khu vực minh họa nào
- **THEN** người dùng vào tác phẩm thấy danh sách chương trực tiếp và không thấy tab Ngữ cảnh, Nguồn hoặc Tác vụ

#### Scenario: Ngữ cảnh mới có Thuật ngữ
- **WHEN** màn Thuật ngữ đã dùng được nhưng Xưng hô và Văn phong chưa có màn làm việc
- **THEN** Ngữ cảnh xuất hiện với Thuật ngữ và không hiển thị hai mục con còn lại

#### Scenario: Tài nguyên đã hỗ trợ nhưng tác phẩm chưa có dữ liệu
- **WHEN** màn Thuật ngữ đã dùng được và tác phẩm chưa có mục thuật ngữ nào
- **THEN** Thuật ngữ vẫn truy cập được và màn hiển thị trạng thái trống cùng đường thêm mục đầu tiên

### Requirement: Mục con Ngữ cảnh giữ đúng tác phẩm

Khung màn chi tiết, danh mục khu vực, thanh tab cấp một, việc giữ `workId`, mặc định Chương và khả năng dùng bằng bàn phím ở cấp khu vực thuộc spec `work-detail` của change `work-detail-screen`; spec này không lặp lại. Điều hướng cấp hai trong Ngữ cảnh SHALL giữ nguyên tác phẩm hiện tại, mặc định ở mục con sẵn sàng đầu tiên theo thứ tự Thuật ngữ, Xưng hô, Văn phong, và việc chọn mục con SHALL không tự tạo, sửa hoặc xóa dữ liệu.

#### Scenario: Chuyển mục con
- **WHEN** người dùng đang xem Thuật ngữ của tác phẩm A trong Ngữ cảnh và chọn Xưng hô
- **THEN** màn Xưng hô của tác phẩm A mở ra, điều hướng cấp hai đánh dấu Xưng hô, và dữ liệu của tác phẩm B không xuất hiện

### Requirement: Điều hướng cấp hai dùng được bằng bàn phím và ở cửa sổ hẹp

Các mục con đang hiện của Ngữ cảnh SHALL chọn được bằng bàn phím, có tên và trạng thái đang chọn mà công nghệ hỗ trợ nhận biết được, có focus nhìn thấy, và SHALL không buộc cuộn ngang toàn trang ở cửa sổ rộng 940 px.

#### Scenario: Chọn mục Ngữ cảnh bằng bàn phím
- **WHEN** người dùng dùng bàn phím để vào Ngữ cảnh rồi chọn Xưng hô
- **THEN** focus và trạng thái đang chọn được thông báo rõ, màn Xưng hô mở trong đúng tác phẩm
