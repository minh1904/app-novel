## Purpose

Thay thanh bên trái của ứng dụng bằng danh sách chương của tác phẩm đang mở khi người dùng đang sửa một chương, để chuyển chương không cần quay lại màn chi tiết tác phẩm.

## ADDED Requirements

### Requirement: Sidebar hiện danh sách chương khi đang mở một chương

Khi màn đang hiện là một chương, thanh bên trái SHALL hiện tên tác phẩm kèm nút quay lại màn chi tiết tác phẩm, và danh sách các chương của tác phẩm đó theo đúng thứ tự hiện có, thay cho điều hướng thư viện (Tất cả tác phẩm/Gần đây/Lưu trữ). Mỗi dòng chương SHALL hiện số thứ tự, tên hiển thị của chương, và một chấm trạng thái phân biệt được ba trạng thái: đã có cả bản gốc và bản dịch, đã có bản gốc nhưng chưa có bản dịch, và chưa có bản gốc. Chương đang mở SHALL được đánh dấu khác với các chương còn lại. Bấm vào một chương khác trong danh sách SHALL mở chương đó theo đúng quy tắc chặn rời khi còn thay đổi chưa lưu đã có của ứng dụng. Khi rời màn chương (quay lại thư viện hoặc màn chi tiết tác phẩm), thanh bên SHALL trở lại điều hướng thư viện như trước.

#### Scenario: Mở một chương
- **WHEN** người dùng mở Chương 3 của một tác phẩm có 5 chương
- **THEN** thanh bên hiện tên tác phẩm, nút quay lại, và 5 chương với Chương 3 được đánh dấu đang mở

#### Scenario: Chuyển chương từ sidebar
- **WHEN** người dùng đang ở Chương 3 và bấm Chương 5 trong sidebar
- **THEN** màn chuyển sang Chương 5, sidebar vẫn hiện danh sách chương với Chương 5 được đánh dấu

#### Scenario: Còn thay đổi chưa lưu
- **WHEN** người dùng đang sửa bản dịch của Chương 3 chưa lưu và bấm Chương 5 trong sidebar
- **THEN** hộp xác nhận rời màn hiện ra trước khi chuyển chương, theo đúng quy tắc chặn rời đã có

#### Scenario: Quay lại thư viện
- **WHEN** người dùng bấm nút quay lại tác phẩm từ màn chương
- **THEN** thanh bên trở lại điều hướng thư viện (Tất cả tác phẩm/Gần đây/Lưu trữ)

#### Scenario: Chấm trạng thái theo chương
- **WHEN** tác phẩm có một chương đã dịch xong, một chương có bản gốc chưa dịch, và một chương chưa có bản gốc
- **THEN** ba chương đó hiện ba chấm trạng thái khác nhau tương ứng
