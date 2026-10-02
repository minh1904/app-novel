# translation-provider Specification

## ADDED Requirements

### Requirement: Provider thật tương thích OpenAI

Hệ thống SHALL có một provider gọi endpoint tương thích OpenAI, cài vào cùng hợp đồng với provider giả lập. Provider này SHALL gửi segment kèm ID và SHALL yêu cầu phản hồi trả lại cùng các ID đó. Provider SHALL lấy khóa và địa chỉ từ một kết nối đã khai, và SHALL ghi định danh provider cùng tên model vào phản hồi để lưu làm nguồn gốc.

#### Scenario: Dịch một lô segment qua endpoint thật
- **WHEN** gửi một lô segment tới một kết nối đang chạy
- **THEN** mỗi bản dịch được gắn đúng segment theo ID, và phản hồi mang tên provider cùng tên model đã dùng

#### Scenario: Khóa và địa chỉ lấy từ kết nối
- **WHEN** người dùng đổi địa chỉ hoặc khóa của một kết nối
- **THEN** lần gọi tiếp dùng giá trị mới mà không cần dựng lại provider

### Requirement: Kiểm tra tập ID chạy vô điều kiện

Provider thật SHALL kiểm tra phản hồi theo thứ tự: phân tích được cú pháp, tập ID khớp chính xác với yêu cầu, không có bản dịch rỗng. Việc kiểm tra này SHALL chạy kể cả khi nhà cung cấp khai là có bảo đảm định dạng đầu ra.

#### Scenario: Phản hồi thiếu ID
- **WHEN** phản hồi thiếu một số ID
- **THEN** lỗi được phân loại là có thể thử lại, và lần thử lại SHALL chỉ gửi lại các ID còn thiếu

#### Scenario: Phản hồi có ID trùng
- **WHEN** phản hồi trả cùng một ID hai lần với nội dung khác nhau
- **THEN** hệ thống dùng bản đầu tiên, ghi lại cảnh báo, và không gắn bản dịch nào sai segment

#### Scenario: Phản hồi không phân tích được
- **WHEN** phản hồi không đúng cú pháp đã yêu cầu
- **THEN** lỗi được phân loại là phản hồi không hợp lệ và có thể thử lại

#### Scenario: Bản dịch rỗng
- **WHEN** phản hồi trả một ID với nội dung rỗng
- **THEN** ID đó bị coi như thiếu và nằm trong nhóm gửi lại

### Requirement: Chọn khóa theo thứ tự dùng cạn lần lượt

Khi một kết nối có nhiều khóa, provider SHALL chọn khóa đầu tiên không đang bị đóng băng theo thứ tự người dùng khai. Khi nhà cung cấp báo giới hạn tốc độ, provider SHALL đóng băng khóa đó theo thời gian chờ nhận được rồi chuyển sang khóa tiếp theo trong cùng một yêu cầu, và SHALL NOT trả lỗi ra ngoài khi còn khóa dùng được.

#### Scenario: Chuyển khóa trong cùng một yêu cầu
- **WHEN** khóa đang dùng báo giới hạn tốc độ và còn khóa khác dùng được
- **THEN** provider thử lại cùng yêu cầu đó bằng khóa tiếp theo và trả kết quả như bình thường

#### Scenario: Trần số lần thử lại
- **WHEN** số lần thử lại cho một lô vượt trần đã cấu hình
- **THEN** provider trả lỗi thay vì thử tiếp vô hạn

### Requirement: Phân loại lỗi từ phản hồi của nhà cung cấp

Provider thật SHALL dịch mã lỗi của nhà cung cấp sang các loại lỗi đã có của hợp đồng, kèm thời gian chờ khi nhà cung cấp báo. Lỗi xác thực SHALL được phân loại là không thử lại được; giới hạn tốc độ, lỗi mạng và phản hồi không hợp lệ SHALL được phân loại là thử lại được.

Việc đọc thời gian chờ SHALL NOT phụ thuộc vào một header duy nhất: hệ thống SHALL tìm thời gian chờ và phạm vi hạn mức trong thân phản hồi lỗi khi header không có, và SHALL vẫn phân loại được khi thân lỗi không theo hình dạng nào đã biết.

#### Scenario: Giới hạn tốc độ kèm thời gian chờ trong header
- **WHEN** nhà cung cấp trả mã giới hạn tốc độ kèm thời gian chờ ở header
- **THEN** lỗi mang đúng thời gian chờ đó và được dùng để đóng băng khóa

#### Scenario: Thời gian chờ chỉ có trong thân phản hồi
- **WHEN** nhà cung cấp trả mã giới hạn tốc độ không có header thời gian chờ, nhưng thân phản hồi có
- **THEN** hệ thống đọc được thời gian chờ từ thân và dùng nó để đóng băng khóa

#### Scenario: Thân lỗi không theo hình dạng nào đã biết
- **WHEN** một thành phần trung gian đổi dạng lỗi và làm mất chi tiết của nhà cung cấp
- **THEN** lỗi vẫn được phân loại theo mã trạng thái, không có thời gian chờ, và việc chọn khóa vẫn chạy đúng

#### Scenario: Nội dung bị từ chối
- **WHEN** nhà cung cấp từ chối nội dung của một lô
- **THEN** lỗi được phân loại là bị từ chối và không thử lại, các lô khác của cùng chương vẫn chạy tiếp

### Requirement: Bản dịch thật phân biệt được với bản dịch giả lập

Nguồn gốc của bản dịch SHALL ghi rõ provider thật nào và model nào đã tạo ra nó, và SHALL phân biệt được với bản dịch do provider giả lập tạo.

#### Scenario: Đọc nguồn gốc của bản dịch thật
- **WHEN** đọc nguồn gốc của một segment do provider thật dịch
- **THEN** thấy tên provider, tên model và thời điểm, và không bị đánh dấu là giả lập
