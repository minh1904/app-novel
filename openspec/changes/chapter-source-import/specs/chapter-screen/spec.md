## Purpose

Định nghĩa màn của một chương: nơi bản gốc của chương được nhập và xem theo segment. Màn này thay màn giữ chỗ và là chỗ để editor hai mode (mốc sau) mở rộng; ở bước này chưa sửa được văn bản.

## ADDED Requirements

### Requirement: Màn chương nêu rõ chương nào và đường quay về

Màn chương SHALL nêu tên và số thứ tự chương (chương không tên hiển thị "Chương N"), thuộc tác phẩm nào, và SHALL cho quay về màn chi tiết của cùng tác phẩm bằng liên kết trong đường dẫn và bằng nút "Về tác phẩm". Mở chương SHALL không đổi văn bản của chương.

#### Scenario: Quay về tác phẩm
- **WHEN** người dùng đang ở màn chương 7 và bấm "Về tác phẩm"
- **THEN** màn chi tiết của cùng tác phẩm hiện ra, danh sách chương còn nguyên và "Tiếp tục" trỏ vào chương 7

### Requirement: Chương chưa có bản gốc

Khi chương chưa có bản gốc, màn SHALL hiện trạng thái trống giải thích và hai lối nhập ngang hàng: "Dán văn bản" và "Chọn tệp .txt / .md". Hai lối này SHALL mở luồng nhập bản gốc. Màn SHALL không hiện bản dịch hay thao tác dịch chưa có.

#### Scenario: Chương mới
- **WHEN** người dùng mở một chương vừa thêm
- **THEN** màn hiện trạng thái trống với hai lối nhập và không có khung văn bản trống gây hiểu nhầm

### Requirement: Hiển thị bản gốc theo segment

Khi chương có bản gốc, màn SHALL hiển thị số segment, số ký tự và các segment theo thứ tự, mỗi segment một hàng có số thứ tự, ở dạng chỉ đọc; các đoạn khác nhau SHALL phân biệt được bằng khoảng cách. Danh sách SHALL phân trang hoặc hiển thị dần để chương 5.000 segment mở và cuộn không làm giao diện đứng. Văn bản tiếng Trung, Nhật SHALL dùng đúng phông chữ theo ngôn ngữ nguồn của tác phẩm.

#### Scenario: Chương đã nhập
- **WHEN** người dùng mở chương có bản gốc 40 segment
- **THEN** màn hiện "40 segment" và 40 hàng theo thứ tự với đúng nội dung

#### Scenario: Chương rất nhiều segment
- **WHEN** người dùng mở chương có 5.000 segment
- **THEN** màn hiện phần đầu danh sách ngay và các thao tác cuộn, đổi trang không đứng hình

#### Scenario: Phông chữ Nhật
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật
- **THEN** văn bản bản gốc hiển thị bằng phông chữ hợp tiếng Nhật chứ không phải phông tiếng Trung

### Requirement: Thay bản gốc từ màn chương

Khi chương đã có bản gốc, màn SHALL có hành động "Thay bản gốc" mở luồng nhập và áp dụng yêu cầu thay bản gốc của đặc tả nhập liệu. Sau khi nhập hoặc thay thành công, màn SHALL hiển thị ngay bản gốc mới và số segment mới, không cần mở lại chương.

#### Scenario: Nhập xong
- **WHEN** người dùng xác nhận nhập một văn bản vào chương trống
- **THEN** màn chuyển sang hiển thị bản gốc theo segment và danh sách chương của tác phẩm phản ánh chương đã có bản gốc

### Requirement: Màn chương dùng được bằng bàn phím và ở cửa sổ hẹp

Mọi hành động trên màn chương SHALL dùng được bằng bàn phím, có focus nhìn thấy và thông báo trạng thái cho công nghệ hỗ trợ; bố cục SHALL không tràn ngang ở chiều rộng tối thiểu 940 px.

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ ở chiều rộng tối thiểu và chương có segment dài
- **THEN** các hàng xuống dòng trong khung, không cuộn ngang
