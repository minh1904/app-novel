## Purpose

Cho người dịch giữ nhiều tác phẩm đang mở trong một cửa sổ Mira, chuyển nhanh giữa chúng và quay lại đúng vị trí làm việc mà không mất bản sửa chưa lưu hoặc thay đổi vòng đời tác vụ nền.

## ADDED Requirements

### Requirement: Một tab cho mỗi tác phẩm đang mở

Mira SHALL hiển thị tab cấp ứng dụng cho các tác phẩm đang mở, phân biệt bằng định danh tác phẩm. Mở lại tác phẩm đã có tab SHALL chuyển tới tab đó, không tạo bản sao. Tên tab SHALL theo tên tác phẩm hiện hành. Thư viện và Cài đặt SHALL là màn cấp ứng dụng, không tạo tab tác phẩm giả.

#### Scenario: Mở hai truyện
- **WHEN** người dùng mở truyện A rồi mở truyện B từ Thư viện
- **THEN** thanh tab có một tab A và một tab B, và B đang hoạt động

#### Scenario: Mở lại truyện đang có tab
- **WHEN** người dùng chọn mở truyện A từ Thư viện khi tab A đã tồn tại
- **THEN** Mira chuyển tới tab A mà không thêm tab thứ hai cho A

#### Scenario: Đổi tên truyện
- **WHEN** người dùng đổi tên truyện đang mở
- **THEN** nhãn tab của truyện đó cập nhật mà không đổi định danh hay vị trí tab

### Requirement: Mỗi tab giữ vị trí điều hướng riêng

Mỗi tab SHALL ghi nhớ màn chi tiết hoặc chương đang xem và khu vực đã chọn của tác phẩm. Chuyển sang tab khác rồi quay lại SHALL đưa người dùng về đúng vị trí đó. Điều hướng trong một tab SHALL không đổi vị trí của tab khác. Thanh tab tác phẩm SHALL khác với thanh khu vực Chương, Ngữ cảnh, Nguồn, Tác vụ bên trong tác phẩm.

#### Scenario: Hai truyện ở hai chương
- **WHEN** tab A đang ở chương 3 và tab B đang ở chương 8, rồi người dùng chuyển qua lại
- **THEN** mỗi tab trở về đúng chương của mình

#### Scenario: Khu vực riêng của truyện
- **WHEN** tab A đang xem Ngữ cảnh và tab B đang xem Tác vụ
- **THEN** chuyển tab không đưa cả hai về Chương hoặc làm khu vực của tab này ảnh hưởng tab kia

#### Scenario: Về Thư viện
- **WHEN** người dùng về Thư viện khi còn tab tác phẩm đang mở
- **THEN** các tab vẫn hiện và có thể chọn để trở lại vị trí làm việc trước đó

### Requirement: Giữ an toàn bản sửa khi chuyển và đóng tab

Chuyển giữa các tab SHALL giữ nội dung editor chưa lưu của từng tab trong phiên chạy hiện tại. Đóng một tab có bản sửa chưa lưu SHALL yêu cầu người dùng lưu, bỏ thay đổi hoặc ở lại; nếu lưu thất bại, tab và bản sửa SHALL còn nguyên. Thoát ứng dụng SHALL xét mọi tab còn bản sửa chưa lưu trước khi đóng. Khôi phục sau khi mở lại ứng dụng SHALL chỉ dựa trên nội dung đã lưu; Mira SHALL không ngụ ý bản nháp trong bộ nhớ đã được lưu bền.

#### Scenario: Chuyển tab đang sửa dở
- **WHEN** người dùng gõ vào chương của tab A nhưng chưa lưu, chuyển sang B rồi quay lại A
- **THEN** nội dung và lịch sử hoàn tác của editor A vẫn còn trong phiên chạy

#### Scenario: Đóng tab có bản sửa
- **WHEN** người dùng đóng tab A có bản sửa chưa lưu và chọn Ở lại
- **THEN** tab A và bản sửa vẫn còn

