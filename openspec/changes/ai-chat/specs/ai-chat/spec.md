## Purpose

Hỏi AI về chỗ đang sửa trong một chương và nhận lại bản sửa — một lượt hội thoại có ngữ cảnh của đoạn đang làm, chữ chảy về dần và hủy được, còn đề xuất chỉ vào bản dịch sau khi người dùng nhìn thấy nó thay đổi những gì rồi đồng ý.

## ADDED Requirements

### Requirement: Hỏi AI dùng kết nối đã khai, không có cấu hình riêng

Panel Hỏi AI SHALL gọi qua một kết nối người dùng đã khai trong Cài đặt, dùng chính khóa, địa chỉ và danh sách model của kết nối đó. Panel SHALL NOT có kho khóa, địa chỉ hay danh sách model riêng. Khi chưa có kết nối nào dùng được, panel SHALL nói rõ điều đó và chỉ đường tới Cài đặt thay vì để người dùng gửi vào chỗ trống.

#### Scenario: Chưa có kết nối nào
- **WHEN** người dùng mở panel mà chưa khai kết nối nào, hoặc mọi kết nối đang tắt
- **THEN** panel nói rõ chưa gửi được và chỉ đường tới Cài đặt, và ô gửi không gửi được gì

#### Scenario: Kết nối đang tắt
- **WHEN** người dùng gửi một câu hỏi trên kết nối đang tắt
- **THEN** yêu cầu bị từ chối với lý do kết nối đang tắt, và không có lời gọi nào ra ngoài

#### Scenario: Đổi model của kết nối
- **WHEN** người dùng đổi model mặc định của kết nối trong Cài đặt
- **THEN** lượt hỏi tiếp theo dùng model mới mà không cần mở lại panel

### Requirement: Khóa API không ra khỏi tiến trình chính

Mọi lời gọi tới nhà cung cấp cho panel Hỏi AI SHALL xảy ra trong tiến trình chính. Dữ liệu đi về phía giao diện SHALL chỉ gồm nội dung câu trả lời, số token đã dùng, bốn ký tự cuối của khóa đã dùng và thông tin lỗi; nó SHALL NOT bao giờ chứa khóa API hay header gửi đi.

#### Scenario: Giao diện không nhận được khóa
- **WHEN** một lượt hỏi chạy từ đầu đến cuối
- **THEN** không thông điệp nào gửi về phía giao diện chứa khóa API, kể cả trong thông tin lỗi

### Requirement: Câu trả lời hiện ra dần và hủy được giữa dòng

Panel SHALL hiện phần chữ đã nhận **trong lúc** câu trả lời còn đang về, không chờ nhận xong. Người dùng SHALL hủy được một lượt đang chạy; khi hủy, panel SHALL giữ lại phần chữ đã nhận và đánh dấu rõ là đã hủy, SHALL NOT trình bày phần đó như một câu trả lời hoàn chỉnh, và SHALL NOT cho Áp dụng phần đó.

#### Scenario: Chữ hiện ra trước khi nhận xong
- **WHEN** nhà cung cấp mới trả về một phần câu trả lời
- **THEN** phần đó đã hiện trên panel, và panel cho biết lượt này còn đang chạy

#### Scenario: Hủy giữa dòng
- **WHEN** người dùng hủy một lượt đang nhận chữ
- **THEN** việc nhận dừng lại, phần chữ đã nhận vẫn hiện và được đánh dấu là đã hủy, và không có nút Áp dụng cho phần đó

#### Scenario: Đóng panel khi một lượt đang chạy
- **WHEN** người dùng đóng panel trong lúc một lượt còn đang nhận chữ
- **THEN** lượt đó bị hủy, và không còn thông điệp nào của nó được xử lý sau đó

### Requirement: Hai lượt hỏi chồng nhau không trộn vào nhau

Khi một lượt hỏi còn đang chạy mà người dùng gửi lượt tiếp, hệ thống SHALL giữ chữ của từng lượt tách biệt. Hủy một lượt SHALL NOT làm dừng lượt còn lại.

#### Scenario: Gửi lượt thứ hai khi lượt đầu chưa xong
- **WHEN** người dùng gửi câu hỏi thứ hai trong lúc câu trả lời thứ nhất còn đang về
- **THEN** chữ của hai câu trả lời nằm đúng ở hai lượt của nó, không lượt nào nhận chữ của lượt kia

#### Scenario: Hủy một lượt trong hai lượt đang chạy
- **WHEN** người dùng hủy lượt thứ nhất trong lúc lượt thứ hai còn đang nhận chữ
- **THEN** lượt thứ hai chạy tiếp tới khi xong bình thường

### Requirement: Lỗi giữa dòng hiện ra cùng phần chữ đã nhận

