# ai-connection Specification

## Purpose
Khai báo, kiểm tra và lưu kết nối tới nhà cung cấp AI cho toàn ứng dụng: địa chỉ endpoint tương thích OpenAI, nhiều khóa API cho một kết nối, danh sách model dùng được và model mặc định, và bảng giá để ước lượng chi phí. Lát cắt đầu phục vụ hai ca: một gateway do người dùng tự dựng và API key Google Gemini.

## Requirements

### Requirement: Khai báo kết nối tương thích OpenAI

Hệ thống SHALL cho khai một hoặc nhiều kết nối, mỗi kết nối gồm tên do người dùng đặt, một địa chỉ URL gốc, không hoặc nhiều khóa API, và trạng thái bật/tắt. Mọi kết nối SHALL đi qua cùng một adapter tương thích OpenAI; SHALL NOT có mã xử lý riêng theo từng nhà cung cấp. Hệ thống SHALL cung cấp giá trị URL điền sẵn cho gateway tự dựng và cho Google Gemini, và SHALL cho nhập URL tự do.

#### Scenario: Khai kết nối tới gateway chạy local
- **WHEN** người dùng khai một kết nối với URL `http://127.0.0.1:8317/v1` và để trống khóa
- **THEN** kết nối được lưu và dùng được, không có thông báo bắt buộc phải nhập khóa

#### Scenario: Khai kết nối tới Google Gemini bằng API key
- **WHEN** người dùng chọn preset Google Gemini và dán một API key
- **THEN** URL được điền sẵn tới endpoint tương thích OpenAI của Gemini và kết nối lưu được với khóa đó

#### Scenario: Giao diện không nêu tên công cụ proxy
- **WHEN** người dùng xem danh sách preset
- **THEN** không có preset nào đặt tên theo một công cụ CLI thuê bao, và không có luồng đăng nhập OAuth nào

### Requirement: Kiểm tra kết nối bằng một request rẻ

Hệ thống SHALL kiểm tra một kết nối bằng cách gọi `GET {URL gốc}/models` chứ SHALL NOT gửi một yêu cầu sinh văn bản. Kết quả kiểm tra SHALL vừa xác nhận kết nối vừa nạp danh sách model mà endpoint báo. Lỗi SHALL được phân loại và hiển thị cạnh ô dữ liệu gây ra lỗi đó.

#### Scenario: Kiểm tra thành công
- **WHEN** người dùng bấm kiểm tra và endpoint trả danh sách model
- **THEN** kết nối hiện trạng thái đang chạy, số model lấy được, thời điểm kiểm tra, và danh sách model sẵn để chọn

#### Scenario: Khóa không hợp lệ
- **WHEN** endpoint trả lỗi xác thực
- **THEN** lỗi được phân loại là không thử lại được và thông báo hiện cạnh ô khóa, không cạnh ô URL

#### Scenario: Không nối được tới địa chỉ local
- **WHEN** URL trỏ tới `127.0.0.1` và không có gì trả lời
- **THEN** lỗi được phân loại là lỗi mạng, hiện cạnh ô URL, kèm gợi ý rằng tiến trình ở địa chỉ đó có thể chưa chạy

#### Scenario: Endpoint không liệt kê được model
- **WHEN** endpoint trả lỗi cho `GET /models` nhưng vẫn nhận yêu cầu sinh văn bản
- **THEN** hệ thống báo nối được nhưng không liệt kê được model, cho người dùng khai tên model bằng tay, và SHALL NOT coi đây là lỗi kết nối

### Requirement: Nhiều khóa cho một kết nối với chiến lược dùng cạn lần lượt

Một kết nối SHALL nhận nhiều khóa API, mỗi khóa là một mục riêng có trạng thái riêng. Khi gọi nhà cung cấp, hệ thống SHALL chọn khóa đầu tiên không đang bị đóng băng theo thứ tự người dùng khai — dùng cạn khóa trước rồi mới sang khóa sau. Chiến lược này SHALL là cố định; hệ thống SHALL NOT cho người dùng chọn chiến lược khác.

