## Purpose

Đặc tả chế độ đầu ra có schema của lõi dịch. Chế độ này bật khi nào, phản hồi có hình dạng gì, chung
sống thế nào với đối soát id và hỏi lại, rơi về ra sao khi nhà cung cấp từ chối schema, và để lại dấu
vết gì để Lab so sánh được với chế độ chữ thường.

## ADDED Requirements

### Requirement: Chế độ schema chỉ bật khi được chọn và model hỗ trợ

Trong sản phẩm, chế độ đầu ra có schema SHALL mặc định tắt. Chỉ khi chế độ được chọn rõ ràng (cờ của
Lab hoặc cài đặt dành cho thử nghiệm), hệ thống mới SHALL gửi `response_format` kiểu `json_schema`, và
chỉ khi model được ghi nhận là hỗ trợ structured output. Nếu cấu hình model của người dùng đã đặt
`response_format` trong `extraBody`, hệ thống SHALL không bật chế độ schema, SHALL không ghi đè giá trị
người dùng đặt, và SHALL ghi lý do không bật.

#### Scenario: Mặc định không gửi schema

- **WHEN** người dùng dịch một chương với cài đặt chưa thay đổi
- **THEN** request không có trường `response_format`, và chỉ dẫn đầu ra giống hệt trước change này

#### Scenario: Model không được ghi nhận là hỗ trợ

- **WHEN** chế độ schema được chọn nhưng model không có trong catalog, hoặc catalog không khai
  structured output
- **THEN** request không có schema, lô chạy ở chế độ chữ thường, và trace ghi chế độ `text` kèm lý do
  "model chưa được ghi nhận hỗ trợ"

#### Scenario: Người dùng đã tự đặt response_format

- **WHEN** chế độ schema được chọn và `extraBody` của model có `response_format`
- **THEN** giá trị của người dùng được gửi nguyên vẹn, Mira không thêm schema, và trace ghi lý do không
  bật

### Requirement: Hình dạng phản hồi có schema

Ở chế độ schema, hệ thống SHALL yêu cầu phản hồi là một object có đúng một khóa `items`. `items` là mảng
các object, mỗi object có `id` và `dst` là chuỗi bắt buộc, và có thể có `speaker_to_listener`,
`self_ref`, `addr_ref` là chuỗi tùy chọn. Chỉ dẫn đầu ra trong system prompt SHALL mô tả đúng hình dạng
này, không mô tả mảng ở cấp gốc. Schema SHALL chỉ dùng các kiểu và từ khóa mà tài liệu nhà cung cấp liệt
kê là được hỗ trợ.

#### Scenario: Phản hồi đúng schema

- **WHEN** model trả `{"items":[{"id":"[1]","dst":"…"},{"id":"[2]","dst":"…"}]}`
- **THEN** lõi dịch đọc được hai mục và đưa vào đối soát id như với phản hồi mảng

#### Scenario: Câu thoại mang khóa xưng gọi

- **WHEN** một mục có `speaker_to_listener`, `self_ref` và `addr_ref`
- **THEN** các khóa này được giữ lại cho phép kiểm xưng hô giống như ở chế độ chữ thường

### Requirement: Parser nhận cả hai dạng phản hồi

Bộ phân tích phản hồi SHALL đọc được cả object `{"items":[…]}` lẫn mảng `[…]` ở cấp gốc, kể cả khi phản
hồi có fence markdown hoặc lời dẫn. Dạng nào cũng phải cho cùng một danh sách mục. Phản hồi của các lần
chạy cũ và của model không có schema SHALL vẫn đọc ra kết quả như trước change này.

#### Scenario: Phản hồi mảng cũ

- **WHEN** model trả mảng `[{"id":"[1]","dst":"…"}]` như trước
- **THEN** parser cho cùng kết quả như phiên bản trước change

#### Scenario: Object bọc trong fence

- **WHEN** phản hồi là "```json" theo sau là `{"items":[…]}` rồi "```"
- **THEN** parser đọc được các mục trong `items`

### Requirement: Schema không thay cho đối soát id và kiểm nội dung

