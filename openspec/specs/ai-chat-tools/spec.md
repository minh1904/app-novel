# ai-chat-tools Specification

## Purpose
Đặc tả các tool chỉ đọc mà model trong panel chat được tự gọi trong tác phẩm đang mở — liệt kê chương,
đọc chương theo trang, tìm trong tác phẩm — cùng giới hạn mỗi lượt và cách từng lần gọi hiện cho người
dùng.

## Requirements

### Requirement: Tool chỉ đọc và buộc vào tác phẩm đang mở

Mọi tool của panel chat SHALL chỉ đọc dữ liệu, không tool nào được tạo, sửa hay xóa văn bản, liên kết,
glossary hay bất kỳ bản ghi nào. Phạm vi tác phẩm SHALL được buộc khi dựng tool; không tool nào nhận
tham số chỉ định tác phẩm khác.

#### Scenario: Không có tham số chọn tác phẩm
- **WHEN** model gọi bất kỳ tool nào với một tham số mang ID tác phẩm khác
- **THEN** tham số đó bị bỏ qua hoặc báo không hợp lệ, và kết quả chỉ chứa dữ liệu của tác phẩm đang mở

#### Scenario: Gọi tool không làm đổi dữ liệu
- **WHEN** model gọi lần lượt mọi tool có trong danh sách
- **THEN** revision văn bản, liên kết và mọi bản ghi của tác phẩm giữ nguyên

### Requirement: Đọc chương theo trang

`read_chapter` SHALL nhận số chương, phía (bản gốc hoặc bản dịch) và tùy chọn vị trí bắt đầu là số đoạn
(bắt đầu từ 1) hoặc con trỏ đọc tiếp do lần đọc trước trả về. Mỗi kết quả SHALL ghi rõ: các đoạn đã trả
(từ–đến) trên tổng số đoạn của phía đó, số ký tự đã trả, revision văn bản, còn phần chưa đọc hay không,
và con trỏ để đọc tiếp khi còn. Một đoạn là một dòng không trống của văn bản.

#### Scenario: Chương ngắn đọc một lần
- **WHEN** model đọc một chương có độ dài dưới trần dung lượng mỗi lần đọc
- **THEN** kết quả chứa toàn bộ chương, ghi đoạn 1 đến đoạn cuối trên tổng, và báo không còn phần chưa đọc

#### Scenario: Chương dài đọc nhiều lần
- **WHEN** model đọc một chương dài hơn trần rồi gọi lại với con trỏ vừa nhận
- **THEN** lần sau bắt đầu đúng chỗ lần trước dừng, không lặp và không bỏ sót ký tự nào

#### Scenario: Bắt đầu từ một đoạn
- **WHEN** model đọc với vị trí bắt đầu là đoạn 40 của chương có 120 đoạn
- **THEN** kết quả bắt đầu từ đoạn 40 và ghi rõ vị trí đó

#### Scenario: Vị trí ngoài phạm vi
- **WHEN** model yêu cầu đoạn bắt đầu lớn hơn tổng số đoạn
- **THEN** tool trả lỗi nói rõ chương có bao nhiêu đoạn, không trả văn bản rỗng như thể chương trống

### Requirement: Trần dung lượng mỗi lần đọc, không cắt im lặng

Mỗi lần đọc SHALL trả không quá một trần ký tự cố định. Khi một đoạn đơn lẻ dài hơn phần trần còn lại,
tool SHALL trả phần đầu của đoạn đó và con trỏ trỏ vào giữa đoạn, thay vì vượt trần hoặc bỏ cả đoạn.
Mọi lần văn bản trả về ít hơn phần còn lại của chương SHALL kèm thông báo còn tiếp.

#### Scenario: Một đoạn dài hơn trần
- **WHEN** chương có một đoạn dài gấp đôi trần và model đọc từ đoạn đó
- **THEN** lần đọc đầu trả đúng tới trần, báo đoạn chưa hết và trả con trỏ; lần đọc tiếp trả phần còn lại của đoạn

#### Scenario: Không có cắt im lặng
- **WHEN** bất kỳ lần đọc nào trả ít hơn phần còn lại của chương
- **THEN** nội dung trả về cho model có dòng báo còn tiếp kèm vị trí đã dừng

### Requirement: Văn bản đổi giữa các lần đọc

Con trỏ SHALL mang revision văn bản lúc đọc. Khi con trỏ thuộc revision cũ hơn revision hiện tại, tool
SHALL vẫn đọc tiếp từ cùng số đoạn nhưng SHALL báo rõ văn bản đã đổi kể từ lần đọc trước và vị trí có
thể lệch.

#### Scenario: Người dùng sửa chương giữa hai lần đọc
- **WHEN** người dùng lưu bản dịch chương 3 sau khi model đã đọc trang đầu, rồi model đọc tiếp bằng con trỏ cũ
- **THEN** kết quả nêu revision cũ và mới, cảnh báo vị trí có thể lệch, và bắt đầu ở đầu đoạn mà con trỏ trỏ tới

#### Scenario: Con trỏ hỏng
- **WHEN** model gửi con trỏ không đọc được hoặc thuộc chương khác
- **THEN** tool trả lỗi nói con trỏ không hợp lệ và gợi ý đọc lại bằng số đoạn

