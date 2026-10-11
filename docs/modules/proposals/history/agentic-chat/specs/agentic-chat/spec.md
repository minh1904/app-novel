> **Tài liệu lịch sử — superseded ngày 2026-10-11.** Spec này không hiện hành, không được archive hay
> merge vào main specs. Xem [ghi chú vòng đời](../../README.md); contract đích thuộc
> `app-agent-foundation`.

## Purpose

Quy định panel AI chat hoạt động như một agent: người dùng chỉ gõ câu hỏi, model tự gọi tool để đọc dữ
liệu tác phẩm và đề xuất thay đổi. Mọi thay đổi vẫn đi qua đề xuất chờ duyệt.

## ADDED Requirements

### Requirement: Ô soạn không có chế độ hay phạm vi

Ô soạn của panel AI SHALL chỉ gồm ô nhập, menu chọn model và nút gửi hoặc dừng. Ô soạn SHALL NOT có lựa
chọn chế độ (Hỏi, Sửa, Áp dụng) hay phạm vi (cả chương, đoạn đang sửa). Một lượt gửi SHALL NOT mang
trường chế độ, khối ngữ cảnh hay khoảng văn bản.

#### Scenario: Mở panel lần đầu
- **WHEN** người dùng mở panel AI ở một chương
- **THEN** ô soạn chỉ có ô nhập, menu model và nút gửi; không có nút chọn chế độ hay phạm vi

#### Scenario: Gửi một câu hỏi
- **WHEN** người dùng gõ "dịch lại đoạn này cho tự nhiên hơn" rồi nhấn Enter
- **THEN** lượt gửi chỉ chứa câu hỏi, lịch sử, mục model và vị trí người dùng; không chứa văn bản chương

### Requirement: Vị trí người dùng thay cho ngữ cảnh gửi kèm

Mỗi lượt SHALL cho model biết người dùng đang đứng ở đâu: tác phẩm, chương đang mở (số và tên), đoạn mà
con trỏ đang ở ở mỗi phía, và khoảng đoạn đang chọn nếu có. Thông tin này SHALL chỉ là vị trí, không chứa
nội dung văn bản. Model SHALL phải gọi tool để đọc nội dung. "Chương này", "đoạn này" trong câu hỏi SHALL
được hiểu theo vị trí đó.

#### Scenario: Hỏi về đoạn đang chọn
- **WHEN** người dùng chọn đoạn 12–14 ở bản dịch rồi hỏi "câu này có sai xưng hô không"
- **THEN** model biết vùng chọn là đoạn 12–14 của chương đang mở, và gọi tool đọc các đoạn đó trước khi
  trả lời

#### Scenario: Không chọn gì
- **WHEN** con trỏ ở đoạn 5 và không có vùng chọn
- **THEN** vị trí gửi đi ghi đoạn con trỏ là 5 và không có vùng chọn

### Requirement: Đề xuất chỉ sinh ra từ tool ghi

Một lượt chat SHALL tạo đề xuất chỉ qua tool ghi. Câu trả lời bằng chữ của model, kể cả khi chứa bản dịch
hay khối code, SHALL NOT tự trở thành đề xuất. Đề xuất từ chat SHALL luôn ở chế độ duyệt trước, không tự
áp dụng. Mỗi đề xuất SHALL ghi lượt chat đã tạo ra nó.

#### Scenario: Model viết bản dịch trong câu trả lời
- **WHEN** model trả lời bằng một đoạn dịch mà không gọi tool ghi
- **THEN** không có đề xuất nào được tạo và bản dịch trong editor giữ nguyên

#### Scenario: Model gọi tool sửa
- **WHEN** model gọi `propose_edit` cho đoạn 3 của bản dịch
- **THEN** một đề xuất chờ duyệt xuất hiện trong hàng chờ và dưới lượt chat đó, còn bản dịch chưa đổi
  cho tới khi người dùng chấp nhận

### Requirement: Đề xuất hiện dưới lượt chat

Dưới mỗi câu trả lời, panel SHALL hiện các đề xuất mà lượt đó tạo ra. Mỗi đề xuất SHALL có loại (sửa
đoạn, dịch đoạn, thuật ngữ), khoảng đoạn hoặc thuật ngữ, phần trước và sau khi đổi, cùng nút Chấp nhận và
Bỏ. Trạng thái của đề xuất (chờ, đã áp dụng, đã bỏ, xung đột) SHALL cập nhật theo hàng chờ đề xuất của
tác phẩm.

#### Scenario: Chấp nhận từ lượt chat
- **WHEN** người dùng bấm Chấp nhận trên đề xuất dưới lượt chat
- **THEN** đề xuất được áp dụng giống như khi chấp nhận từ hàng chờ, và thẻ chuyển sang "Đã áp dụng"

#### Scenario: Bản dịch đổi trước khi duyệt
- **WHEN** người dùng tự sửa đúng đoạn đó trước khi chấp nhận
- **THEN** thẻ đề xuất báo xung đột như hàng chờ hiện nay, không ghi đè

### Requirement: Dòng tóm tắt các lượt gọi tool

Các lượt gọi tool liên tiếp trong một câu trả lời SHALL được gộp thành một dòng tóm tắt. Dòng này đếm theo
loại: số chương đã đọc, số lần tìm, số tra cứu thuật ngữ hoặc xưng hô, số đề xuất. Khi lượt còn chạy,
dòng SHALL cho thấy đang chạy và tên lần gọi gần nhất. Bấm vào dòng SHALL mở danh sách từng lần gọi, mỗi
dòng có trạng thái (xong, lỗi) và phần mô tả hiện có của lần gọi đó.

#### Scenario: Lượt đọc rồi đề xuất
- **WHEN** model đọc 2 chương, tìm 1 lần rồi tạo 1 đề xuất sửa
- **THEN** dòng tóm tắt ghi "Đã đọc 2 chương, tìm 1 lần, đề xuất 1 sửa", và mở ra thấy 4 dòng chi tiết

#### Scenario: Một lần gọi lỗi
- **WHEN** một lần đọc trả lỗi vì chương không tồn tại
- **THEN** dòng chi tiết của lần đó có dấu lỗi kèm lý do, còn dòng tóm tắt vẫn đếm các lần còn lại

### Requirement: Phiên cũ vẫn đọc được

Các lượt đã lưu trước change này, có chế độ, ngữ cảnh gửi kèm và đề xuất từ khối rào, SHALL vẫn hiện được
trong lịch sử phiên, cùng nhãn chế độ cũ và đề xuất của chúng. Mở lại một phiên cũ rồi hỏi tiếp SHALL
chạy theo cách mới.

#### Scenario: Mở phiên cũ
- **WHEN** người dùng mở một phiên có lượt ở chế độ Sửa đã lưu từ trước
- **THEN** lượt đó vẫn hiện câu hỏi, câu trả lời và đề xuất cũ, còn lượt hỏi tiếp không có chế độ