#### Scenario: Lưu thất bại khi đóng
- **WHEN** người dùng chọn Lưu rồi đóng nhưng việc lưu thất bại
- **THEN** tab không đóng và nội dung vừa sửa vẫn còn để thử lại

#### Scenario: Nhiều tab có bản sửa khi thoát
- **WHEN** người dùng thoát ứng dụng trong lúc hai tab còn bản sửa chưa lưu
- **THEN** Mira không âm thầm bỏ bản sửa của tab nào và chỉ thoát sau khi mọi bản sửa được xử lý

### Requirement: Khôi phục phiên tab hợp lệ

Mira SHALL lưu danh sách tab, thứ tự, tab hoạt động và vị trí điều hướng của từng tab ở phạm vi ứng dụng. Sau khi mở lại, Mira SHALL khôi phục các tab còn hợp lệ theo cùng thứ tự. Tab trỏ tới tác phẩm không còn SHALL được bỏ qua và báo cho người dùng; chương không còn SHALL đưa tab về màn chi tiết của tác phẩm. Lỗi lưu hoặc đọc trạng thái tab SHALL không cản việc mở Thư viện và dữ liệu tác phẩm.

#### Scenario: Mở lại ứng dụng
- **WHEN** người dùng đóng ứng dụng sau khi đã lưu hết nội dung và mở lại
- **THEN** các tab hợp lệ trở lại theo đúng thứ tự, tab hoạt động và vị trí đã lưu

#### Scenario: Truyện bị xóa ngoài ứng dụng
- **WHEN** một tab đã lưu trỏ tới tác phẩm không còn khi mở lại
- **THEN** Mira bỏ qua tab đó, báo nguyên nhân dễ hiểu và vẫn mở được các tab khác

#### Scenario: Chương bị xóa
- **WHEN** tab đã lưu trỏ tới chương không còn nhưng tác phẩm vẫn tồn tại
- **THEN** tab mở màn chi tiết của tác phẩm thay vì màn lỗi trắng

### Requirement: Thanh tab dùng được khi chật và bằng bàn phím

Thanh tab SHALL cho biết tab đang hoạt động, có tên truyện đọc được qua công nghệ hỗ trợ, có nút đóng riêng và xử lý được số tab vượt chiều rộng cửa sổ mà không che nút điều khiển cửa sổ. Người dùng SHALL chuyển được giữa các tab bằng bàn phím.

#### Scenario: Nhiều truyện trên cửa sổ hẹp
- **WHEN** số tab vượt không gian của thanh trên cùng
- **THEN** người dùng vẫn tới được mọi tab và nút đóng, còn nút thu nhỏ/phóng to/đóng cửa sổ không bị che

#### Scenario: Chuyển bằng bàn phím
- **WHEN** người dùng nhấn Ctrl+Tab hoặc Ctrl+Shift+Tab ngoài một điều khiển đã nhận phím đó
- **THEN** Mira chuyển tới tab tiếp theo hoặc trước đó và thể hiện rõ tab đang hoạt động

### Requirement: Đóng tab không điều khiển tác vụ nền

Đóng hoặc chuyển tab SHALL không tạm dừng, hủy hoặc khởi động lại tác vụ dịch đã giao cho JobRunner. Trạng thái và kết quả tác vụ SHALL gắn với tác phẩm/chương của nó, bất kể tab nào đang được xem.

#### Scenario: Đóng tab khi tác vụ đang chạy
- **WHEN** người dùng đóng tab A trong lúc tác vụ của A đang chạy
- **THEN** tác vụ vẫn tiếp tục theo quy tắc Module 7 và có thể xem lại khi mở A

#### Scenario: Kết quả đến khi xem truyện khác
- **WHEN** kết quả dịch hoặc hội thoại của A đến lúc tab B đang hoạt động
- **THEN** dữ liệu được gắn đúng A và không xuất hiện như nội dung của B
