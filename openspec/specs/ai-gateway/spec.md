# ai-gateway Specification

## Purpose
Định nghĩa cách ứng dụng kết nối và giao tiếp với một endpoint AI: một lượt gọi trả về sự kiện thực tế, lỗi giữ chi tiết mà không lộ khóa, thời hạn và hủy, một chủ thử lại duy nhất, chọn khóa an toàn khi gọi song song, giới hạn đồng thời, địa chỉ và proxy, và `usage` chuẩn hóa. Không bao gồm nội dung prompt hay cách chia việc dịch.

## Requirements

### Requirement: Một lượt gọi trả về sự kiện thực tế

Một lượt gọi tới endpoint AI SHALL trả về nội dung nhận được, **lý do kết thúc** (hết tự nhiên, bị cắt vì hết giới hạn đầu ra, yêu cầu gọi công cụ, bị bộ lọc nội dung chặn, hoặc không rõ), lượng dùng đã chuẩn hóa, và trạng thái HTTP khi đã nhận được phản hồi. Lượt gọi SHALL NOT tự chọn khóa, tự thử lại, hay diễn giải nội dung theo nghiệp vụ dịch.

#### Scenario: Phản hồi bị cắt vì hết giới hạn đầu ra
- **WHEN** endpoint kết thúc phản hồi với lý do hết giới hạn đầu ra
- **THEN** người gọi nhận được nội dung đã có cùng lý do kết thúc "bị cắt", thay vì một kết thúc êm không phân biệt được với trả lời xong

#### Scenario: Endpoint không báo lý do kết thúc
- **WHEN** endpoint không gửi lý do kết thúc
- **THEN** lý do được báo là "không rõ" và lượt gọi không bị coi là lỗi

#### Scenario: Lượt gọi không quyết định thử lại
- **WHEN** endpoint trả lỗi giới hạn tốc độ
- **THEN** lượt gọi báo lỗi có kèm trạng thái và thời gian chờ, không tự gọi lại và không tự đổi khóa

### Requirement: Lượng dùng được chuẩn hóa một kiểu

Lượng dùng SHALL gồm: token đầu vào **chưa tính** phần đọc từ cache, token đọc từ cache, token ghi vào cache, token đầu ra, và token suy luận là một **phần của** token đầu ra. Giá trị thiếu hoặc sai kiểu SHALL được coi là **không có**, không phải 0. Chi phí SHALL dùng giá cache khi bảng giá có, và giá đầu vào thường khi không có; thiếu giá SHALL cho ra "chưa biết giá", không bao giờ 0.

#### Scenario: Endpoint báo token cache
- **WHEN** phản hồi báo tổng token đầu vào gồm một phần đã đọc từ cache
- **THEN** token đầu vào chưa tính cache bằng tổng trừ phần đã đọc từ cache, và phần đọc từ cache được báo riêng

#### Scenario: Endpoint tính token suy luận ngoài token trả lời
- **WHEN** tổng token phản hồi báo lớn hơn token đầu vào cộng token trả lời và phản hồi không nêu riêng số token suy luận (Gemini: đầu vào 21, trả lời 13, tổng 125)
- **THEN** phần chênh được tính là token suy luận, nằm trong token đầu ra (13 + 91 = 104, suy luận 91), vì nhà cung cấp tính tiền chúng như đầu ra

#### Scenario: Endpoint nêu rõ số token suy luận
- **WHEN** phản hồi có số token suy luận tường minh và tổng khớp với đầu vào cộng đầu ra
- **THEN** số đó được dùng nguyên, không cộng thêm phần chênh nào

#### Scenario: Endpoint không báo lượng dùng
- **WHEN** phản hồi không có thông tin lượng dùng
- **THEN** lượng dùng được báo là không có, và không có con số 0 nào được ghi như thể đã đo

#### Scenario: Tính chi phí với giá cache
- **WHEN** bảng giá của model có giá đọc cache
- **THEN** chi phí tính phần đọc từ cache bằng giá đó, không bằng giá đầu vào thường

### Requirement: Lỗi giữ chi tiết và không lộ khóa

Mọi lỗi từ một lượt gọi SHALL mang loại lỗi, trạng thái HTTP nếu có, thời gian chờ nhà cung cấp yêu cầu nếu có, phạm vi hạn mức (phút hoặc ngày) nếu đọc được, và **một đoạn thân phản hồi có độ dài giới hạn**. Lỗi SHALL NOT chứa khóa API đã gửi đi, dưới bất kỳ dạng nào (nguyên văn, sau `Bearer`, hay trong một trường có tên nhạy cảm), kể cả khi nhà cung cấp lặp lại khóa trong phản hồi.

#### Scenario: Nhà cung cấp lặp lại khóa trong thân lỗi
- **WHEN** thân phản hồi lỗi chứa nguyên văn khóa vừa gửi
- **THEN** lỗi trả ra và mọi nơi lỗi đó đi tới không chứa khóa, chỗ đó được thay bằng dấu che

