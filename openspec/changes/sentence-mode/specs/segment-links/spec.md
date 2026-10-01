## Purpose

Quy định cách bản dịch của từng hàng (một segment bản gốc) được ghi và nối với bản gốc ở tầng dữ liệu, để mode Từng câu và mode Toàn văn luôn cùng thấy một văn bản dịch, và để việc ghi một hàng không làm hỏng các hàng khác.

## ADDED Requirements

### Requirement: Một hàng là một segment bản gốc cùng các segment dịch nối với nó

Hệ thống SHALL coi một hàng là một segment bản gốc cùng các segment dịch được nối với nó bằng các liên kết của chương. Một hàng SHALL không có bản dịch (không có liên kết tới segment dịch nào), hoặc có một hay nhiều segment dịch liền nhau trong văn bản dịch. Văn bản bản dịch của hàng SHALL là phần văn bản dịch từ đầu segment dịch đầu tiên tới cuối segment dịch cuối cùng của hàng.

#### Scenario: Hàng có hai câu dịch
- **WHEN** segment gốc "我来了。" được nối với hai segment dịch "Tôi đến rồi." và "Thật đấy."
- **THEN** bản dịch của hàng là phần văn bản từ đầu "Tôi đến rồi." tới cuối "Thật đấy."

### Requirement: Ghi bản dịch của một hàng trong một thao tác

Ghi bản dịch của một hàng SHALL thay đổi văn bản bản dịch, các segment dịch và liên kết của hàng trong một thao tác duy nhất: hoặc tất cả cùng đổi, hoặc không gì đổi. Thao tác SHALL kèm revision của văn bản bản dịch mà người gọi đã đọc, và SHALL bị từ chối với lỗi xung đột, không đổi dữ liệu, khi revision đó không còn là revision hiện tại. Segment dịch của các hàng khác SHALL giữ nguyên ID, nội dung và liên kết, kể cả khi chúng nằm cùng dòng với hàng vừa ghi.

Với hàng đã có bản dịch, văn bản của hàng SHALL được thay đúng vùng của nó. Với hàng chưa có bản dịch, văn bản SHALL được chèn ngay sau bản dịch của hàng gần nhất phía trước đã có bản dịch, hoặc ngay trước bản dịch của hàng gần nhất phía sau nếu phía trước không có, hoặc ở cuối văn bản nếu không hàng nào có bản dịch; ngăn cách với bản dịch bên cạnh bằng một xuống dòng khi hai segment gốc tương ứng nằm khác dòng, bằng một dấu cách khi cùng dòng. Văn bản của hàng SHALL được chuẩn hóa thành một đoạn: xuống dòng và khoảng trắng liền nhau trong nó thành một dấu cách, bỏ khoảng trắng hai đầu. Văn bản trống SHALL bỏ bản dịch của hàng cùng liên kết của nó và dọn một chỗ ngăn cách thừa, không để lại hai dấu cách hay dòng trống mới.

Sau khi ghi, các segment dịch của hàng SHALL được chia theo quy tắc chia câu tiếng Việt, được liên kết với segment gốc của hàng bằng một liên kết mới đã soát do người dùng tạo, và được ghi nguồn gốc là do người viết. Liên kết cũ của hàng SHALL bị thay.

#### Scenario: Viết bản dịch cho hàng đầu tiên chưa dịch
- **WHEN** chương có ba hàng và bản dịch đã có cho hàng 2 và 3, và người dùng ghi "Mở đầu." cho hàng 1
- **THEN** "Mở đầu." nằm trước bản dịch của hàng 2, cách một dấu cách hoặc một xuống dòng theo vị trí bản gốc, và các segment dịch của hàng 2 và 3 giữ nguyên ID

#### Scenario: Sửa hàng đã dịch
- **WHEN** người dùng ghi "Tôi đã tới." cho hàng đang có bản dịch "Tôi đến rồi."
- **THEN** văn bản dịch chỉ đổi đúng vùng đó, hàng nối với segment mới (giữ ID của segment dịch cũ khi có thể), các hàng khác không đổi

#### Scenario: Bản dịch đã bị đổi ở nơi khác
- **WHEN** người dùng ghi một hàng với revision cũ
- **THEN** thao tác bị từ chối với lỗi xung đột và văn bản, segment và liên kết không đổi

#### Scenario: Xóa trắng
- **WHEN** người dùng ghi văn bản trống cho hàng đang có bản dịch giữa hai hàng khác
- **THEN** bản dịch của hàng và liên kết của nó mất, hàng trở lại *Chưa dịch*, và văn bản dịch không còn dấu cách đôi hay dòng trống mới ở chỗ đó

#### Scenario: Hàng viết hai câu
- **WHEN** người dùng ghi "Một. Hai." cho một hàng
- **THEN** hai segment dịch được tạo và cùng nối với segment gốc của hàng

### Requirement: Trạng thái của hàng

Trạng thái hàng SHALL được suy ra, không lưu riêng: *Chưa dịch* khi hàng không có segment dịch; *Cần kiểm tra* khi liên kết của hàng ở trạng thái cần xem lại hoặc hỏng; *AI đã dịch* khi liên kết do AI tạo và chưa soát; *Đã soát* trong các trường hợp còn lại. Khi có nhiều liên kết cho một hàng, trạng thái SHALL là trạng thái đáng chú ý nhất theo thứ tự *Cần kiểm tra*, *AI đã dịch*, *Đã soát*. Hàng người dùng vừa ghi SHALL là *Đã soát*.

#### Scenario: Chữ do người viết
- **WHEN** người dùng ghi bản dịch cho một hàng
- **THEN** hàng đó là *Đã soát*

#### Scenario: Liên kết cần xem lại
- **WHEN** một segment dịch của hàng bị xóa ở mode Toàn văn nên liên kết của hàng chuyển sang cần xem lại
- **THEN** hàng đó là *Cần kiểm tra*

### Requirement: Xác nhận một hàng

Xác nhận hàng SHALL đặt liên kết của hàng về trạng thái ổn và ghi thời điểm đã soát mà không đổi văn bản hay segment. Hàng không có liên kết SHALL không xác nhận được và thao tác đó SHALL bị từ chối với thông báo nêu lý do.

#### Scenario: Xác nhận hàng cần kiểm tra
- **WHEN** người dùng xác nhận một hàng *Cần kiểm tra*
- **THEN** hàng trở thành *Đã soát*, văn bản dịch giữ nguyên

### Requirement: Ghép theo thứ tự

Ghép theo thứ tự SHALL nối các segment dịch **chưa có liên kết** với các hàng **chưa có bản dịch**, theo thứ tự xuất hiện, tới khi hết một bên, mỗi cặp một liên kết với trạng thái cần xem lại (vì đây chỉ là ước đoán theo thứ tự). Segment dịch hay hàng thừa SHALL giữ nguyên. Thao tác SHALL không đổi văn bản, segment hay liên kết đã có, và SHALL báo số cặp đã ghép.

#### Scenario: Bản dịch viết sẵn ở Toàn văn
- **WHEN** chương có 10 hàng chưa dịch và bản dịch toàn văn có 9 segment chưa ghép
- **THEN** 9 hàng đầu được nối theo thứ tự với 9 segment dịch và là *Cần kiểm tra*, hàng 10 vẫn *Chưa dịch*, văn bản dịch không đổi