Ở chế độ schema, hệ thống SHALL vẫn đối soát tập id của phản hồi với tập id đã gửi, SHALL vẫn hỏi lại
đúng một lần các id thiếu hoặc có `dst` rỗng, và SHALL vẫn chia đôi lô khi bị bộ lọc nội dung chặn. Một
id lạ SHALL bị bỏ qua và đếm là thừa. Một id lặp SHALL giữ bản đầu tiên và đếm là lặp. Phản hồi đúng
schema SHALL không được coi là bằng chứng cho thấy bản dịch đúng nghĩa hay khớp câu.

#### Scenario: Đúng schema nhưng thiếu id

- **WHEN** phản hồi đúng schema nhưng thiếu `[3]` vì model đã gộp `[3]` vào `[2]`
- **THEN** `[3]` vào danh sách thiếu và được hỏi lại một lần, giống ở chế độ chữ thường

#### Scenario: Đúng schema nhưng lặp id

- **WHEN** `items` có hai mục cùng `id` `[2]`
- **THEN** chỉ mục đầu tiên được dùng, và báo cáo Lab đếm một lần lặp id

### Requirement: Rơi về chế độ chữ thường khi schema bị từ chối

Khi nhà cung cấp từ chối request vì schema hoặc vì tham số `response_format` (lỗi được phân loại là
lỗi cấu hình hay request không hợp lệ, không phải nội dung bị chặn), hệ thống SHALL gửi lại đúng lô đó
**một lần** ở chế độ chữ thường, với cùng ngữ cảnh. Lần rơi về SHALL được ghi trên kết quả lô và trace.
Lỗi này SHALL không được báo cho người dịch thành "nhà cung cấp từ chối dịch". Các lô sau trong cùng
lượt dịch SHALL dùng thẳng chế độ chữ thường, không thử lại schema.

#### Scenario: Schema quá lớn bị 400

- **WHEN** nhà cung cấp trả HTTP 400 nói schema hoặc `response_format` không hợp lệ
- **THEN** lô được gửi lại không có schema, kết quả ghi chế độ `schema→fallback`, và các lô sau chạy ở
  chế độ `text`

#### Scenario: Nội dung bị chặn ở chế độ schema

- **WHEN** phản hồi ở chế độ schema có `finish_reason` là bộ lọc nội dung
- **THEN** lô đi theo luồng chia đôi như hiện có, không rơi về chế độ chữ thường

### Requirement: Dấu vết chế độ đầu ra

Mỗi lô SHALL ghi chế độ đầu ra đã dùng (`schema`, `schema→fallback` hoặc `text`) và lý do khi không
dùng schema. Trace đề xuất và bản ghi lần chạy Lab SHALL mang thông tin này. Hash của system prompt SHALL
phản ánh chỉ dẫn đầu ra thực gửi, để hai chế độ không bị coi là cùng một prompt.

#### Scenario: So hai lần chạy Lab

- **WHEN** một lần chạy dùng biến thể có schema và một lần không có
- **THEN** sổ đăng ký Lab hiện chế độ đầu ra của từng lần, số lô đã rơi về, và hai `systemHash` khác
  nhau

### Requirement: Cổng quyết định trước khi bật mặc định

Chế độ schema SHALL chỉ được bật mặc định cho một model sau khi có báo cáo đo lặp trên cùng tập chương
cố định, so với chế độ chữ thường trên cùng model, cùng ngữ cảnh và cùng mức thinking. Báo cáo phải cho
thấy đủ cả bốn điều: lỗi cấu trúc (id thiếu, thừa, lặp, đoạn phải hỏi lại) giảm vượt độ dao động đã đo;
tỷ lệ hoàn thành không giảm; tuân thủ glossary và xưng hô không giảm vượt độ dao động; chi phí và độ trễ
được ghi lại. Quyết định SHALL được ghi vào tài liệu module kèm số đo.

#### Scenario: Không đủ bằng chứng

- **WHEN** báo cáo cho thấy lỗi cấu trúc giảm nhưng nằm trong độ dao động, hoặc tuân thủ glossary giảm
- **THEN** mặc định vẫn tắt, và tài liệu ghi kết quả là chưa đủ bằng chứng
