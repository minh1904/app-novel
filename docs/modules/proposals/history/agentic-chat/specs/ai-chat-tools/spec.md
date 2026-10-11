> **Tài liệu lịch sử — superseded ngày 2026-10-11.** Delta này không hiện hành, không được archive hay
> merge vào main specs. Xem [ghi chú vòng đời](../../README.md); delta `ai-chat-tools` đích thuộc
> `app-agent-foundation`.

## MODIFIED Requirements

### Requirement: Tool chỉ đọc và buộc vào tác phẩm đang mở

Tool của panel chat SHALL thuộc một trong hai loại.

- **Tool đọc** (`get_current_chapter`, `list_chapters`, `read_chapter`, `read_segments`, `search_work`,
  `list_glossary`, `list_addressing`) SHALL NOT tạo, sửa hay xóa văn bản, liên kết, glossary hay bất kỳ
  bản ghi nào.
- **Tool ghi** (`propose_edit`, `propose_translation`, `propose_glossary_term`) SHALL chỉ tạo đề xuất
  chờ duyệt, hoặc mục ngữ cảnh ở trạng thái `pending` với nguồn `ai`. Chúng SHALL NOT đổi văn bản chương
  hay mục đã duyệt.

Phạm vi tác phẩm SHALL được buộc khi dựng tool; không tool nào nhận tham số chỉ định tác phẩm khác.

#### Scenario: Không có tham số chọn tác phẩm
- **WHEN** model gọi bất kỳ tool nào với một tham số mang ID tác phẩm khác
- **THEN** tham số đó bị bỏ qua hoặc báo không hợp lệ, và kết quả chỉ chứa dữ liệu của tác phẩm đang mở

#### Scenario: Gọi tool không làm đổi dữ liệu
- **WHEN** model gọi lần lượt mọi tool đọc
- **THEN** revision văn bản, liên kết và mọi bản ghi của tác phẩm giữ nguyên

#### Scenario: Tool ghi không đổi văn bản
- **WHEN** model gọi `propose_edit` và `propose_translation`
- **THEN** revision văn bản của chương giữ nguyên, và hàng chờ có thêm đề xuất chờ duyệt

#### Scenario: Thêm thuật ngữ
- **WHEN** model gọi `propose_glossary_term` với "魔王 → Ma vương"
- **THEN** glossary có một mục mới ở trạng thái chờ duyệt, nguồn `ai`, và mọi mục đã duyệt giữ nguyên

### Requirement: Giới hạn mỗi lượt chat

Mỗi lượt chat SHALL có trần số vòng gọi tool, trần tổng ký tự mà tool trả cho model, và trần số đề xuất
mà tool ghi được tạo. Khi chạm trần ký tự, lần gọi tool đọc tiếp theo SHALL trả thông báo đã hết ngân
sách đọc của lượt thay vì văn bản. Khi chạm trần đề xuất, tool ghi SHALL trả thông báo đã đủ đề xuất của
lượt và không tạo thêm. Vòng cuối SHALL không mời tool, để model buộc phải trả lời bằng những gì đã có.

#### Scenario: Hết ngân sách đọc
- **WHEN** model đã nhận đủ trần tổng ký tự trong lượt và gọi `read_chapter` lần nữa
- **THEN** tool trả thông báo hết ngân sách đọc, không trả văn bản, và lượt vẫn kết thúc bằng một câu trả lời

#### Scenario: Hết vòng gọi tool
- **WHEN** model vẫn muốn gọi tool ở vòng cuối được phép
- **THEN** request vòng đó không kèm danh sách tool và model trả lời bằng chữ

#### Scenario: Đủ đề xuất
- **WHEN** model đã tạo đủ số đề xuất tối đa của lượt và gọi `propose_edit` lần nữa
- **THEN** không có đề xuất mới, và tool trả thông báo đã đạt trần đề xuất

### Requirement: Mỗi lần gọi tool hiện trên panel

Mỗi lần gọi tool SHALL có một dòng mô tả nói tool đã làm gì, không chứa nội dung đã đọc:

- `read_chapter`: chương, phía, đoạn từ–đến trên tổng, số ký tự và còn tiếp hay không;
- `search_work`: chuỗi tìm, phía, tổng chỗ khớp, số chương và số kết quả đã trả;
- `read_segments`: chương và khoảng đoạn;
- tra cứu glossary, xưng hô: chuỗi lọc và số mục;
- tool ghi: loại đề xuất và khoảng đoạn, hoặc thuật ngữ;
- lần gọi lỗi: lý do lỗi.

