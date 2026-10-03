## MODIFIED Requirements

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
