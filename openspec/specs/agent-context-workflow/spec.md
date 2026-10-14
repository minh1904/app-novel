# agent-context-workflow Specification

## Purpose
TBD - created by archiving change add-agent-context-workflow. Update Purpose after archive.

## Requirements

### Requirement: Task dịch mặc định trích glossary khi tác phẩm chưa có
Lệnh tạo task dịch MAY mang lựa chọn Context (`contextStrategy`): trích thuật ngữ rồi duyệt, hoặc dịch ngay bằng
Context đã duyệt. Khi lệnh không mang lựa chọn, Mira SHALL trích thuật ngữ trước nếu tác phẩm chưa có mục
thuật ngữ nào đã duyệt hoặc đang chờ duyệt, và SHALL dịch ngay bằng Context đã duyệt nếu đã có. Khi task được
yêu cầu từ chat, model SHALL chỉ chọn dịch ngay khi người dùng nói rõ không trích (quyết định của chủ sản phẩm,
2026-10-14; thay quy tắc "không có mặc định" của change `add-agent-context-workflow`).

#### Scenario: Dịch ngay bằng Context đã duyệt
- **WHEN** người dùng chọn dịch ngay bằng Context đã duyệt
- **THEN** task không gọi model trích thuật ngữ và mỗi item dùng bản chụp Context đã duyệt khi bắt đầu chạy

#### Scenario: Yêu cầu từ chat cho tác phẩm chưa có glossary
- **WHEN** người dùng nhắn "dịch chương 1–30" cho tác phẩm chưa có thuật ngữ nào và không nói gì về Context
- **THEN** task được tạo với lựa chọn trích thuật ngữ rồi duyệt, và bước trích chạy trước item đầu

#### Scenario: Tác phẩm đã có glossary
- **WHEN** lệnh tạo task không mang lựa chọn và tác phẩm đã có mục thuật ngữ đã duyệt hoặc đang chờ duyệt
- **THEN** task dịch ngay bằng Context đã duyệt, không gọi model trích thuật ngữ

#### Scenario: Lựa chọn không hợp lệ
- **WHEN** lệnh tạo task mang `contextStrategy` không thuộc hai giá trị đã định
- **THEN** Mira từ chối lệnh bằng lỗi kiểm tra và không tạo task

### Requirement: Trích thuật ngữ lưu ứng viên có bằng chứng
Khi task chọn trích thuật ngữ, Mira SHALL quét các chương trong phạm vi task chưa từng được quét và lưu mỗi
ứng viên thành mục Context `pending`, `origin = ai`, kèm loại thuật ngữ và ít nhất một bằng chứng gồm định danh
lần chạy, chương, câu trích nguyên văn, model và hash prompt. Mira SHALL ghi nhận chương đã quét để lần sau
không quét lại. Mỗi lời gọi model trích thuật ngữ SHALL được tính vào ngân sách của task và kiểm trước request.
Lỗi trích thuật ngữ SHALL không thay đổi mục Context đã có.

#### Scenario: Thuật ngữ mới từ chương 3
- **WHEN** model đề xuất một tên riêng xuất hiện ở chương 3
- **THEN** Mira lưu mục `pending` với câu trích từ chương 3, định danh lần chạy, model và hash prompt

#### Scenario: Trích tăng dần
- **WHEN** chương 1–10 đã được quét và task mới gồm chương 1–20 chọn trích thuật ngữ
- **THEN** Mira chỉ gửi chương 11–20 cho model

#### Scenario: Chạm trần ngân sách khi đang trích
- **WHEN** lời gọi trích tiếp theo sẽ vượt trần lời gọi của task
- **THEN** task chuyển `paused` với reason `budget` trước request, và các chương chưa quét vẫn được quét khi tiếp tục

#### Scenario: Model lỗi giữa chừng
- **WHEN** provider trả lỗi khi đang trích chương 5
- **THEN** mục đã duyệt không đổi và chương 5 không được ghi là đã quét

### Requirement: Kiểm ứng viên bằng code trước khi lưu
Mira SHALL bỏ ứng viên trùng dạng nguồn với mục đã duyệt hoặc đang chờ duyệt. Mira SHALL bỏ ứng viên trùng mục
đã loại, trừ khi ứng viên có câu trích từ chương chưa có trong bằng chứng cũ; khi đó mục được mở lại thành
`pending` với cờ mở lại. Khi alias của ứng viên đã thuộc mục khác, Mira SHALL vẫn lưu ứng viên với cờ xung đột
alias và không báo lỗi ghi. Khi tên Nhật có bản dịch không phải chữ Latin, hoặc tên Trung có bản dịch không phải
chữ tiếng Việt, Mira SHALL gắn cờ sai hệ chữ và không tự sửa. Ứng viên model phân loại là không phải thuật ngữ
SHALL được lưu là `rejected` để không đề xuất lại.

#### Scenario: Alias trùng với mục khác
- **WHEN** ứng viên "彰" có alias "アキ" trong khi "アキ" đã là alias của một mục khác
- **THEN** ứng viên được lưu `pending` không kèm alias đó, mang cờ xung đột alias nêu "アキ", và lần trích không lỗi

#### Scenario: Mục đã loại không quay lại
- **WHEN** model đề xuất lại "先生" đã bị loại, chỉ với câu trích từ chương đã có trong bằng chứng cũ
- **THEN** Mira không tạo mục mới và mục cũ vẫn `rejected`

#### Scenario: Tên Trung bị phiên âm Latin
- **WHEN** tác phẩm tiếng Trung có ứng viên loại người với bản dịch "Li Wei"
- **THEN** ứng viên được lưu `pending` với cờ sai hệ chữ và bản dịch giữ nguyên

