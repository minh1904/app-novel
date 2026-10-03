# translation-provider Specification

## Purpose
Định nghĩa hợp đồng chung cho mọi nhà cung cấp dịch (giả lập ở M0, thật ở M2): gửi và nhận bản dịch theo segment ID, lỗi có phân loại, hủy, và một provider giả lập chạy hoàn toàn offline để kiểm thử luồng AI.

## Requirements

### Requirement: Yêu cầu và phản hồi dịch theo segment ID

Một yêu cầu dịch SHALL gồm danh sách segment (ID, văn bản nguồn), ngôn ngữ nguồn và đích, và ngữ cảnh tùy chọn. Phản hồi thành công SHALL trả với mỗi segment ID một bản dịch, kèm định danh provider và model. Ánh xạ kết quả SHALL dựa trên ID, không dựa trên thứ tự.

#### Scenario: Phản hồi đủ ID
- **WHEN** provider trả về kết quả cho mọi ID đã gửi
- **THEN** mỗi bản dịch được gắn đúng segment theo ID kể cả khi thứ tự trả về khác thứ tự gửi

#### Scenario: Phản hồi thiếu hoặc thừa ID
- **WHEN** phản hồi thiếu một ID hoặc chứa ID không có trong yêu cầu
- **THEN** hệ thống coi các ID thiếu là lỗi có thể thử lại, bỏ qua ID thừa, và không gắn bản dịch nào sai segment

### Requirement: Lỗi có phân loại

Provider SHALL báo lỗi theo các loại phân biệt được: giới hạn tốc độ (kèm thời gian chờ nếu có), lỗi mạng, **hết thời hạn**, xác thực, **hết hạn mức tín dụng**, nội dung bị từ chối, phản hồi không hợp lệ, bị hủy. Loại lỗi SHALL cho biết lỗi có nên thử lại hay không: giới hạn tốc độ, lỗi mạng, hết thời hạn và phản hồi không hợp lệ thử lại được; xác thực, hết hạn mức tín dụng, nội dung bị từ chối và bị hủy thì không.

#### Scenario: Giới hạn tốc độ
- **WHEN** provider báo giới hạn tốc độ kèm thời gian chờ
- **THEN** lỗi được phân loại là có thể thử lại và mang thời gian chờ đó

#### Scenario: Lỗi xác thực
- **WHEN** provider báo khóa không hợp lệ
- **THEN** lỗi được phân loại là không thử lại được

#### Scenario: Khóa sai được báo bằng HTTP 400
- **WHEN** nhà cung cấp trả HTTP 400 mà thông điệp hoặc mã chi tiết nói rõ khóa API không hợp lệ hoặc đã hết hạn (Gemini trả đúng như vậy, thân bọc trong một mảng JSON)
- **THEN** lỗi được phân loại là xác thực, không thử lại được, và khóa đó bị đánh dấu sai thay vì tiếp tục được dùng

#### Scenario: Một lỗi 400 khác vẫn là bị từ chối
- **WHEN** nhà cung cấp trả HTTP 400 mà nội dung không nói gì về khóa
- **THEN** lỗi được phân loại là nội dung bị từ chối và khóa không bị đánh dấu

#### Scenario: Hết thời hạn
- **WHEN** endpoint không trả lời trong thời hạn của lượt gọi
- **THEN** lỗi được phân loại là hết thời hạn, thử lại được, và không làm khóa bị đóng băng

#### Scenario: Hết hạn mức tín dụng
- **WHEN** endpoint trả 429 với dấu hiệu hết tín dụng hoặc hết hạn mức thanh toán, không phải giới hạn theo thời gian
- **THEN** lỗi được phân loại là hết hạn mức tín dụng, không thử lại được, và khóa đó không được dùng lại trước mốc cấp lại hạn mức theo ngày

### Requirement: Hủy yêu cầu

Người gọi SHALL hủy được một yêu cầu đang chạy; provider SHALL dừng sớm và trả lỗi loại "bị hủy" mà không trả kết quả một phần được coi là hoàn chỉnh.

#### Scenario: Hủy giữa chừng
- **WHEN** người dùng hủy khi yêu cầu đang chạy
- **THEN** yêu cầu kết thúc với loại "bị hủy" và không segment nào bị ghi bản dịch từ yêu cầu đó

### Requirement: Provider giả lập chạy offline

Hệ thống SHALL có một provider giả lập hoạt động không cần mạng và không cần khóa. Provider này SHALL trả bản dịch xác định được từ văn bản nguồn, cho phép cấu hình độ trễ và các kiểu lỗi (giới hạn tốc độ, lỗi mạng, thiếu ID, ID trùng, xáo thứ tự, phản hồi rỗng), và SHALL ghi rõ trong nguồn gốc bản dịch rằng đó là giả lập.

#### Scenario: Dịch giả lập
- **WHEN** gửi ba segment cho provider giả lập không bật lỗi
- **THEN** trả về ba bản dịch xác định theo đúng ID, nguồn gốc ghi "giả lập"

#### Scenario: Bật lỗi giả lập
- **WHEN** cấu hình provider giả lập trả phản hồi thiếu một ID
- **THEN** người gọi nhận đúng tình huống thiếu ID để kiểm thử xử lý lỗi

### Requirement: Bản dịch giả lập không lẫn với bản dịch thật

Bản dịch do provider giả lập tạo SHALL luôn được đánh dấu là giả lập trong nguồn gốc và SHALL NOT xuất hiện như bản dịch AI thật trong thống kê hoặc xuất bản.

#### Scenario: Nguồn gốc giả lập
- **WHEN** đọc nguồn gốc của segment do provider giả lập tạo
- **THEN** loại nguồn gốc là giả lập và người dùng thấy dấu hiệu này trong giao diện dùng nguồn gốc

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