Khi lỗi xảy ra **sau khi** chữ đã bắt đầu về, panel SHALL giữ phần chữ đã nhận, hiện lỗi cạnh nó, và nói rõ câu trả lời chưa trọn. Lỗi SHALL được phân biệt theo loại như mọi lời gọi khác — khóa sai, hết hạn mức, đường truyền, bị từ chối — và nói được lỗi nào thử lại được. Phần chữ chưa trọn SHALL NOT được cho Áp dụng.

#### Scenario: Hết hạn mức giữa dòng
- **WHEN** nhà cung cấp báo hết hạn mức sau khi đã trả về một phần câu trả lời
- **THEN** phần đã nhận vẫn hiện, lỗi hiện kèm loại và mốc thử lại được nếu biết, và không có nút Áp dụng

#### Scenario: Mất kết nối giữa dòng
- **WHEN** đường truyền đứt giữa lúc nhận chữ
- **THEN** panel báo lỗi đường truyền và cho thử lại cùng câu hỏi đó

### Requirement: Panel biết phạm vi đang nhắm trong bản dịch

Panel SHALL luôn nói rõ nó đang hỏi về phần nào của bản dịch, theo đúng ba luật: đang bôi chọn thì phạm vi là **vùng bôi chọn**; không bôi chọn thì phạm vi là **đoạn chứa con trỏ**; muốn cả chương thì người dùng phải **nói ra**. Phạm vi SHALL NOT mặc định là cả chương.

#### Scenario: Không bôi chọn gì
- **WHEN** con trỏ nằm trong một đoạn và không có vùng bôi chọn
- **THEN** panel cho biết phạm vi là đoạn đó, không phải cả chương

#### Scenario: Có bôi chọn
- **WHEN** người dùng bôi chọn một vùng rồi mở panel
- **THEN** panel cho biết phạm vi là vùng đã bôi chọn

#### Scenario: Cả chương phải nói ra
- **WHEN** người dùng muốn sửa cả chương
- **THEN** phải có một thao tác nêu rõ phạm vi cả chương, và panel cho biết phạm vi đã thành cả chương trước khi gửi

#### Scenario: Con trỏ đổi chỗ
- **WHEN** người dùng đưa con trỏ sang đoạn khác trong lúc panel đang mở
- **THEN** phạm vi panel hiện đổi theo, và lượt hỏi tiếp theo dùng phạm vi mới

### Requirement: Ngữ cảnh do hệ thống chọn bằng luật và nói rõ đã gửi gì

Hệ thống SHALL chọn ngữ cảnh gửi kèm câu hỏi **bằng luật của chính nó**, không để model tự quyết định đi đọc gì. Với cùng một chương, cùng phạm vi và cùng dữ liệu, việc chọn SHALL cho ra cùng một ngữ cảnh. Panel SHALL liệt kê được những gì đã gửi kèm, ở dạng gập lại theo mặc định.

#### Scenario: Liệt kê những gì đã gửi
- **WHEN** một câu trả lời đã nhận xong
- **THEN** người dùng mở ra xem được danh sách những gì đã gửi kèm câu hỏi đó

#### Scenario: Cùng đầu vào cho cùng ngữ cảnh
- **WHEN** hỏi hai lần cùng một câu về cùng phạm vi mà chương không đổi
- **THEN** ngữ cảnh gửi kèm hai lần là một

#### Scenario: Ngữ cảnh gồm các câu quanh phạm vi
- **WHEN** phạm vi là một đoạn giữa chương
- **THEN** ngữ cảnh gửi kèm có cả bản gốc và bản dịch hiện có của mấy câu liền trước và liền sau phạm vi đó

### Requirement: Hai chế độ phân biệt bằng quyền ghi

Panel SHALL có hai chế độ. Chế độ **Hỏi** SHALL chỉ trả lời và SHALL NOT bày ra bất kỳ đường nào ghi vào bản dịch. Chế độ **Sửa** SHALL yêu cầu một khối văn bản thay thế cho phạm vi đang nhắm và bày ra đường áp dụng nó. Chuyển chế độ SHALL NOT làm mất câu hỏi đang gõ.

#### Scenario: Chế độ Hỏi không ghi được
- **WHEN** người dùng nhận câu trả lời ở chế độ Hỏi
- **THEN** câu trả lời không có nút Áp dụng, và không có cách nào từ câu trả lời đó ghi vào bản dịch

#### Scenario: Chế độ Sửa trả khối thay thế
- **WHEN** người dùng hỏi ở chế độ Sửa về một phạm vi
- **THEN** câu trả lời gồm một khối văn bản thay thế cho đúng phạm vi đó, và một nút Áp dụng

### Requirement: Đề xuất chỉ vào bản dịch sau khi người dùng thấy nó đổi gì

