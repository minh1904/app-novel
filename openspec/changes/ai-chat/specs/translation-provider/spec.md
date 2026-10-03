## ADDED Requirements

### Requirement: Lối gọi hội thoại trả về theo dòng

Hệ thống SHALL có một lối gọi thứ hai ra nhà cung cấp, dành cho hội thoại, **tách khỏi** lối gọi dịch theo lô. Lối gọi này SHALL nhận một chuỗi lượt hỏi–đáp và trả nội dung **theo từng phần trong lúc nhận**, không chờ nhận xong. Nó SHALL NOT yêu cầu phản hồi mang segment ID và SHALL NOT bị kiểm tra theo tập ID. Nó SHALL báo lại tên provider, tên model và lượng token đã dùng khi nhà cung cấp cho biết.

#### Scenario: Nội dung về theo từng phần
- **WHEN** gọi lối hội thoại tới một kết nối đang chạy
- **THEN** người gọi nhận được từng phần nội dung trong lúc phản hồi còn đang về, và một mốc kết thúc rõ ràng khi hết

#### Scenario: Lượng token ở phần cuối
- **WHEN** nhà cung cấp báo lượng token đã dùng cho một lượt hội thoại
- **THEN** lượng đó đi kèm phần kết thúc của lượt, với cùng ý nghĩa như ở lối gọi dịch theo lô

#### Scenario: Không áp luật tập ID cho hội thoại
- **WHEN** một phản hồi hội thoại trả về chữ tự do không chứa segment ID nào
- **THEN** đó là phản hồi hợp lệ, không bị coi là lỗi định dạng

### Requirement: Lỗi của lượt hội thoại là một phần của dòng, không phải một lời gọi thất bại

Khi lỗi xảy ra **sau khi** nội dung đã bắt đầu về, lối gọi hội thoại SHALL báo lỗi như một phần của dòng đang chạy, kèm phần nội dung đã nhận được, và SHALL NOT làm mất phần đó. Lỗi SHALL được phân loại theo cùng bảng loại và cùng quy tắc "thử lại được hay không" như lối gọi dịch theo lô.

#### Scenario: Lỗi sau khi đã nhận một phần
- **WHEN** nhà cung cấp báo lỗi giữa lúc nội dung còn đang về
- **THEN** người gọi nhận được phần nội dung đã có cộng một lỗi có phân loại, thay vì chỉ một lỗi trống

#### Scenario: Lỗi trước khi nhận được gì
- **WHEN** nhà cung cấp từ chối ngay từ đầu
- **THEN** lỗi được phân loại như mọi lời gọi khác, và không có phần nội dung nào

### Requirement: Hủy giữa dòng không bị tính là khóa lỗi

Khi một lượt hội thoại bị hủy giữa lúc đang nhận nội dung, hệ thống SHALL kết thúc với loại "bị hủy" và SHALL NOT tính lần dùng đó là một lỗi của khóa. Khóa vừa dùng SHALL NOT bị đóng băng vì một lần hủy.

#### Scenario: Hủy không làm khóa bị đóng băng
- **WHEN** người gọi hủy một lượt hội thoại đang nhận nội dung
- **THEN** lượt đó kết thúc với loại "bị hủy", và khóa vừa dùng vẫn dùng được ngay cho lượt sau

### Requirement: Lối gọi hội thoại dùng chung chọn khóa với lối gọi dịch

Lối gọi hội thoại SHALL lấy khóa bằng **cùng** cơ chế chọn khóa của lối gọi dịch theo lô: cùng thứ tự dùng cạn lần lượt, cùng trạng thái đóng băng, cùng quy tắc báo kết quả một lần dùng. Nó SHALL NOT có kho khóa hay chiến lược chọn riêng. Khi mọi khóa của kết nối đang bị đóng băng, lối gọi này SHALL báo hết hạn mức kèm mốc hồi phục nếu biết.

#### Scenario: Khóa bị đóng băng bởi một lượt dịch
- **WHEN** một lượt dịch theo lô vừa làm một khóa bị đóng băng, rồi một lượt hội thoại bắt đầu
- **THEN** lượt hội thoại không chọn khóa đang bị đóng băng đó

#### Scenario: Cạn mọi khóa
- **WHEN** mọi khóa của kết nối đang bị đóng băng lúc bắt đầu một lượt hội thoại
- **THEN** lượt đó báo hết hạn mức, kèm mốc sớm nhất có khóa hồi phục nếu biết được