#### Scenario: Thân lỗi quá dài hoặc không phải JSON
- **WHEN** thân phản hồi lỗi dài hơn giới hạn hoặc là chữ thường
- **THEN** lỗi vẫn được phân loại theo trạng thái HTTP, mang một đoạn đầu của thân trong giới hạn

### Requirement: Thời hạn và hủy

Mỗi lượt gọi SHALL có thời hạn: lượt không stream có thời hạn tổng, lượt stream có thời hạn chờ phản hồi đầu và thời hạn im lặng giữa hai phần. Hết thời hạn SHALL kết thúc bằng loại lỗi `timeout`. Người gọi SHALL hủy được lượt đang chạy; hủy SHALL kết thúc bằng loại `cancelled`. Khi hủy và hết thời hạn xảy ra cùng lúc, hủy SHALL được ưu tiên. Cả hai SHALL NOT bị tính là lỗi của khóa.

#### Scenario: Endpoint không trả lời
- **WHEN** không có phản hồi nào trước hết thời hạn
- **THEN** lượt gọi kết thúc với loại `timeout` và khóa vừa dùng vẫn dùng được ngay

#### Scenario: Stream im lặng giữa chừng
- **WHEN** đã nhận một phần nội dung rồi không nhận gì thêm quá thời hạn im lặng
- **THEN** lượt gọi kết thúc với loại `timeout` kèm phần nội dung đã nhận

#### Scenario: Hủy cùng lúc hết thời hạn
- **WHEN** người gọi hủy đúng lúc thời hạn kết thúc
- **THEN** kết quả là `cancelled`, không phải `timeout`

### Requirement: Một chủ thử lại, chỉ trước khi nhận byte đầu

Việc thử lại lỗi tạm thời (mạng, hết thời hạn, lỗi máy chủ 5xx) SHALL do **một** tầng duy nhất đảm nhiệm, với số lần tối đa, chờ tăng dần có xáo trộn ngẫu nhiên, và thời gian chờ nhà cung cấp yêu cầu bị kẹp ở một trần. Lúc chờ SHALL hủy được ngay. Hệ thống SHALL NOT thử lại một lượt đã nhận được dù chỉ một phần nội dung. Số lần thử lại do hạ tầng SHALL NOT dùng chung bộ đếm với việc hỏi lại vì nội dung không đạt của tầng nghiệp vụ.

#### Scenario: Lỗi mạng thoáng qua trước khi có phản hồi
- **WHEN** lượt gọi đầu thất bại vì lỗi mạng và lượt thứ hai thành công
- **THEN** người gọi nhận kết quả của lượt thứ hai như một lời gọi duy nhất, không thấy lỗi của lượt đầu

#### Scenario: Lỗi sau khi đã nhận một phần
- **WHEN** stream đứt sau khi đã nhận một phần nội dung
- **THEN** không có lần gọi lại nào; người gọi nhận phần đã có cộng một lỗi

#### Scenario: Hủy trong lúc chờ thử lại
- **WHEN** người gọi hủy trong khoảng chờ giữa hai lần thử
- **THEN** lượt gọi kết thúc ngay với loại `cancelled`, không chờ hết khoảng

#### Scenario: Nhà cung cấp yêu cầu chờ quá lâu
- **WHEN** nhà cung cấp yêu cầu chờ lâu hơn trần cho phép
- **THEN** hệ thống không ngủ theo yêu cầu đó, và báo lỗi kèm thời điểm có thể thử lại để tầng trên quyết định

### Requirement: Chọn khóa an toàn khi nhiều lượt chạy cùng lúc

Với một kết nối có nhiều khóa, hệ thống SHALL xử lý lỗi theo **đợt**: nhiều lượt cùng thất bại trên một khóa trong cùng một đợt SHALL được tính là **một** lần thất bại. Khóa vừa thất bại SHALL ngừng nhận lượt mới nhưng chưa bắt đầu hạn đóng băng cho tới khi các lượt đang chạy của nó kết thúc. Một lượt đã bắt đầu **trước** khi khóa thất bại rồi thành công sau đó SHALL NOT gỡ đóng băng của khóa. Khi hạn đóng băng kết thúc, khóa SHALL nhận **đúng một** lượt thăm dò; thăm dò thành công khôi phục khóa, thất bại kéo dài hạn theo cấp độ kế tiếp. Thời lượng đóng băng theo các quy tắc đã có của hợp đồng provider (đọc thời gian chờ từ thân và header, phạm vi phút hoặc ngày). Khi một khóa thất bại vì lý do **riêng của khóa** (giới hạn tốc độ, hết hạn mức tín dụng, khóa sai) và còn khóa khác dùng được, lượt gọi SHALL chuyển ngay sang khóa khác **mà không chờ**; chỉ khi không còn khóa nào dùng được mới báo lỗi ra ngoài.

