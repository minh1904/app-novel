## Purpose

Cho người dùng kiểm soát cách một model sinh văn bản theo cách LinguaGacha và các client OpenAI thông thường làm: model là một mục cấu hình có thể nhân bản, mỗi mục có cài đặt cơ bản (tên, model thật, mức suy luận chỉ gồm những mức model hỗ trợ), cài đặt tác vụ (giới hạn token, đồng thời, RPM) và cài đặt nâng cao (nhiệt độ, `top_p`, header thêm, `extra_body`); dịch và chat chọn mục bằng cùng một menu. Mọi tham số mặc định là không gửi, để nhà cung cấp dùng mặc định của họ.

## ADDED Requirements

### Requirement: Model là một mục cấu hình nhân bản được

Mỗi model dùng trong ứng dụng SHALL là một **mục** có id riêng, tên hiển thị, tên model thật gửi cho nhà cung cấp, và các cài đặt riêng. Nhiều mục SHALL có thể trỏ cùng một model thật với cài đặt khác nhau. Người dùng SHALL thêm, đổi tên, nhân bản (sao chép), xóa và xếp thứ tự các mục. Nhân bản một mục SHALL tạo mục mới có cùng tên model thật và cùng cài đặt, nhưng id khác.

#### Scenario: Hai mục cùng một model
- **WHEN** người dùng nhân bản mục "gemini-2.5-flash", đổi tên bản sao thành "Flash nhanh" và tắt suy luận cho bản sao
- **THEN** có hai mục cùng gửi tên model `gemini-2.5-flash`, và chỉ bản sao có suy luận tắt

#### Scenario: Xóa một mục không ảnh hưởng mục khác
- **WHEN** người dùng xóa bản sao
- **THEN** mục gốc và cài đặt của nó vẫn còn nguyên

#### Scenario: Nâng cấp từ bản cũ
- **WHEN** ứng dụng mở dữ liệu của bản chỉ lưu danh sách tên model
- **THEN** mỗi tên model cũ thành một mục có tên hiển thị bằng tên model, không có cài đặt nào, và model mặc định cũ vẫn là mục mặc định

### Requirement: Chọn model tự do

Người dùng SHALL thêm được một mục với tên model bất kỳ bằng cách gõ tay, kể cả khi endpoint không liệt kê model hay model không có trong bảng dữ liệu đi kèm. Người dùng cũng SHALL chọn được tên model từ danh sách lấy từ endpoint, có ô lọc theo chữ gõ; danh sách đó chỉ là gợi ý.

#### Scenario: Model không có trong danh sách của endpoint
- **WHEN** người dùng gõ một tên model mà endpoint không liệt kê
- **THEN** mục được thêm và dùng được để dịch hoặc chat như mọi mục khác

#### Scenario: Chọn từ danh sách và lọc
- **WHEN** người dùng mở danh sách model lấy được và gõ "flash" vào ô lọc
- **THEN** chỉ các model có chữ đó còn lại, và chọn một model đặt nó làm tên model thật của mục

### Requirement: Cài đặt theo từng mục

Mỗi mục SHALL có ba nhóm cài đặt, mỗi cài đặt tùy chọn. **Cơ bản:** tên hiển thị, tên model thật, mức suy luận. **Tác vụ:** giới hạn token đầu vào mỗi lô, giới hạn token đầu ra, giới hạn đồng thời, RPM. **Nâng cao:** nhiệt độ, `top_p`, header thêm, `extra_body`. Nhiệt độ, `top_p`, header thêm và `extra_body` SHALL có một cờ bật riêng, và giá trị SHALL được giữ lại khi cờ tắt. Cài đặt SHALL được lưu giữa các lần mở ứng dụng và thuộc về ứng dụng, không thuộc tác phẩm. Mỗi giá trị SHALL được kiểm giới hạn khi lưu và giá trị ngoài giới hạn SHALL bị từ chối kèm lý do, không tự sửa âm thầm: nhiệt độ 0–2; `top_p` 0–1; giới hạn token vào và ra là số nguyên 0–2.000.000 (0 là mặc định hoặc tự động); đồng thời 0–64 (0 là mặc định); RPM 0–10.000 (0 là không giới hạn); header thêm và `extra_body` mỗi cái là một đối tượng JSON hợp lệ không quá 4 KB.

