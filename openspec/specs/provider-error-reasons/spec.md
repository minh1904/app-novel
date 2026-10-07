# provider-error-reasons Specification

## Purpose
Phân biệt lỗi do yêu cầu hoặc cấu hình với nội dung bị nhà cung cấp chặn, giữ lý do chặn trên từng đoạn, và để main quyết định mỗi tác vụ xử lý từng loại lỗi thế nào, nhằm cho người dịch và Lab đọc đúng nguyên nhân thất bại.

## Requirements

### Requirement: Yêu cầu không hợp lệ là một loại lỗi riêng

Hệ thống SHALL phân loại phản hồi HTTP 4xx thành **yêu cầu không hợp lệ** (`invalid_request`) khi phản hồi đó không phải lỗi xác thực, lỗi hạn mức hoặc tín dụng, giới hạn tốc độ, hay nội dung bị chặn có bằng chứng. Hệ thống SHALL NOT thử lại yêu cầu không hợp lệ, SHALL NOT chuyển sang khóa khác vì nó, và SHALL NOT đóng băng hay đánh dấu khóa vì nó. Một khóa sai mà Gemini trả về bằng HTTP 400 SHALL vẫn được phân loại là lỗi xác thực như hiện nay.

#### Scenario: Mức thinking bị nhà cung cấp từ chối
- **WHEN** nhà cung cấp trả HTTP 400 "Request contains an invalid argument" cho một yêu cầu có `reasoning_effort`
- **THEN** lỗi được phân loại là yêu cầu không hợp lệ, không phải nội dung bị từ chối
- **AND** không có lần thử lại hay lần đổi khóa nào được thực hiện

#### Scenario: Khóa sai trả 400
- **WHEN** nhà cung cấp trả HTTP 400 với lý do `API_KEY_INVALID` hoặc thông điệp khóa không hợp lệ
- **THEN** lỗi được phân loại là lỗi xác thực và khóa được đánh dấu như hiện nay

#### Scenario: Request quá lớn
- **WHEN** nhà cung cấp trả HTTP 413, hoặc 400 với thông điệp vượt giới hạn token đầu vào
- **THEN** lỗi được phân loại là yêu cầu không hợp lệ, và thông báo nói rõ là request quá lớn

### Requirement: Nội dung bị chặn ở cấp HTTP cần bằng chứng

Hệ thống SHALL chỉ phân loại một phản hồi lỗi HTTP là nội dung bị từ chối (`refused`) khi thân phản hồi có bằng chứng rằng nội dung bị bộ lọc an toàn chặn, ví dụ có lý do chặn hoặc danh mục an toàn. Không có bằng chứng đó thì phản hồi SHALL được phân loại là yêu cầu không hợp lệ.

#### Scenario: 400 không có dấu hiệu bộ lọc
- **WHEN** nhà cung cấp trả HTTP 400 mà thân phản hồi không nhắc tới lý do chặn hay danh mục an toàn nào
- **THEN** lỗi được phân loại là yêu cầu không hợp lệ

#### Scenario: Thân lỗi nêu lý do chặn
- **WHEN** nhà cung cấp trả lỗi 4xx mà thân phản hồi nêu nội dung bị chặn vì an toàn
- **THEN** lỗi được phân loại là nội dung bị từ chối, kèm lý do chặn đọc được

### Requirement: Thông báo lỗi yêu cầu nêu những gì đã gửi

Với lỗi yêu cầu không hợp lệ, thông báo cho người dùng SHALL gồm thông điệp của nhà cung cấp và danh sách các tham số sinh mà Mira đã gửi trong lời gọi đó: mức thinking, nhiệt độ, top-p, giới hạn đầu ra, tên các khóa `extra_body`, và việc có gửi định dạng đầu ra hay không. Thông báo SHALL NOT chứa khóa API hay giá trị header bí mật.

#### Scenario: Báo tham số đã gửi
- **WHEN** một lô dịch thất bại vì yêu cầu không hợp lệ và lời gọi đã gửi mức thinking "off"
- **THEN** thông báo nêu thông điệp của nhà cung cấp và ghi đã gửi `reasoning_effort: none`
- **AND** thông báo gợi ý kiểm tra cài đặt model

### Requirement: Giữ lý do chặn trên từng đoạn bị bộ lọc từ chối

Khi phản hồi kết thúc vì bộ lọc nội dung, hệ thống SHALL đọc lý do chặn từ phản hồi và gán vào một trong bốn nhóm: `prohibited` (`PROHIBITED_CONTENT`), `safety` (`SAFETY`), `recitation` (`RECITATION`), `other` (mọi lý do khác hoặc không có lý do). Hệ thống SHALL giữ cả chuỗi lý do gốc. Kết quả của một lô dịch SHALL ghi nhóm lý do và chuỗi gốc cho từng đoạn còn bị từ chối sau khi đã chia nhỏ và gửi lại.