#### Scenario: Khóa đầu hết hạn mức giữa lúc đang dùng
- **WHEN** nhà cung cấp báo giới hạn tốc độ cho khóa đang dùng và kết nối còn khóa khác chưa bị đóng băng
- **THEN** khóa đó bị đóng băng theo thời gian chờ nhà cung cấp báo, lần gọi tiếp dùng khóa sau, và công việc đang chạy không dừng

#### Scenario: Mọi khóa đều bị đóng băng
- **WHEN** tất cả khóa của kết nối đang bị đóng băng
- **THEN** hệ thống báo lỗi giới hạn tốc độ ở cấp kết nối kèm thời điểm khóa sớm nhất hồi phục

#### Scenario: Một khóa sai
- **WHEN** một khóa trả lỗi xác thực
- **THEN** khóa đó được đánh dấu là sai và bị bỏ qua trong lần gọi tiếp, SHALL NOT bị đóng băng theo thời gian, và các khóa còn lại vẫn dùng được

#### Scenario: Trạng thái từng khóa nhìn thấy được
- **WHEN** người dùng mở màn kết nối sau khi một khóa bị đóng băng
- **THEN** đúng khóa đó hiện trạng thái hết hạn mức và thời gian còn lại, các khóa khác hiện trạng thái bình thường

### Requirement: Phân biệt hết hạn mức theo phút và cạn quota theo ngày

Khi nhà cung cấp báo giới hạn tốc độ, hệ thống SHALL phân biệt hai loại: chạm giới hạn trong thời gian ngắn, và cạn hạn mức theo ngày. Khóa cạn hạn mức theo ngày SHALL được đóng băng tới mốc hạn mức được cấp lại, SHALL NOT chỉ đóng băng theo thời gian chờ ngắn mà nhà cung cấp trả về. Khi không phân biệt được, hệ thống SHALL dùng mức đóng băng ngắn và SHALL tăng dần mức đó nếu cùng một khóa tiếp tục báo lỗi như vậy.

#### Scenario: Chạm giới hạn theo phút
- **WHEN** nhà cung cấp báo giới hạn tốc độ kèm thời gian chờ ngắn và không có dấu hiệu cạn hạn mức theo ngày
- **THEN** khóa đó bị đóng băng đúng khoảng thời gian chờ nhận được rồi dùng lại được

#### Scenario: Cạn hạn mức theo ngày
- **WHEN** phản hồi lỗi cho biết hạn mức theo ngày của khóa đã cạn
- **THEN** khóa đó bị đóng băng tới mốc được cấp lại, và giao diện nói rõ là hết hạn mức theo ngày chứ không phải chờ vài giây

#### Scenario: Không phân biệt được loại
- **WHEN** phản hồi lỗi không đủ thông tin để biết là theo phút hay theo ngày
- **THEN** khóa bị đóng băng ở mức ngắn mặc định, và mức này tăng dần sau mỗi lần cùng khóa đó lặp lại lỗi

### Requirement: Nhắc khi nhiều khóa có thể dùng chung hạn mức

Khi người dùng thêm khóa thứ hai trở đi cho một kết nối mà hạn mức của nhà cung cấp có thể tính theo tài khoản hoặc dự án thay vì theo khóa, hệ thống SHALL hiển thị một lời nhắc ngắn rằng các khóa thuộc cùng một dự án có thể dùng chung hạn mức. Lời nhắc này SHALL NOT chặn thao tác và SHALL NOT hỏi lại.

#### Scenario: Thêm khóa thứ hai
- **WHEN** người dùng thêm khóa thứ hai cho một kết nối tới nhà cung cấp tính hạn mức theo dự án
- **THEN** thấy một câu nhắc nên dùng khóa thuộc dự án khác, và vẫn lưu được khóa vừa nhập

### Requirement: Khóa API lưu an toàn và không đọc lại được