Các dòng này SHALL nằm trong danh sách chi tiết mở ra từ dòng tóm tắt của lượt, theo yêu cầu "Dòng tóm
tắt các lượt gọi tool" của capability `agentic-chat`.

#### Scenario: Đọc nhiều trang
- **WHEN** model đọc chương 5 ba lần liên tiếp bằng con trỏ
- **THEN** danh sách chi tiết có ba dòng, mỗi dòng ghi khoảng đoạn của lần đọc đó, dòng cuối ghi đã hết
  chương

#### Scenario: Tìm kiếm
- **WHEN** model tìm `魔王` ở bản gốc
- **THEN** danh sách chi tiết có một dòng ghi chuỗi tìm, phía, tổng chỗ khớp và số kết quả đã trả

## ADDED Requirements

### Requirement: Tool đọc vị trí và đoạn tương ứng

`get_current_chapter` SHALL trả các thông tin sau, không kèm văn bản: chương đang mở (số, tên, ID), tổng
số đoạn mỗi phía, đoạn con trỏ, vùng chọn của người dùng, và chương đã được dịch tới đâu. `read_segments`
SHALL nhận chương, khoảng đoạn và phía chuẩn. Kết quả là từng đoạn ở phía đó kèm đoạn tương ứng ở phía
kia lấy theo liên kết căn chỉnh. Đoạn chưa căn chỉnh SHALL được ghi rõ là chưa căn chỉnh, không đoán theo
số thứ tự. Kết quả SHALL chịu cùng trần ký tự với `read_chapter`.

#### Scenario: Đoạn đã căn chỉnh
- **WHEN** model gọi `read_segments` cho đoạn 10–12 bản gốc của chương 4
- **THEN** kết quả có ba đoạn gốc, mỗi đoạn kèm đoạn dịch được liên kết

#### Scenario: Chưa căn chỉnh
- **WHEN** một đoạn gốc chưa có liên kết
- **THEN** đoạn đó được ghi "chưa căn chỉnh" và không kèm đoạn dịch nào

### Requirement: Tool tra glossary và xưng hô

`list_glossary` SHALL trả các mục thuật ngữ đã duyệt của tác phẩm (từ gốc, biến thể, bản dịch, ghi chú),
có lọc theo chuỗi và có trần số mục. `list_addressing` SHALL trả cách xưng hô đã duyệt giữa các cặp nhân
vật, có thể lọc theo tên nhân vật. Mục chờ duyệt hoặc đã từ chối SHALL NOT được trả như đã duyệt.

#### Scenario: Lọc thuật ngữ
- **WHEN** model gọi `list_glossary` với chuỗi "魔"
- **THEN** kết quả chỉ có các mục đã duyệt chứa "魔" ở từ gốc hoặc biến thể

### Requirement: Tool ghi theo khoảng đoạn

`propose_edit` và `propose_translation` SHALL nhận chương, khoảng đoạn của bản dịch hoặc bản gốc, và văn
bản mới. App SHALL tự xác định vị trí trong bản dịch hiện tại và gắn revision làm mốc, giống đề xuất hiện
có. `propose_edit` SHALL báo lỗi khi khoảng đoạn trống, ngoài phạm vi, hoặc khi văn bản mới trùng văn bản
cũ. `propose_translation` SHALL báo lỗi khi đoạn gốc đó đã có bản dịch liên kết; khi đó model phải dùng
`propose_edit`. Kết quả trả cho model SHALL ghi mã đề xuất và trạng thái.

#### Scenario: Sửa ba đoạn
- **WHEN** model gọi `propose_edit` cho đoạn 7–9 bản dịch với văn bản mới
- **THEN** một đề xuất chờ duyệt thay đúng đoạn 7–9 được tạo, với revision bản dịch hiện tại làm mốc

#### Scenario: Dịch đoạn đã có bản dịch
- **WHEN** model gọi `propose_translation` cho một đoạn gốc đã có đoạn dịch liên kết
- **THEN** tool trả lỗi hướng dẫn dùng `propose_edit`, và không có đề xuất nào được tạo
