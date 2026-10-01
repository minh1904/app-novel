## ADDED Requirements

### Requirement: Khung màn thư viện gọn theo nhịp D

Màn thư viện SHALL dựng theo nhịp đã chốt ở màn chương: **một thanh cao 42px** chứa toàn bộ phần trên danh sách — tiêu đề mục đang xem kèm số tác phẩm đang hiện, ô tìm, bộ lọc trạng thái, bộ sắp xếp, và hai nút "Mở tác phẩm có sẵn" / "Tạo tác phẩm". Danh sách SHALL chiếm toàn bộ chiều cao còn lại và tự cuộn; trang SHALL NOT cuộn cả màn.

Ô tìm và hai bộ lọc trên thanh SHALL cao 28px; hai nút trên thanh SHALL cao 28px. Hàng tiêu đề cột SHALL dính ở đầu vùng cuộn.

Một hàng tác phẩm SHALL cao khoảng 48px và SHALL hiện: ảnh bìa cỡ nhỏ nhất, tên tác phẩm (12.5px, một dòng, cắt khi tràn), một dòng phụ 11px gồm cặp ngôn ngữ và — nếu có — tác giả và tên gốc, số chương, chip trạng thái, thời điểm cập nhật, nút "Mở" và menu thao tác. Thể loại và mô tả SHALL NOT nằm trong hàng; chúng đã có ở màn chi tiết tác phẩm.

Panel "Tiếp tục gần đây" SHALL giữ nguyên hành vi: dạng dải trong danh sách khi hẹp, dạng cột bên phải khi rộng từ 1000px.

#### Scenario: Danh sách chiếm hết chiều cao
- **WHEN** người dùng mở thư viện có nhiều tác phẩm
- **THEN** phía trên danh sách chỉ có một thanh 42px, và danh sách cuộn bên trong nó chứ không làm cả trang cuộn

#### Scenario: Hàng không mang thông tin của màn khác
- **WHEN** một tác phẩm có cả tác giả, thể loại và mô tả
- **THEN** hàng hiện tên, cặp ngôn ngữ và tác giả; thể loại và mô tả không hiện trong hàng

### Requirement: Tạo tác phẩm theo hai bước

Màn tạo tác phẩm SHALL chia làm hai bước và SHALL hiện người dùng đang ở bước nào.

- **Bước 1** SHALL chỉ hỏi **Tên tác phẩm** và **Ngôn ngữ gốc**. Bước này SHALL có một hành động tạo ngay ("Tạo và bỏ qua phần còn lại") và một hành động sang bước 2 ("Tiếp tục").
- **Bước 2** SHALL chứa ảnh bìa, tên gốc, tác giả, thể loại/bối cảnh và mô tả; mọi trường ở bước này SHALL bỏ trống được. Bước này SHALL quay lại bước 1 được mà không mất những gì đã nhập.

Chuyển sang bước 2 SHALL kiểm tra tên rỗng trước, và SHALL NOT lưu gì. Một lỗi lưu thuộc về trường của bước 1 SHALL đưa người dùng về bước 1 để sửa. Luật kiểm tra, giới hạn độ dài và cách hiện lỗi theo từng trường SHALL giữ nguyên như requirement "Tạo tác phẩm".

Hộp thoại "Sửa thông tin" SHALL NOT chia bước: nó sửa một tác phẩm đã có, không phải tạo mới.

#### Scenario: Tạo nhanh chỉ với tên
- **WHEN** người dùng nhập tên ở bước 1 rồi bấm "Tạo và bỏ qua phần còn lại"
- **THEN** tác phẩm được tạo với ngôn ngữ gốc đang chọn, không qua bước 2

#### Scenario: Tiếp tục khi tên còn rỗng
- **WHEN** người dùng bấm "Tiếp tục" mà chưa nhập tên
- **THEN** màn ở lại bước 1 và hiện lỗi "Nhập tên tác phẩm." tại trường tên

#### Scenario: Lỗi của bước 1 phát hiện khi lưu
- **WHEN** người dùng đang ở bước 2 và lượt lưu bị từ chối vì tên tác phẩm
- **THEN** màn quay về bước 1 với lỗi hiện tại trường tên, và những gì đã nhập ở bước 2 vẫn còn