#### Scenario: Đặt rồi mở lại ứng dụng
- **WHEN** người dùng bật nhiệt độ 0,3 cho một mục rồi đóng và mở lại ứng dụng
- **THEN** mục đó vẫn có nhiệt độ 0,3 đang bật, và các mục khác không đổi

#### Scenario: Tắt cờ nhưng giữ giá trị
- **WHEN** người dùng tắt cờ nhiệt độ của một mục đã đặt 0,3
- **THEN** nhiệt độ không được gửi nữa, và khi bật lại cờ giá trị vẫn là 0,3

#### Scenario: Giá trị ngoài giới hạn
- **WHEN** người dùng nhập nhiệt độ 5
- **THEN** cài đặt không được lưu và người dùng thấy giới hạn cho phép của tham số đó

### Requirement: Chỉ gửi tham số đã bật

Hệ thống SHALL chỉ đưa vào yêu cầu những tham số mà người dùng đã bật cho mục được dùng. Tham số chưa bật SHALL NOT xuất hiện trong yêu cầu. Một mục chưa có cài đặt nào SHALL gửi yêu cầu giống hệt như trước khi tính năng này tồn tại.

#### Scenario: Mục chưa có cài đặt
- **WHEN** người dùng dịch hoặc chat bằng một mục chưa đặt gì
- **THEN** yêu cầu chỉ có model và nội dung, không có nhiệt độ, `top_p`, trần token, mức suy luận hay header thêm

#### Scenario: Chỉ một tham số được bật
- **WHEN** người dùng chỉ bật nhiệt độ 0,3
- **THEN** yêu cầu có nhiệt độ 0,3 và không có tham số sinh nào khác

#### Scenario: Giới hạn token đầu ra là 0
- **WHEN** giới hạn token đầu ra của mục là 0
- **THEN** yêu cầu không có trường giới hạn token

### Requirement: Mức suy luận theo khả năng của model

Menu chọn mức suy luận SHALL chỉ đưa các mức mà model của mục hỗ trợ, theo dữ liệu khả năng đi kèm bản cài. Mức **Mặc định** SHALL luôn có và SHALL có nghĩa là không gửi gì về suy luận. Mức **Tắt** SHALL chỉ có cho model có thể tắt, và SHALL có nghĩa là gửi giá trị tắt mà endpoint hiểu, khác với Mặc định. Model không có dữ liệu khả năng hoặc không có suy luận SHALL chỉ có mức Mặc định; tham số riêng của nhà cung cấp cho các model đó đi qua `extra_body`.

#### Scenario: Model tắt được suy luận
- **WHEN** menu mở cho `gemini-2.5-flash`, model có thể bật tắt suy luận
- **THEN** có mức Tắt, các mức thấp, vừa, cao, và Mặc định

#### Scenario: Model không tắt được
- **WHEN** menu mở cho `gemini-2.5-pro`, model chỉ có ngân sách suy luận tối thiểu khác 0
- **THEN** không có mức Tắt

#### Scenario: Model chỉ có các mức, không có Tắt
- **WHEN** menu mở cho một model Gemini 3.x chỉ nhận các mức từ tối thiểu đến cao
- **THEN** các mức đó có mặt, không có mức Tắt

#### Scenario: Model lạ
- **WHEN** mục dùng một tên model không có trong bảng dữ liệu
- **THEN** menu chỉ có mức Mặc định

#### Scenario: Mặc định không gửi gì, Tắt thì gửi
- **WHEN** mức là Mặc định, rồi đổi sang Tắt trên model hỗ trợ
- **THEN** yêu cầu lúc đầu không có trường suy luận nào và sau khi đổi mang giá trị tắt