Hệ thống SHALL mã hóa khóa API bằng cơ chế lưu an toàn của hệ điều hành trước khi ghi xuống đĩa, dùng giao diện không đồng bộ. Nếu cơ chế đó không khả dụng, hệ thống SHALL từ chối lưu và nói rõ lý do, và SHALL NOT ghi khóa dạng văn bản thường. Sau khi lưu, hệ thống SHALL NOT trả giá trị khóa về tầng giao diện; chỉ trả dạng che và trạng thái.

#### Scenario: Lưu khóa khi cơ chế an toàn khả dụng
- **WHEN** người dùng lưu một khóa
- **THEN** khóa được mã hóa trước khi ghi, và giao diện sau đó chỉ nhận dạng che cùng trạng thái

#### Scenario: Cơ chế an toàn không khả dụng
- **WHEN** cơ chế lưu an toàn của hệ điều hành báo không khả dụng
- **THEN** việc lưu thất bại kèm thông báo giải thích, và không có khóa nào được ghi xuống đĩa

#### Scenario: Thay khóa thay vì đọc lại
- **WHEN** người dùng mở lại một kết nối đã lưu khóa
- **THEN** giao diện hiện dạng che và chỉ cho thay bằng khóa mới, SHALL NOT có cách nào đọc lại khóa cũ

### Requirement: Kết nối thuộc ứng dụng, không thuộc tác phẩm

Cấu hình kết nối và khóa SHALL lưu ở phạm vi ứng dụng. Chúng SHALL NOT nằm trong tệp dữ liệu của một tác phẩm, nên SHALL NOT bị mang theo khi người dùng xuất, backup hoặc chia sẻ một tác phẩm.

#### Scenario: Backup tác phẩm không mang khóa đi
- **WHEN** người dùng xuất hoặc backup một tác phẩm
- **THEN** tệp kết quả không chứa khóa API hay cấu hình kết nối

#### Scenario: Khai một lần dùng cho mọi tác phẩm
- **WHEN** người dùng mở một tác phẩm khác
- **THEN** các kết nối đã khai vẫn dùng được, không phải khai lại

### Requirement: Danh sách model và model mặc định

Người dùng SHALL chọn được những model nào của một kết nối là model dùng trong Mira, và một model mặc định. Hệ thống SHALL hiển thị giới hạn ngữ cảnh và giá của model khi biết, lấy từ một bảng dữ liệu đi kèm bản cài; model không có trong bảng SHALL khai được bằng tay.

#### Scenario: Chọn model từ danh sách lấy được
- **WHEN** kiểm tra kết nối trả về nhiều model
- **THEN** người dùng chọn được một tập con để dùng và đặt một model làm mặc định

#### Scenario: Model không có trong bảng dữ liệu
- **WHEN** người dùng dùng một model không có trong bảng đi kèm
- **THEN** model vẫn dùng được, và chỗ hiện giá nói rõ là chưa biết giá thay vì hiện số không

#### Scenario: Bảng dữ liệu dùng được khi không có mạng
- **WHEN** ứng dụng chạy không có mạng
- **THEN** giới hạn và giá của các model trong bảng vẫn hiển thị được, kèm ngày của bảng dữ liệu

### Requirement: Trạng thái rỗng và kết nối bị tắt

Khi chưa có kết nối nào, hệ thống SHALL hiển thị một trạng thái rỗng có giải thích và một hành động thêm kết nối. Kết nối bị tắt SHALL NOT được chọn ở các luồng gọi AI.

#### Scenario: Chưa khai kết nối nào
- **WHEN** người dùng mở màn kết nối lần đầu
- **THEN** thấy một trạng thái rỗng có một câu giải thích và một hành động thêm kết nối

#### Scenario: Tắt một kết nối
- **WHEN** người dùng tắt một kết nối
- **THEN** kết nối đó không xuất hiện ở nơi chọn kết nối để dịch, và cấu hình của nó vẫn được giữ