Hệ thống SHALL NOT bao giờ tự đưa văn bản do AI sinh ra vào bản dịch. Trước khi áp dụng, panel SHALL hiện **đổi những gì** so với văn bản hiện tại. Áp dụng SHALL chỉ xảy ra khi người dùng ra lệnh.

#### Scenario: Thấy thay đổi trước khi áp dụng
- **WHEN** một câu trả lời ở chế độ Sửa đã nhận xong
- **THEN** panel hiện phần khác nhau giữa văn bản hiện tại và bản đề xuất, trước khi có bất kỳ thay đổi nào trong bản dịch

#### Scenario: Không áp dụng thì không đổi gì
- **WHEN** người dùng đọc đề xuất rồi không áp dụng
- **THEN** bản dịch không đổi một ký tự nào

### Requirement: Một lần áp dụng là một thao tác hoàn tác được

Áp dụng một đề xuất SHALL là **một** thay đổi duy nhất trên bản dịch: một lần hoàn tác SHALL trả lại nguyên trạng trước khi áp dụng, không phải gỡ từng câu. Áp dụng SHALL đi qua cùng đường mà người dùng gõ chữ, nên SHALL chịu cùng các luật đã có về lưu, tách lại segment và giới hạn kích thước.

#### Scenario: Hoàn tác một lần
- **WHEN** người dùng áp dụng một đề xuất thay nhiều câu rồi hoàn tác một lần
- **THEN** bản dịch trở lại đúng như trước khi áp dụng

#### Scenario: Chưa lưu vẫn an toàn
- **WHEN** người dùng áp dụng một đề xuất rồi rời màn hình mà chưa lưu
- **THEN** hệ thống xử lý đúng như với chữ người dùng tự gõ mà chưa lưu, không có luật riêng cho chữ do AI sinh

### Requirement: Áp dụng không đụng tới phần ngoài phạm vi

Một lần áp dụng SHALL chỉ thay phần trong phạm vi đã nhắm. Các segment ngoài phạm vi SHALL giữ nguyên định danh của chúng, nên liên kết và nguồn gốc của chúng không bị ảnh hưởng.

#### Scenario: Phần ngoài phạm vi giữ nguyên
- **WHEN** người dùng áp dụng một đề xuất cho một đoạn giữa chương
- **THEN** các segment ở những đoạn khác giữ nguyên định danh, liên kết và nguồn gốc của chúng

### Requirement: Đề xuất đã cũ không âm thầm ghi đè

Khi văn bản trong phạm vi đã đổi sau lúc đề xuất được tạo ra, hệ thống SHALL NOT âm thầm thay nó. Hệ thống SHALL nói rõ văn bản đã đổi và để người dùng quyết định.

#### Scenario: Người dùng sửa tay sau khi nhận đề xuất
- **WHEN** người dùng tự sửa phạm vi đó rồi mới bấm Áp dụng đề xuất nhận trước đó
- **THEN** hệ thống báo văn bản đã đổi kể từ lúc hỏi, và không ghi đè khi chưa được xác nhận

### Requirement: Hội thoại sống trong một phiên và panel nói rõ điều đó

Panel SHALL giữ được nhiều lượt hỏi–đáp có mạch trong một phiên làm việc: lượt sau biết các lượt trước. Hội thoại SHALL mất khi panel đóng hoặc ứng dụng tắt, và panel SHALL nói rõ điều đó thay vì để người dùng tưởng nó được lưu. Người dùng SHALL bắt đầu được một hội thoại mới mà không phải đóng panel.

#### Scenario: Lượt sau biết lượt trước
- **WHEN** người dùng hỏi tiếp một câu dựa vào câu trả lời trước trong cùng phiên
- **THEN** câu hỏi được gửi kèm các lượt trước đó của phiên

#### Scenario: Đóng panel là mất hội thoại
- **WHEN** người dùng đóng panel rồi mở lại
- **THEN** hội thoại trống, và panel đã nói trước rằng hội thoại không được lưu

#### Scenario: Hội thoại mới
- **WHEN** người dùng bắt đầu hội thoại mới
- **THEN** các lượt trước không còn được gửi kèm, và panel vẫn mở

### Requirement: Ngữ cảnh của chương đang mở luôn được gửi

Mọi lượt hỏi SHALL mang theo **bản gốc của chương đang mở**, không phụ thuộc vào việc người dùng có bôi chọn gì, có đặt con trỏ ở đâu, hay chương đã được dịch chưa. Khi chương đã có bản dịch, bản dịch hiện có SHALL đi kèm. Khi một khối bị cắt vì quá dài, hệ thống SHALL nói rõ là đã cắt.

#### Scenario: Chương chưa dịch
- **WHEN** người dùng mở một chương chưa có bản dịch và hỏi về việc dịch chương đó
- **THEN** bản gốc của chương nằm trong ngữ cảnh đã gửi, và câu trả lời không đòi người dùng cung cấp lại nội dung