### Requirement: Task chờ duyệt không giữ tài nguyên
Sau bước trích, nếu có mục `pending` mới, Mira SHALL chuyển task sang `waiting_user` với reason `context_review`,
giữ các item ở `queued`, và SHALL không giữ provider request, write intent hay khóa editor trong lúc chờ. Khi
người dùng tiếp tục, Mira SHALL chạy item mà không bắt buộc duyệt hết. Hủy task SHALL không xóa ứng viên.

#### Scenario: Đóng app khi chờ duyệt
- **WHEN** app đóng lúc task đang `waiting_user(context_review)` rồi mở lại
- **THEN** task vẫn `waiting_user(context_review)`, ứng viên còn nguyên và không item nào chạy

#### Scenario: Không có ứng viên mới
- **WHEN** bước trích không tạo mục `pending` nào
- **THEN** task chạy item đầu tiên mà không dừng chờ duyệt

### Requirement: Chỉ mục đã duyệt và đúng phạm vi vào prompt
Mira SHALL dựng Context của mỗi item bằng resolver hiện có (`getEffectiveGlossary`, `getEffectiveDyadsForChapter`)
qua `takeContextSnapshot`, chỉ lấy mục `approved` có phạm vi chứa chương của item. Mục `pending` và `rejected`
SHALL không vào prompt. Mira SHALL đưa xưng hô trong lời thoại và đại từ người kể vào prompt như hai chỉ dẫn có
nhãn riêng và SHALL không áp phép thay chuỗi nào lên bản dịch. Mira SHALL coi Context đã đổi khi hash bản chụp
dựng từ kho khác hash bản chụp đã ghim của item.

#### Scenario: Duyệt một phần
- **WHEN** lần trích tạo 12 ứng viên, người dùng duyệt 8, loại 2, để 2 chờ duyệt rồi tiếp tục
- **THEN** bản chụp của item có 8 mục mới cùng các mục đã duyệt trước đó, không có 4 mục còn lại

#### Scenario: Mục ngoài phạm vi
- **WHEN** mục chỉ áp dụng chương 1–10 và item là chương 11
- **THEN** mục không có trong bản chụp của chương 11

#### Scenario: Bố trong lời thoại, ông trong lời kể
- **WHEN** cặp A→B có `recipientPronoun = "bố"` và nhân vật B có `thirdPerson = "ông"`
- **THEN** prompt gửi cả hai, mỗi giá trị kèm nhãn lời thoại hoặc lời kể, và không có phép thay chuỗi nào

#### Scenario: Xóa chương làm mốc phạm vi
- **WHEN** mục có phạm vi tới chương 10 và chương 10 bị xóa
- **THEN** mốc cuối thành không giới hạn nên mục áp cho các chương sau, item đã ghim bản chụp không đổi, còn item bắt đầu sau đó nhận mục

### Requirement: Lệnh duyệt có guard và duyệt hàng loạt trong một loại
Mira SHALL cung cấp lệnh approve, sửa rồi approve, và reject kèm lý do cho mục `pending`; mỗi lệnh SHALL mang
`updatedAt` người dùng đã thấy và Mira SHALL từ chối bằng `conflict` khi mục đã đổi. Duyệt hàng loạt SHALL chỉ
nhận các mục cùng loại thuật ngữ, SHALL áp dụng cùng kiểm tra như từng mục và SHALL trả kết quả từng mục; mục
lỗi SHALL không được báo thành công. Approve SHALL vẫn kiểm trùng dạng nguồn và alias như mọi lần ghi Context.

#### Scenario: Sửa rồi duyệt
- **WHEN** người dùng đổi bản dịch đề xuất rồi approve
- **THEN** mục `approved` mang giá trị đã sửa và bằng chứng của lần trích vẫn còn

#### Scenario: Mục đã đổi ở nơi khác
- **WHEN** người dùng approve với `updatedAt` cũ hơn giá trị trong kho
- **THEN** Mira trả `conflict` và mục giữ nguyên

#### Scenario: Duyệt hàng loạt lẫn loại
- **WHEN** lệnh duyệt hàng loạt gồm một mục loại người và một mục loại địa danh
- **THEN** Mira từ chối lệnh và không mục nào đổi trạng thái

#### Scenario: Một mục trong lô bị trùng alias
- **WHEN** duyệt hàng loạt 5 tên người và một mục có alias trùng mục đã duyệt
- **THEN** 4 mục được approve, mục còn lại báo `conflict` và vẫn `pending`

### Requirement: Tab Ngữ cảnh chỉ hiện Context đang áp dụng
Trong màn chương, tab Ngữ cảnh của side panel SHALL hiển thị Context đang áp dụng cho chương hiện tại, dựng bằng
cùng hàm với bản chụp dịch, và SHALL chỉ đọc. Hành động "Xem và duyệt" từ tab này hoặc từ activity của task
`context_review` SHALL mở màn Từ điển hiện có của tác phẩm với bộ lọc `Chờ duyệt`.

#### Scenario: Mở duyệt từ activity
- **WHEN** activity báo task chờ duyệt 12 mục và người dùng chọn "Xem và duyệt"
- **THEN** màn Từ điển của đúng tác phẩm mở với bộ lọc `Chờ duyệt`

#### Scenario: Mục pending không hiện là đang áp dụng
- **WHEN** chương hiện tại có một mục `pending` khớp nội dung
- **THEN** tab Ngữ cảnh không liệt kê mục đó
