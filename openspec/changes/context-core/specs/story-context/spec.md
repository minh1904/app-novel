# story-context Specification

## Purpose
Lưu và truy vấn các quy ước dịch của một tác phẩm — thuật ngữ và tên riêng, nhân vật, cặp xưng hô, thế giới quan, văn phong, tóm tắt — dưới dạng các mục có hiệu lực theo chương, có trạng thái duyệt và có nguồn gốc, để bản dịch của cả bộ truyện nhất quán mà người dùng vẫn giữ quyền quyết định cuối.

## ADDED Requirements

### Requirement: Mục ngữ cảnh thuộc một tác phẩm và có kiểu

Hệ thống SHALL lưu ngữ cảnh dịch thành các **mục** nằm trong dữ liệu của chính tác phẩm, mỗi mục có đúng một kiểu trong sáu kiểu: thuật ngữ, nhân vật, cặp xưng hô, thế giới quan, văn phong, tóm tắt. Mục SHALL còn nguyên sau khi đóng và mở lại tác phẩm. Tác phẩm chưa có mục nào SHALL mở và sửa được bình thường, không báo lỗi.

#### Scenario: Tạo mục và mở lại
- **WHEN** người dùng tạo một mục thuật ngữ rồi đóng và mở lại tác phẩm
- **THEN** mục đó còn nguyên với đúng kiểu và đúng nội dung đã nhập

#### Scenario: Tác phẩm chưa có ngữ cảnh
- **WHEN** mở một tác phẩm tạo từ phiên bản trước khi có ngữ cảnh
- **THEN** tác phẩm mở bình thường, danh sách mục ngữ cảnh trống, và mọi thao tác cũ không đổi hành vi

#### Scenario: Ngữ cảnh đi theo tác phẩm
- **WHEN** sao lưu rồi phục hồi một tác phẩm
- **THEN** toàn bộ mục ngữ cảnh của tác phẩm đó được phục hồi cùng nội dung chương

### Requirement: Hiệu lực theo chương

Mỗi mục SHALL có chương bắt đầu hiệu lực, và có thể có chương kết thúc hiệu lực. Hệ thống SHALL trả về được **tập mục có hiệu lực tại một chương cụ thể**: mục có chương bắt đầu lớn hơn chương đang hỏi SHALL NOT nằm trong tập đó, mục đã có chương kết thúc nhỏ hơn chương đang hỏi cũng SHALL NOT nằm trong tập đó. Khi hai mục cùng mô tả một đối tượng nhưng khác chương bắt đầu, tập hiệu lực tại một chương SHALL chỉ chứa mục có chương bắt đầu gần nhất không vượt quá chương đó.

#### Scenario: Cặp xưng hô đổi giữa truyện
- **WHEN** một cặp nhân vật có một mục xưng hô từ chương 1 và một mục khác từ chương 14, và hệ thống hỏi tập hiệu lực tại chương 10
- **THEN** chỉ mục từ chương 1 nằm trong tập; hỏi tại chương 20 thì chỉ mục từ chương 14 nằm trong tập

#### Scenario: Mục chưa tới lúc có hiệu lực
- **WHEN** một mục có chương bắt đầu là 50 và hệ thống hỏi tập hiệu lực tại chương 3
- **THEN** mục đó không nằm trong tập, kể cả khi nội dung của nó khớp với văn bản chương 3

#### Scenario: Mục đã hết hiệu lực
- **WHEN** một mục có chương kết thúc là 30 và hệ thống hỏi tập hiệu lực tại chương 31
- **THEN** mục đó không nằm trong tập nhưng vẫn đọc và sửa được trong danh sách

### Requirement: Trạng thái duyệt và nguồn gốc

Mỗi mục SHALL có trạng thái **đã duyệt**, **chờ duyệt** hoặc **đã loại**, và SHALL ghi nguồn gốc: do người dùng nhập, do AI đề xuất (kèm định danh model), hoặc nhập từ nguồn ngoài. Chỉ mục **đã duyệt** SHALL được dùng làm ngữ cảnh gửi cho provider. Duyệt một mục chờ duyệt SHALL làm nó có hiệu lực cho lần dịch sau đó mà không cần thao tác thêm.

#### Scenario: Mục chờ duyệt không được dùng
- **WHEN** một mục ở trạng thái chờ duyệt và hệ thống lấy tập mục để gửi cho provider
- **THEN** mục đó không nằm trong tập

#### Scenario: Duyệt rồi dùng ngay
- **WHEN** người dùng duyệt một mục chờ duyệt rồi yêu cầu dịch lại chương liên quan
- **THEN** mục đó nằm trong tập gửi cho provider ở lần dịch đó