#### Scenario: Khóa đầu hết hạn mức, khóa sau còn dùng được
- **WHEN** khóa đang dùng trả lỗi giới hạn tốc độ và còn một khóa khác không bị đóng băng
- **THEN** lượt gọi dùng khóa khác ngay, không chờ, và người gọi nhận kết quả như một lời gọi duy nhất

#### Scenario: Khóa sai đứng trước khóa đúng
- **WHEN** khóa đầu bị từ chối vì sai và khóa thứ hai hợp lệ
- **THEN** khóa đầu được đánh dấu sai, lượt gọi hiện tại dùng khóa thứ hai và thành công

#### Scenario: Sáu lỗi 429 đồng thời trên một khóa
- **WHEN** sáu lượt cùng chạy trên một khóa và cả sáu nhận 429 chưa rõ phạm vi
- **THEN** khóa bị đóng băng theo mức của **một** lần thất bại, không phải mức của sáu lần liên tiếp

#### Scenario: Lượt thành công đến muộn
- **WHEN** khóa vừa bị đóng băng vì 429 và một lượt đã bắt đầu trước đó trả về thành công
- **THEN** khóa vẫn đang đóng băng

#### Scenario: Thăm dò sau hạn đóng băng
- **WHEN** hạn đóng băng của khóa kết thúc và có nhiều lượt đang chờ
- **THEN** đúng một lượt dùng khóa đó, các lượt còn lại không dùng khóa đó cho tới khi thăm dò xong

#### Scenario: Mọi khóa đang đóng băng
- **WHEN** không còn khóa nào dùng được
- **THEN** hệ thống không gửi lượt nào ra ngoài và báo lỗi giới hạn tốc độ kèm mốc sớm nhất có khóa sống lại

### Requirement: Trần đồng thời theo kết nối

Mỗi kết nối SHALL có một trần số lượt đang chạy cùng lúc. Lượt vượt trần SHALL xếp hàng theo thứ tự đến và bắt đầu khi có chỗ. Lượt đang xếp hàng bị hủy SHALL bị bỏ khỏi hàng mà không được gửi đi. Trần SHALL áp cho cả lượt dịch lẫn lượt hội thoại của cùng kết nối.

#### Scenario: Vượt trần
- **WHEN** trần là hai và ba lượt được gửi cùng lúc
- **THEN** hai lượt chạy ngay, lượt thứ ba bắt đầu khi một lượt kết thúc

#### Scenario: Hủy lượt đang xếp hàng
- **WHEN** người gọi hủy một lượt chưa được gửi
- **THEN** lượt đó kết thúc `cancelled` và không có yêu cầu nào tới endpoint

### Requirement: Địa chỉ được chuẩn hóa và đi qua mạng của hệ điều hành

Địa chỉ kết nối SHALL được chuẩn hóa khi lưu và khi gửi: bỏ dấu gạch chéo cuối và bỏ phần đường dẫn endpoint (`/chat/completions`) nếu người dùng dán nguyên đường dẫn đó. Chuẩn hóa SHALL idempotent. Trong ứng dụng desktop, mọi lượt gọi SHALL đi qua lớp mạng của hệ điều hành để theo cấu hình proxy của người dùng; địa chỉ máy nội bộ (loopback) SHALL được nối trực tiếp.

#### Scenario: Dán nguyên đường dẫn endpoint
- **WHEN** người dùng nhập `https://api.example.com/v1/chat/completions`
- **THEN** địa chỉ lưu và gửi là `https://api.example.com/v1`, và yêu cầu tới `https://api.example.com/v1/chat/completions` đúng một lần phần đường dẫn

#### Scenario: Người dùng sau proxy
- **WHEN** hệ điều hành cấu hình proxy cho người dùng
- **THEN** lượt gọi tới endpoint ngoài đi qua proxy đó

#### Scenario: Endpoint chạy trên máy người dùng
- **WHEN** địa chỉ là loopback (ví dụ Ollama)
- **THEN** lượt gọi nối trực tiếp, không qua proxy

### Requirement: Chỉ gửi tham số mà người gọi đã đặt

Các tham số sinh (giới hạn token đầu ra, nhiệt độ, mức suy luận) SHALL chỉ nằm trong yêu cầu khi người gọi đặt chúng. Tên trường SHALL theo cấu hình tương thích của endpoint (ví dụ giới hạn token đầu ra là `max_tokens` hay `max_completion_tokens`). Việc xin báo lượng dùng trong lúc stream SHALL chỉ được gửi tới endpoint chấp nhận nó. Endpoint chưa biết SHALL dùng giá trị mặc định chuẩn OpenAI; người dùng đè được.

#### Scenario: Người gọi không đặt tham số nào
- **WHEN** lượt gọi không đặt giới hạn token, nhiệt độ hay mức suy luận
- **THEN** thân yêu cầu không có các trường đó, để nhà cung cấp dùng mặc định của mình

#### Scenario: Endpoint dùng tên trường khác
- **WHEN** người gọi đặt giới hạn token cho một endpoint khai dùng `max_tokens`
- **THEN** thân yêu cầu dùng `max_tokens`, không dùng `max_completion_tokens`
