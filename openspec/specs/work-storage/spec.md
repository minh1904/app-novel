# work-storage Specification

## Purpose
Định nghĩa cách Mira lưu bền dữ liệu tác phẩm trên máy: không mất chữ đã báo lưu, chỉ main process được chạm dữ liệu, schema nâng cấp an toàn.
## Requirements
### Requirement: Dữ liệu tác phẩm nằm trong thư mục dữ liệu của ứng dụng

Hệ thống SHALL lưu chỉ mục thư viện và dữ liệu của từng tác phẩm trong thư mục dữ liệu người dùng của ứng dụng, tách biệt từng tác phẩm: dữ liệu của một tác phẩm SHALL nằm trong đúng một tệp riêng của tác phẩm đó.

#### Scenario: Mở app lần đầu
- **WHEN** ứng dụng khởi động và chưa có dữ liệu nào
- **THEN** hệ thống tạo kho rỗng và thư viện hiển thị trạng thái trống, không báo lỗi

#### Scenario: Hai tác phẩm độc lập
- **WHEN** một tệp dữ liệu tác phẩm bị hỏng
- **THEN** các tác phẩm còn lại vẫn mở và sửa được bình thường

### Requirement: Chỉ tiến trình chính được truy cập dữ liệu

Renderer SHALL truy cập dữ liệu chỉ qua API có kiểu mà tiến trình chính cung cấp. Renderer SHALL NOT nhận hoặc gửi đường dẫn tệp tùy ý để đọc/ghi dữ liệu. Tiến trình chính SHALL từ chối yêu cầu từ nguồn không phải cửa sổ chính của ứng dụng.

#### Scenario: Yêu cầu từ nguồn không tin cậy
- **WHEN** một yêu cầu dữ liệu đến từ nguồn không phải cửa sổ chính
- **THEN** yêu cầu bị từ chối và không có dữ liệu nào bị đọc hay ghi

#### Scenario: Đầu vào sai kiểu
- **WHEN** renderer gửi ID không hợp lệ hoặc trường thiếu/thừa
- **THEN** hệ thống trả lỗi xác thực có phân loại và không thay đổi dữ liệu

### Requirement: Chỉ báo đã lưu khi dữ liệu đã bền

Hệ thống SHALL chỉ trả về thành công cho thao tác ghi sau khi dữ liệu đã được ghi bền xuống đĩa. Sau khi ứng dụng bị tắt đột ngột, dữ liệu của mọi thao tác đã báo thành công SHALL còn nguyên và ở trạng thái nhất quán; thao tác đang dở SHALL hoặc hoàn tất trọn vẹn hoặc không để lại dấu vết.

#### Scenario: Đóng cưỡng bức giữa lúc ghi
- **WHEN** tiến trình bị kết thúc đột ngột trong lúc một thao tác ghi đang chạy
- **THEN** lần mở sau thấy dữ liệu đúng như trước thao tác đó hoặc sau thao tác đó, không ở trạng thái nửa vời

#### Scenario: Thao tác ghi thất bại
- **WHEN** ghi thất bại (đĩa đầy, tệp bị khóa)
- **THEN** hệ thống trả lỗi có phân loại, không báo thành công, và dữ liệu trước đó không đổi

### Requirement: Nâng cấp schema an toàn

Mỗi tệp dữ liệu SHALL ghi phiên bản schema. Khi mở tệp có phiên bản thấp hơn, hệ thống SHALL nâng cấp trong một bước nguyên tử. Khi mở tệp có phiên bản cao hơn bản ứng dụng hiểu, hệ thống SHALL từ chối mở và SHALL NOT sửa tệp đó.

#### Scenario: Nâng cấp thành công
- **WHEN** mở tệp tác phẩm có phiên bản schema cũ
- **THEN** tệp được nâng cấp và mọi dữ liệu cũ còn nguyên

#### Scenario: Nâng cấp thất bại
- **WHEN** bước nâng cấp lỗi giữa chừng
- **THEN** tệp giữ nguyên phiên bản cũ, dữ liệu không đổi, và người dùng nhận thông báo lỗi

#### Scenario: Tệp từ phiên bản mới hơn
- **WHEN** mở tệp có phiên bản schema cao hơn bản ứng dụng hỗ trợ
- **THEN** hệ thống từ chối mở, giải thích cần bản Mira mới hơn, và không ghi vào tệp

### Requirement: Không cần mạng

Mọi thao tác lưu, đọc, sao lưu và khôi phục dữ liệu SHALL hoạt động khi không có kết nối mạng.

#### Scenario: Ngoại tuyến
- **WHEN** máy không có mạng
- **THEN** tạo, mở, sửa, sao lưu và khôi phục tác phẩm vẫn thành công