#### Scenario: Nguồn gốc giữ được và lọc được
- **WHEN** liệt kê các mục có nguồn gốc do AI đề xuất
- **THEN** chỉ các mục đó được trả về, kèm định danh model đã đề xuất chúng

### Requirement: Mức dùng cho AI

Mỗi mục SHALL có một mức dùng cho AI trong bốn giá trị: **luôn gửi**, **gửi khi khớp**, **không gửi khi khớp**, **không bao giờ gửi**. Mục ở mức *không bao giờ gửi* SHALL NOT xuất hiện trong bất kỳ khối ngữ cảnh nào gửi cho provider, kể cả khi nội dung của nó khớp với văn bản đang dịch. Kiểu **thế giới quan** và **tóm tắt** SHALL mặc định ở mức *không bao giờ gửi*.

#### Scenario: Mục riêng tư không bao giờ rời máy
- **WHEN** một mục ở mức không bao giờ gửi và văn bản đang dịch chứa đúng từ khóa của nó
- **THEN** mục đó không có trong khối ngữ cảnh nào, và không có nội dung nào của nó đi tới provider

#### Scenario: Mặc định theo kiểu
- **WHEN** tạo một mục kiểu thế giới quan mà không khai mức dùng cho AI
- **THEN** mục đó ở mức không bao giờ gửi

### Requirement: Cặp xưng hô có chiều và không mồ côi

Một mục **cặp xưng hô** SHALL tham chiếu hai mục nhân vật theo vai người nói và người nghe, và SHALL mang cách người nói tự gọi mình cùng cách người nói gọi người nghe. Chiều ngược lại SHALL là một mục riêng: lưu một chiều SHALL NOT tự sinh chiều kia. Hệ thống SHALL NOT để tồn tại mục cặp xưng hô tham chiếu tới một nhân vật không còn trong tác phẩm; khi xóa một nhân vật đang có cặp xưng hô, hệ thống SHALL cho biết trước số cặp chịu ảnh hưởng và xóa chúng trong cùng một thao tác.

#### Scenario: Hai chiều là hai mục
- **WHEN** người dùng khai cách A gọi B rồi đọc lại danh sách
- **THEN** chỉ có một mục cho chiều A→B; chiều B→A chưa tồn tại tới khi được khai riêng

#### Scenario: Xóa nhân vật có cặp xưng hô
- **WHEN** người dùng xóa một nhân vật đang xuất hiện trong ba mục cặp xưng hô
- **THEN** hệ thống báo trước ba mục đó sẽ bị xóa, và sau khi xác nhận thì không còn mục nào tham chiếu nhân vật đã xóa

### Requirement: Dạng viết khác và thuật ngữ bị cấm

Một mục thuật ngữ hoặc nhân vật SHALL nhận thêm các **dạng viết khác** (tên đầy đủ, gọi tắt, biệt danh) được dùng cho việc khớp văn bản như chính mục đó. Một dạng viết SHALL thuộc đúng một mục trong cùng tác phẩm; khai trùng SHALL bị từ chối bằng lỗi xác thực và SHALL NOT thay đổi dữ liệu. Một mục thuật ngữ SHALL đánh dấu được là **bị cấm** — cách dịch không được dùng.

#### Scenario: Khớp qua dạng viết khác
- **WHEN** một mục nhân vật có dạng gọi tắt và văn bản chỉ chứa dạng gọi tắt đó
- **THEN** mục đó được coi là xuất hiện trong văn bản

#### Scenario: Dạng viết trùng giữa hai mục
- **WHEN** người dùng khai một dạng viết đã thuộc mục khác
- **THEN** thao tác bị từ chối với lỗi xác thực và không mục nào bị sửa

### Requirement: Đọc và ghi mục ngữ cảnh qua API của tiến trình chính

Renderer SHALL đọc và ghi mục ngữ cảnh chỉ qua API có kiểu của tiến trình chính, với các thao tác: liệt kê (lọc được theo kiểu, trạng thái và chương có hiệu lực), tạo, sửa, xóa, duyệt và loại. Đầu vào sai kiểu hoặc tham chiếu không tồn tại SHALL trả lỗi có phân loại và SHALL NOT thay đổi dữ liệu.

#### Scenario: Liệt kê theo kiểu và theo chương
- **WHEN** renderer yêu cầu các mục cặp xưng hô có hiệu lực tại chương 12
- **THEN** chỉ các mục đúng kiểu và đúng phạm vi hiệu lực được trả về

#### Scenario: Tham chiếu không tồn tại
- **WHEN** renderer tạo một cặp xưng hô trỏ tới một nhân vật không có trong tác phẩm
- **THEN** thao tác trả lỗi xác thực và không mục nào được tạo