### Requirement: Giới hạn token đầu vào quyết định cỡ lô dịch

Khi lập kế hoạch dịch một chương, hệ thống SHALL chia bản gốc thành các lô có cỡ không vượt giới hạn token đầu vào của mục. Giới hạn bằng 0 SHALL dùng cỡ lô mặc định hiện có. Mỗi lô SHALL vẫn cắt ở ranh giới segment và SHALL NOT cắt giữa một segment.

#### Scenario: Giới hạn nhỏ hơn cho nhiều lô hơn
- **WHEN** người dùng giảm giới hạn token đầu vào của mục rồi lập kế hoạch dịch cùng một chương
- **THEN** kế hoạch có nhiều lô hơn, và mỗi lô nhỏ hơn hoặc bằng giới hạn trừ khi một segment đơn lẻ đã lớn hơn giới hạn

#### Scenario: Giới hạn bằng 0
- **WHEN** giới hạn token đầu vào của mục là 0
- **THEN** kế hoạch chia lô y như trước khi tính năng này tồn tại

### Requirement: RPM giãn nhịp các yêu cầu

Khi RPM của mục lớn hơn 0, hệ thống SHALL giãn các yêu cầu dùng mục đó sao cho hai yêu cầu liên tiếp cách nhau ít nhất một phút chia cho RPM, kể cả giữa các lần dịch hay chat khác nhau. Việc chờ SHALL hủy được ngay. RPM bằng 0 SHALL không giãn nhịp gì.

#### Scenario: RPM 6
- **WHEN** RPM của mục là 6 và hai yêu cầu được gửi liên tiếp
- **THEN** yêu cầu thứ hai bắt đầu cách yêu cầu thứ nhất ít nhất 10 giây

#### Scenario: Hủy trong lúc chờ nhịp
- **WHEN** người dùng hủy một yêu cầu đang chờ tới lượt theo RPM
- **THEN** yêu cầu đó kết thúc ngay là đã hủy và không được gửi

### Requirement: Giới hạn đồng thời theo mục

Khi giới hạn đồng thời của mục lớn hơn 0, hệ thống SHALL không chạy quá chừng đó yêu cầu cùng lúc cho mục đó; yêu cầu thừa xếp hàng theo thứ tự đến. Giới hạn bằng 0 SHALL dùng mặc định hiện có. Chế độ tự động điều chỉnh đồng thời không thuộc yêu cầu này.

#### Scenario: Giới hạn 1
- **WHEN** giới hạn đồng thời của mục là 1 và hai yêu cầu được gửi cùng lúc
- **THEN** yêu cầu thứ hai chỉ bắt đầu khi yêu cầu thứ nhất kết thúc

### Requirement: Kiểm tra một mục model

Người dùng SHALL kiểm tra được một mục: hệ thống gửi một yêu cầu nhỏ bằng **đúng các cài đặt đang lưu của mục** và báo kết quả. Thành công SHALL hiển thị thời gian phản hồi và lượng token; thất bại SHALL hiển thị thông điệp gốc của nhà cung cấp. Lần kiểm tra SHALL NOT thay đổi cài đặt của mục.

#### Scenario: Cài đặt được nhận
- **WHEN** người dùng kiểm tra một mục có nhiệt độ bật và nhà cung cấp chấp nhận
- **THEN** thấy kết quả thành công kèm thời gian và token

#### Scenario: Cài đặt bị từ chối
- **WHEN** nhà cung cấp trả lỗi nói một tham số của mục không được hỗ trợ
- **THEN** người dùng thấy thông điệp đó và biết tham số nào cần đổi

### Requirement: Một menu chọn mục model dùng cho dịch và chat

Hộp thoại dịch chương và ô soạn chat SHALL dùng cùng một menu để chọn mục model và mức suy luận của nó. Chọn một mức SHALL ghi mức đó vào cài đặt của mục, như mọi cài đặt khác. Ô soạn chat SHALL hiện mục đang dùng và mức suy luận của nó.

