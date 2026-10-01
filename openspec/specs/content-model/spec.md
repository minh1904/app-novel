# content-model Specification

## Purpose
Định nghĩa hợp đồng dữ liệu nội dung dùng chung cho mọi mode và cho AI: chương, văn bản theo bên có revision, segment có ID ổn định, liên kết n:m và nguồn gốc bản dịch. M0 chỉ cần lưu và đọc đúng các cấu trúc này; soạn thảo và dịch ở mốc sau.

## Requirements

### Requirement: Cấu trúc tác phẩm → chương → văn bản

Hệ thống SHALL biểu diễn một tác phẩm gồm danh sách chương có thứ tự; mỗi chương có tiêu đề và văn bản theo từng bên (bên nguồn và bên dịch), mỗi văn bản là chuỗi Markdown thuần. Tác phẩm SHALL ghi ngôn ngữ nguồn thuộc tập {Anh, Trung giản thể, Trung phồn thể, Nhật} và ngôn ngữ đích là Việt.

#### Scenario: Chương mới tạo
- **WHEN** thêm chương vào tác phẩm bằng màn chi tiết
- **THEN** chương xuất hiện đúng vị trí thứ tự và đọc văn bản nguồn hay bản dịch của nó cho kết quả rỗng hợp lệ

#### Scenario: Chương không có bản dịch
- **WHEN** chương chỉ có văn bản nguồn
- **THEN** chương vẫn hợp lệ và mở/lưu được

### Requirement: Văn bản của chương được tạo khi cần

Chương SHALL tồn tại mà chưa có bản ghi văn bản. Đọc văn bản của một bên chưa từng ghi SHALL trả nội dung rỗng với revision 0 và danh sách segment rỗng, không báo lỗi. Lần ghi đầu tiên (kèm revision 0 đã đọc) SHALL tạo bản ghi và đặt revision 1.

#### Scenario: Đọc bên chưa ghi
- **WHEN** đọc bản dịch của một chương chưa từng có bản dịch
- **THEN** nhận nội dung rỗng, revision 0 và không có segment

#### Scenario: Ghi lần đầu
- **WHEN** ghi văn bản nguồn của chương kèm revision 0
- **THEN** nội dung được lưu với revision 1 và đọc lại đúng từng ký tự

### Requirement: Văn bản có revision

Mỗi văn bản SHALL có số revision tăng sau mỗi lần nội dung thay đổi. Hệ thống SHALL từ chối ghi dựa trên revision cũ hơn revision hiện tại (xung đột) thay vì ghi đè âm thầm.

#### Scenario: Ghi đúng revision
- **WHEN** ghi nội dung mới kèm revision hiện tại
- **THEN** nội dung được lưu và revision tăng lên

#### Scenario: Ghi trên revision cũ
- **WHEN** ghi kèm revision đã lỗi thời
- **THEN** hệ thống trả lỗi xung đột và nội dung hiện có không đổi

### Requirement: Segment có ID ổn định và neo vào một revision

Hệ thống SHALL lưu segment gồm ID ổn định, bên (nguồn/dịch), vùng vị trí trong văn bản và revision văn bản mà vùng đó hợp lệ. Nội dung văn bản và toàn bộ segment của bên đó SHALL được ghi trong cùng một giao dịch; hệ thống SHALL NOT để tồn tại segment neo vào revision khác với revision văn bản hiện tại mà không được đánh dấu. Người gọi MAY đưa kèm ID cho segment đã có để giữ ID ổn định; segment không có ID SHALL được cấp ID mới.

#### Scenario: Ghi văn bản và segment cùng lúc
- **WHEN** văn bản một bên được cập nhật cùng danh sách segment mới
- **THEN** cả hai được lưu hoặc cả hai không được lưu

#### Scenario: Segment ID giữ nguyên
- **WHEN** đọc lại segment sau khi đóng và mở tác phẩm
- **THEN** ID, vùng và trạng thái của segment giống hệt trước đó

#### Scenario: Giữ ID khi ghi lại
- **WHEN** ghi lại văn bản kèm danh sách segment mang ID của các segment đã có
- **THEN** các segment đó giữ nguyên ID và mọi liên kết trỏ tới chúng còn nguyên

#### Scenario: ID của chương khác
- **WHEN** danh sách segment mang ID thuộc chương hay bên khác
- **THEN** lần ghi bị từ chối và không có dữ liệu nào đổi

### Requirement: Vùng segment hợp lệ