#### Scenario: Chưa đặt con trỏ vào đâu
- **WHEN** người dùng mở panel rồi hỏi ngay mà chưa bấm vào pane bản dịch
- **THEN** ngữ cảnh vẫn có bản gốc của chương

#### Scenario: Hai bên khác số đoạn
- **WHEN** bản gốc và bản dịch có số đoạn khác nhau
- **THEN** bản gốc của chương vẫn được gửi; chỉ phần ghép theo từng đoạn là không có

#### Scenario: Khối quá dài
- **WHEN** bản gốc dài hơn mức một khối ngữ cảnh mang được
- **THEN** phần gửi đi bị cắt và danh sách "đã gửi kèm" nói rõ đã cắt còn bao nhiêu

### Requirement: Chương chưa dịch thì câu hỏi là về cả chương

Khi bản dịch của chương còn trống, hệ thống SHALL coi mọi câu hỏi là về **cả chương** và SHALL nói rõ điều đó, thay vì hỏi về một đoạn trong một bản dịch không tồn tại.

#### Scenario: Mở một chương trống
- **WHEN** người dùng mở panel ở một chương chưa có bản dịch
- **THEN** phạm vi hiện ra là cả chương, và người dùng không đổi được sang phạm vi hẹp hơn cho tới khi có bản dịch

### Requirement: Đọc được phần khác của tác phẩm, nhưng không ghi vào đó

Hệ thống SHALL cho model **đọc** nội dung khác của cùng tác phẩm khi câu hỏi cần tới — ít nhất là danh sách chương và văn bản của một chương bất kỳ. Model SHALL NOT ghi, sửa hay xóa bất cứ thứ gì bằng cơ chế này: mọi thay đổi bản dịch vẫn phải đi qua đường duyệt đề xuất đã định. Panel SHALL cho biết model đã đọc những gì. Số lần đọc trong một lượt SHALL có trần.

#### Scenario: Hỏi về một chương không mở
- **WHEN** người dùng hỏi về nội dung của một chương khác trong cùng tác phẩm
- **THEN** model đọc được chương đó và trả lời, mà không cần người dùng mở nó ra

#### Scenario: Panel nói rõ đã đọc gì
- **WHEN** model đọc một chương để trả lời
- **THEN** người dùng xem được danh sách những gì đã được đọc trong lượt đó

#### Scenario: Không có đường ghi
- **WHEN** người dùng yêu cầu model tự sửa một chương khác
- **THEN** không có thay đổi nào xảy ra với chương đó, và câu trả lời nói rõ việc ghi phải do người dùng duyệt

#### Scenario: Trần số lần đọc
- **WHEN** model yêu cầu đọc nhiều lần hơn trần đã định trong một lượt
- **THEN** lượt đó dừng việc đọc và trả lời bằng những gì đã có, thay vì đọc tiếp không giới hạn

### Requirement: Bản dịch trống thì đề xuất vào thẳng, bản dịch có chữ thì phải duyệt

Khi bản dịch của chương còn **trống**, hệ thống MAY đưa kết quả vào thẳng pane bản dịch mà không cần bước duyệt, vì không có chữ nào bị ghi đè; thao tác đó SHALL vẫn hoàn tác được bằng một lần hoàn tác. Khi bản dịch **đã có chữ**, hệ thống SHALL NOT đưa gì vào trước khi người dùng nhìn thấy thay đổi và đồng ý.

#### Scenario: Dịch lần đầu vào pane trống
- **WHEN** người dùng yêu cầu dịch cả chương khi bản dịch còn trống
- **THEN** bản dịch xuất hiện trong pane, và một lần hoàn tác trả lại trạng thái trống

#### Scenario: Chương đã có bản dịch
- **WHEN** người dùng yêu cầu dịch lại cả chương mà bản dịch đã có chữ
- **THEN** hệ thống hiện thay đổi và chờ người dùng đồng ý trước khi ghi

### Requirement: Mỗi lượt cho biết đã tốn gì

Khi nhà cung cấp báo lượng token đã dùng, panel SHALL hiện số đó cho lượt vừa chạy, cùng số tiền tương ứng khi biết giá của model. Khi không biết giá, panel SHALL nói là **chưa biết giá**, SHALL NOT hiện số không.

#### Scenario: Nhà cung cấp báo lượng dùng
- **WHEN** một lượt chạy xong và nhà cung cấp báo số token
- **THEN** panel hiện số token của lượt đó, và số tiền nếu model có giá trong bản chụp đi kèm

#### Scenario: Model không có giá
- **WHEN** model đang dùng không có giá trong bản chụp
- **THEN** panel hiện số token và nói rõ chưa biết giá, không hiện 0 đồng