#### Scenario: Đổi mức ngay trong ô soạn chat
- **WHEN** người dùng chọn mức Tắt cho mục đang dùng trong ô soạn chat
- **THEN** lượt chat kế tiếp dùng mức Tắt, và mục đó cũng có mức Tắt khi mở hộp thoại dịch

#### Scenario: Dịch và chat dùng hai mục khác nhau
- **WHEN** người dùng dịch bằng mục "Flash nhanh" và chat bằng mục "Flash kỹ"
- **THEN** mỗi bên gửi đúng cài đặt của mục mình đã chọn

### Requirement: Cấu hình không trộn lẫn giữa các lô của một lần dịch

Khi một lần dịch chương gồm nhiều lô, tất cả các lô SHALL dùng cùng cấu hình của mục model như lúc lập kế hoạch. Nếu cấu hình của mục bị sửa trước khi một lô được gửi, lô đó SHALL NOT được gửi và hệ thống SHALL báo xung đột để người dùng lập kế hoạch lại; các lô đã xong vẫn được giữ. Với chat, cấu hình SHALL được đọc một lần cho mỗi lượt và dùng cho mọi vòng đọc công cụ của lượt đó.

#### Scenario: Sửa nhiệt độ giữa lúc đang dịch
- **WHEN** người dùng đổi nhiệt độ của mục sau lô thứ hai của một chương nhiều lô
- **THEN** lô thứ ba không được gửi, người dùng thấy cần lập kế hoạch lại, và hai lô đã dịch vẫn nằm trong bản dịch

#### Scenario: Chat nhiều vòng đọc công cụ
- **WHEN** một lượt chat gọi công cụ đọc hai lần trước khi trả lời
- **THEN** cả ba lời gọi tới nhà cung cấp mang cùng một cấu hình

### Requirement: Không âm thầm bỏ tham số

Khi nhà cung cấp từ chối một yêu cầu có tham số sinh, hệ thống SHALL báo lỗi mang thông điệp gốc của nhà cung cấp, và SHALL NOT tự bỏ tham số rồi gọi lại. Việc bỏ hay giữ tham số là quyết định của người dùng.

#### Scenario: Tham số bị từ chối
- **WHEN** nhà cung cấp trả lỗi 400 nói một tham số không được hỗ trợ
- **THEN** người dùng thấy thông điệp đó, không có lần gọi thứ hai nào được gửi, và lượt dịch hoặc chat kết thúc với lỗi

### Requirement: `extra_body` và header thêm không được phá phần lõi của yêu cầu

`extra_body` SHALL được gộp vào yêu cầu sau cùng để người dùng có tiếng nói cuối cùng với các tham số riêng của nhà cung cấp. Nhưng nó SHALL NOT ghi đè các trường mà hệ thống dựa vào để đọc phản hồi: model, danh sách tin nhắn, cờ stream, tùy chọn stream và danh sách công cụ. Header thêm SHALL được gộp vào header của yêu cầu và SHALL NOT ghi đè header xác thực, `host`, `accept`, `content-type` hay `content-length`. Một `extra_body` hay header thêm chứa các trường đó SHALL bị từ chối khi lưu, kèm tên trường.

#### Scenario: Thêm một tham số riêng của nhà cung cấp
- **WHEN** người dùng bật `extra_body` là `{"top_k": 40}`
- **THEN** yêu cầu có thêm `top_k: 40`

#### Scenario: Cố ghi đè phần lõi của thân
- **WHEN** người dùng đặt `extra_body` có trường `stream`
- **THEN** cài đặt không được lưu và người dùng thấy trường nào không được phép

#### Scenario: Thêm một header riêng
- **WHEN** người dùng bật header thêm `{"HTTP-Referer": "https://mira.app"}`
- **THEN** yêu cầu mang header đó cùng header xác thực sẵn có

#### Scenario: Cố ghi đè header xác thực
- **WHEN** người dùng đặt header thêm có `Authorization`
- **THEN** cài đặt không được lưu và người dùng thấy header nào không được phép
