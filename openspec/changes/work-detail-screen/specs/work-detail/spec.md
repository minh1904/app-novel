## Purpose

Định nghĩa màn chi tiết một tác phẩm: nơi xem và sửa thông tin tác phẩm, thấy các chương và đi tiếp vào chương đang làm. Đây là điểm vào của mọi việc dịch thuật trên một tác phẩm.

## ADDED Requirements

### Requirement: Mở màn chi tiết từ thư viện

Người dùng SHALL mở màn chi tiết của một tác phẩm bằng "Mở tác phẩm" ở danh sách, hoặc bằng cách chọn tác phẩm ở mục "Tác phẩm gần đây" của thanh bên. Từ màn chi tiết, người dùng SHALL quay về thư viện bằng liên kết "Thư viện" ở đầu trang. Nếu tác phẩm không còn (bị xóa hoặc tệp không mở được), màn SHALL báo rõ lý do và cho quay về thư viện thay vì hiển thị trống.

#### Scenario: Mở từ danh sách
- **WHEN** người dùng bấm "Mở tác phẩm" trên một hàng của thư viện
- **THEN** màn chi tiết của tác phẩm đó hiện ra với đúng thông tin và danh sách chương

#### Scenario: Tác phẩm không mở được
- **WHEN** tệp tác phẩm bị hỏng hoặc bị xóa ngoài ứng dụng trong lúc màn đang mở
- **THEN** màn hiển thị lý do bằng lời dễ hiểu và có nút về thư viện, không báo lỗi kỹ thuật thô

### Requirement: Hiển thị thông tin tác phẩm

Đầu màn SHALL hiển thị ảnh bìa (hoặc ký hiệu ngôn ngữ nguồn khi không có), tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả, ngôn ngữ nguồn → Việt, trạng thái, số chương và thời điểm sửa gần nhất. Trường tùy chọn để trống SHALL không chiếm chỗ hay hiện nhãn trống. Mô tả dài SHALL được thu gọn và mở rộng được.

#### Scenario: Tác phẩm đầy đủ thông tin
- **WHEN** tác phẩm có đủ tên gốc, tác giả, thể loại, mô tả và bìa
- **THEN** tất cả hiển thị ở đầu màn, đúng nội dung đã nhập

#### Scenario: Tác phẩm tối thiểu
- **WHEN** tác phẩm chỉ có tên và ngôn ngữ nguồn
- **THEN** đầu màn chỉ hiển thị tên, ngôn ngữ, trạng thái và số chương, không có dòng hay nhãn trống

### Requirement: Sửa thông tin tác phẩm

Người dùng SHALL sửa tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả và ảnh bìa từ màn chi tiết, dùng cùng quy tắc kiểm tra như khi tạo. Ngôn ngữ nguồn SHALL hiển thị nhưng không sửa được. Lưu thất bại SHALL giữ nguyên dữ liệu cũ và giữ lại những gì người dùng đã nhập trong form để thử lại. Hủy SHALL không đổi gì.

#### Scenario: Sửa thành công
- **WHEN** người dùng đổi tác giả và thể loại rồi lưu
- **THEN** đầu màn cập nhật ngay, thời điểm sửa đổi mới, và thư viện hiển thị giá trị mới

#### Scenario: Xóa một trường tùy chọn
- **WHEN** người dùng xóa hết nội dung ô tác giả rồi lưu
- **THEN** tác phẩm không còn tác giả và dòng đó biến mất khỏi màn chi tiết và thư viện

#### Scenario: Tên không hợp lệ
- **WHEN** người dùng xóa hết tên rồi lưu
- **THEN** không lưu, form báo lỗi tại trường tên và giữ nguyên các thay đổi khác đã nhập

### Requirement: Tiếp tục chương gần nhất

Hệ thống SHALL ghi nhớ chương làm việc gần nhất của mỗi tác phẩm: đó là chương người dùng mở gần đây nhất. Nút chính "Tiếp tục" ở màn chi tiết và ở thư viện SHALL đưa người dùng tới chương đó. Khi tác phẩm chưa có chương nào, nút chính SHALL là "Thêm chương" và "Tiếp tục" SHALL không hiển thị. Khi chương gần nhất bị xóa, hệ thống SHALL quên nó thay vì trỏ vào chương không tồn tại. Khi người dùng mở chương của một tác phẩm đang ở trạng thái "Chưa bắt đầu", trạng thái SHALL chuyển thành "Đang dịch"; trạng thái "Tạm dừng" SHALL giữ nguyên vì đó là lựa chọn có chủ ý của người dùng.

#### Scenario: Có chương gần nhất
- **WHEN** người dùng đã mở chương 3 rồi quay lại màn chi tiết hoặc thư viện và bấm "Tiếp tục"
- **THEN** ứng dụng mở chương 3

#### Scenario: Mở chương đầu tiên
- **WHEN** người dùng mở một chương của tác phẩm đang ở trạng thái "Chưa bắt đầu"
- **THEN** trạng thái thành "Đang dịch" và khung "Tiếp tục" của thư viện hiển thị tác phẩm này

#### Scenario: Mở chương của tác phẩm tạm dừng
- **WHEN** người dùng mở một chương của tác phẩm đang "Tạm dừng"
- **THEN** chương gần nhất được cập nhật nhưng trạng thái vẫn là "Tạm dừng"

#### Scenario: Chưa có chương
- **WHEN** tác phẩm chưa có chương nào
- **THEN** màn chi tiết hiển thị "Thêm chương" là hành động chính và không có nút "Tiếp tục"

#### Scenario: Chương gần nhất bị xóa
- **WHEN** người dùng xóa chương đang là chương gần nhất
- **THEN** "Tiếp tục" không còn trỏ vào chương đó và không có lỗi

### Requirement: Đổi trạng thái và lưu trữ từ màn chi tiết

Người dùng SHALL tạm dừng/tiếp tục và lưu trữ/bỏ lưu trữ tác phẩm từ màn chi tiết với cùng hành vi như ở thư viện. Tác phẩm đã lưu trữ SHALL vẫn mở và xem được ở màn chi tiết, kèm nhãn "Đã lưu trữ".

#### Scenario: Lưu trữ từ màn chi tiết
- **WHEN** người dùng chọn Lưu trữ trong menu của màn chi tiết
- **THEN** tác phẩm chuyển sang mục Lưu trữ ở thư viện, màn chi tiết hiển thị nhãn "Đã lưu trữ" và các chương vẫn còn nguyên

### Requirement: Màn chi tiết dùng được khi cửa sổ hẹp và khi làm việc bằng bàn phím

Bố cục SHALL không tràn ngang ở chiều rộng cửa sổ tối thiểu của ứng dụng (940 px). Mọi hành động trên màn SHALL thao tác được bằng bàn phím, có thứ tự Tab hợp lý và dấu hiệu focus nhìn thấy được. Thay đổi trạng thái quan trọng (đã lưu, lỗi) SHALL được thông báo cho công nghệ hỗ trợ.

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ ứng dụng ở chiều rộng tối thiểu
- **THEN** đầu màn xếp lại (bìa trên hoặc cạnh thông tin) mà không cuộn ngang

#### Scenario: Chỉ dùng bàn phím
- **WHEN** người dùng chỉ dùng bàn phím để sửa thông tin và thêm chương
- **THEN** hoàn tất được mà không cần chuột