### Requirement: Tìm trong tác phẩm

`search_work` SHALL nhận chuỗi cần tìm và phía (bản gốc hoặc bản dịch), tìm trên mọi chương của tác phẩm
đang mở theo nội dung đã lưu, và trả: tổng số chỗ khớp, số chương có chỗ khớp, và tối đa một số kết quả
cố định. Mỗi kết quả SHALL có số chương, tên chương, số đoạn ở phía được tìm và đoạn trích quanh chỗ
khớp. Chuỗi gồm chữ CJK SHALL khớp được mà không cần dấu cách quanh nó.

#### Scenario: Tìm tên riêng tiếng Nhật
- **WHEN** model tìm `魔王` ở bản gốc của tác phẩm có từ đó trong 9 chương
- **THEN** kết quả báo tổng số chỗ khớp và 9 chương, liệt kê kết quả theo thứ tự chương rồi đoạn, mỗi kết quả có đoạn trích chứa `魔王`

#### Scenario: Quá nhiều chỗ khớp
- **WHEN** số chỗ khớp lớn hơn số kết quả tối đa
- **THEN** tool trả đúng số kết quả tối đa và nói rõ đã bỏ bao nhiêu chỗ khớp, kèm gợi ý thu hẹp chuỗi tìm

#### Scenario: Không có chỗ khớp
- **WHEN** chuỗi tìm không xuất hiện ở phía được chọn
- **THEN** tool báo không có chỗ khớp và số chương đã tìm, không trả lỗi

#### Scenario: Chuỗi tìm không hợp lệ
- **WHEN** chuỗi tìm rỗng, chỉ có khoảng trắng hoặc dài quá giới hạn
- **THEN** tool trả lỗi nêu giới hạn, không quét tác phẩm

### Requirement: Kết quả tìm trỏ sang phía tương ứng theo liên kết căn chỉnh

Với mỗi kết quả tìm, tool SHALL kèm đoạn tương ứng ở phía kia nếu chỗ khớp nằm trong một segment có liên
kết căn chỉnh tới phía kia. Tool SHALL NOT suy ra đoạn tương ứng từ số thứ tự đoạn. Khi không có liên
kết, hoặc liên kết đang cần xem lại hay đã hỏng, kết quả SHALL nói rõ tình trạng đó và chỉ cách đọc phía
kia (số chương để gọi `read_chapter`).

#### Scenario: Có liên kết căn chỉnh
- **WHEN** chỗ khớp ở bản gốc nằm trong segment đã liên kết với hai segment bản dịch
- **THEN** kết quả kèm văn bản của hai segment bản dịch đó, theo thứ tự trong bản dịch

#### Scenario: Chưa căn chỉnh
- **WHEN** chương có bản dịch nhưng segment chứa chỗ khớp không có liên kết
- **THEN** kết quả ghi "chưa căn chỉnh" và chỉ dẫn đọc bản dịch của chương đó, không đưa đoạn dịch cùng số thứ tự

#### Scenario: Liên kết cần xem lại
- **WHEN** liên kết của segment chứa chỗ khớp có trạng thái cần xem lại hoặc hỏng
- **THEN** kết quả vẫn kèm đoạn tương ứng nhưng ghi rõ liên kết chưa chắc đúng

### Requirement: Giới hạn mỗi lượt chat

Mỗi lượt chat SHALL có trần số vòng gọi tool và trần tổng ký tự mà tool trả cho model. Khi chạm trần ký
tự, lần gọi tool tiếp theo SHALL trả thông báo đã hết ngân sách đọc của lượt thay vì văn bản. Vòng cuối
SHALL không mời tool để model buộc phải trả lời bằng những gì đã đọc.

#### Scenario: Hết ngân sách đọc
- **WHEN** model đã nhận đủ trần tổng ký tự trong lượt và gọi `read_chapter` lần nữa
- **THEN** tool trả thông báo hết ngân sách đọc, không trả văn bản, và lượt vẫn kết thúc bằng một câu trả lời

#### Scenario: Hết vòng gọi tool
- **WHEN** model vẫn muốn gọi tool ở vòng cuối được phép
- **THEN** request vòng đó không kèm danh sách tool và model trả lời bằng chữ

### Requirement: Mỗi lần gọi tool hiện trên panel

Panel SHALL hiện một dòng cho mỗi lần gọi tool trong nhóm "AI đã đọc", tách khỏi nhóm "Đã gửi kèm". Dòng
đó SHALL nói tool đọc gì, không chứa nội dung đã đọc: với `read_chapter` là chương, phía, đoạn từ–đến
trên tổng, số ký tự và còn tiếp hay không; với `search_work` là chuỗi tìm, phía, tổng chỗ khớp, số chương
và số kết quả đã trả; với lần gọi lỗi là lý do lỗi.

#### Scenario: Đọc nhiều trang
- **WHEN** model đọc chương 5 ba lần liên tiếp bằng con trỏ
- **THEN** panel có ba dòng, mỗi dòng ghi khoảng đoạn của lần đọc đó, dòng cuối ghi đã hết chương

#### Scenario: Tìm kiếm
- **WHEN** model tìm `魔王` ở bản gốc
- **THEN** panel có một dòng ghi chuỗi tìm, phía, tổng chỗ khớp và số kết quả đã trả