Vùng của segment SHALL được tính theo **đơn vị UTF-16** của chuỗi văn bản (chỉ số của chuỗi trong JavaScript và của CodeMirror), gồm vị trí đầu và cuối với 0 ≤ đầu ≤ cuối ≤ độ dài văn bản. Các segment cùng bên SHALL được sắp theo vị trí và SHALL NOT chồng lên nhau. Lần ghi có vùng không hợp lệ SHALL bị từ chối toàn bộ, kèm segment sai, và không đổi gì.

#### Scenario: Văn bản có ký tự ngoài mặt phẳng cơ bản
- **WHEN** lưu văn bản có emoji và chữ Hán hiếm kèm segment bao quanh chúng
- **THEN** sau khi đọc lại, cắt văn bản theo vùng của segment cho đúng nội dung segment, không cắt đôi một ký tự

#### Scenario: Vùng vượt độ dài
- **WHEN** ghi segment có vị trí cuối lớn hơn độ dài văn bản
- **THEN** lần ghi bị từ chối kèm lý do và văn bản cũ không đổi

#### Scenario: Segment chồng nhau
- **WHEN** hai segment cùng bên có vùng chồng lên nhau
- **THEN** lần ghi bị từ chối và không segment nào được lưu

### Requirement: Giới hạn kích thước

Mỗi văn bản SHALL có tối đa 2.000.000 đơn vị UTF-16 và mỗi bên của một chương SHALL có tối đa 50.000 segment. Lần ghi vượt giới hạn SHALL bị từ chối kèm lý do rõ ràng và không đổi gì, thay vì làm treo giao diện hay đầy bộ nhớ.

#### Scenario: Văn bản quá dài
- **WHEN** ghi văn bản dài hơn giới hạn
- **THEN** lần ghi bị từ chối kèm giới hạn và văn bản cũ không đổi

### Requirement: Chương cho biết đã có nội dung chưa

Danh sách chương SHALL cho biết với mỗi chương bên nguồn và bên dịch đã có văn bản không rỗng hay chưa, mà không phải tải nội dung. Thông tin này SHALL luôn khớp với kho sau mỗi lần ghi, xóa hay khôi phục.

#### Scenario: Có bản gốc, chưa có bản dịch
- **WHEN** chương chỉ có văn bản nguồn không rỗng
- **THEN** danh sách đánh dấu chương có bản gốc và chưa có bản dịch

#### Scenario: Xóa hết văn bản
- **WHEN** ghi văn bản rỗng cho bên nguồn của chương
- **THEN** danh sách đánh dấu chương chưa có bản gốc

### Requirement: Liên kết n:m giữa segment

Hệ thống SHALL lưu liên kết giữa segment nguồn và segment dịch theo quan hệ n:m (1:1, 1:n, n:1, n:m) và cho phép segment không có liên kết. Liên kết SHALL trỏ tới segment ID, không trỏ tới vị trí văn bản. Mỗi liên kết SHALL ghi loại (do AI tạo, do người dùng tạo), mức tin cậy và trạng thái (ổn, cần kiểm tra, hỏng).

#### Scenario: Liên kết 1:n
- **WHEN** một segment nguồn liên kết với hai segment dịch
- **THEN** cả hai thành viên được lưu cùng một liên kết và đọc lại đúng

#### Scenario: Segment không liên kết
- **WHEN** một segment nguồn không có liên kết
- **THEN** segment vẫn hợp lệ và trạng thái dịch của nó là chưa dịch, không phải lỗi

#### Scenario: Xóa segment có liên kết
- **WHEN** một segment thành viên bị xóa
- **THEN** liên kết chứa nó được đánh dấu cần kiểm tra thay vì biến mất im lặng

### Requirement: Nguồn gốc bản dịch

Hệ thống SHALL ghi nguồn gốc của bản dịch theo segment: do người dùng nhập, do AI tạo (kèm nhà cung cấp, model, thời điểm), do provider giả lập tạo hoặc nhập từ tệp. Nguồn gốc SHALL được giữ khi đóng và mở lại.

#### Scenario: Bản dịch do provider tạo
- **WHEN** một segment nhận bản dịch từ provider
- **THEN** nguồn gốc ghi loại AI kèm định danh provider/model và thời điểm

### Requirement: Không âm thầm sửa văn bản

Hệ thống SHALL NOT thay đổi nội dung văn bản người dùng đã lưu ngoài thao tác ghi tường minh của người dùng. Chuẩn hóa xuống dòng hoặc mã hóa chỉ được áp dụng khi nhập và SHALL theo quy tắc đã ghi trong đặc tả nhập liệu.

#### Scenario: Đóng và mở lại
- **WHEN** đóng và mở lại tác phẩm
- **THEN** nội dung mọi văn bản khớp từng ký tự với lần lưu cuối