#### Scenario: Lý do có hậu tố kiểu Gemini
- **WHEN** phản hồi có `finish_reason` là `content_filter: PROHIBITED_CONTENT`
- **THEN** đoạn bị từ chối mang nhóm `prohibited` và chuỗi gốc `PROHIBITED_CONTENT`

#### Scenario: Lý do kiểu OpenAI không có hậu tố
- **WHEN** phản hồi có `finish_reason` là `content_filter` không kèm lý do
- **THEN** đoạn bị từ chối mang nhóm `other`

#### Scenario: Hai đoạn bị chặn vì hai lý do khác nhau
- **WHEN** sau khi chia nhỏ, một đoạn bị chặn vì `SAFETY` và một đoạn khác bị chặn vì `RECITATION`
- **THEN** kết quả lô ghi đúng lý do riêng cho từng đoạn

### Requirement: Thông báo từ chối theo lý do

Thông báo cho người dịch về các đoạn bị từ chối SHALL đếm số đoạn theo từng nhóm lý do. Với nhóm `recitation`, thông báo SHALL nói đây là bộ lọc trích dẫn, không phải vấn đề nội dung. Hệ thống SHALL NOT tự chuyển đoạn bị từ chối sang model khác, và SHALL NOT viết lại, che hay mã hóa bản gốc để gửi lại, ở bất kỳ nhóm lý do nào.

#### Scenario: Thông báo đếm theo lý do
- **WHEN** một chương còn 2 đoạn bị chặn vì `PROHIBITED_CONTENT` và 1 đoạn bị chặn vì `RECITATION`
- **THEN** thông báo cho người dịch nêu 2 đoạn bị chặn theo chính sách nội dung và 1 đoạn bị bộ lọc trích dẫn chặn

#### Scenario: Không tự chuyển model
- **WHEN** một đoạn bị từ chối với bất kỳ lý do nào
- **THEN** đoạn đó để trống, mang cờ từ chối kèm lý do, và không có lời gọi nào tới model khác

### Requirement: Đoạn bị từ chối không dừng lượt dịch chương

Trong một lượt dịch chương, việc một số đoạn của một lô bị bộ lọc từ chối SHALL NOT làm dừng các lô còn lại. Lỗi yêu cầu không hợp lệ, lỗi xác thực, lỗi hạn mức hoặc tín dụng, hết khóa khả dụng, xung đột revision và việc người dùng hủy SHALL dừng lượt như hiện nay. Main SHALL quyết định lỗi của mỗi lô có dừng lượt hay không và gửi quyết định đó kèm kết quả lô. Renderer SHALL làm theo quyết định đó.

#### Scenario: Vài đoạn bị lọc ở lô đầu
- **WHEN** lô thứ nhất của chương có 2 đoạn bị bộ lọc từ chối và các đoạn còn lại dịch được
- **THEN** các lô sau vẫn được dịch
- **AND** khi lượt kết thúc, 2 đoạn đó được liệt kê là bị từ chối kèm lý do

#### Scenario: Lỗi cấu hình dừng lượt
- **WHEN** lô thứ nhất thất bại vì yêu cầu không hợp lệ
- **THEN** lượt dịch dừng và các lô chưa chạy được liệt kê là chưa dịch, kèm thông báo lỗi cấu hình

### Requirement: Chính sách lỗi theo tác vụ

Với mỗi loại lỗi, hệ thống SHALL áp chính sách theo tác vụ đang chạy (dịch chương, chat, kiểm tra kết nối) để quyết định: có thử lại không, người dùng thử lại có ích không, và lượt có dừng không. Chính sách này SHALL nằm ở main. Chat SHALL báo cờ `retryable` theo chính sách, và SHALL NOT gán cứng `refused` cho lỗi gửi yêu cầu. Kiểm tra kết nối SHALL báo yêu cầu không hợp lệ là lỗi cài đặt, kèm thông điệp của nhà cung cấp.

#### Scenario: Chat gặp yêu cầu không hợp lệ
- **WHEN** một lượt chat thất bại vì yêu cầu không hợp lệ
- **THEN** panel hiện lỗi cấu hình với `retryable` là false, không hiện "nhà cung cấp từ chối"

#### Scenario: Lỗi khởi động chat không bị gán nhầm
- **WHEN** lệnh bắt đầu chat bị từ chối trước khi gọi nhà cung cấp, ví dụ vì đầu vào không hợp lệ
- **THEN** panel hiện đúng thông điệp lỗi đó, không gán loại "nội dung bị từ chối"

#### Scenario: Kiểm tra kết nối với tham số sai
- **WHEN** nút Kiểm tra gặp yêu cầu không hợp lệ
- **THEN** kết quả là lỗi cài đặt kèm thông điệp của nhà cung cấp, và không khóa nào bị đánh dấu sai
