## Purpose

Đặc tả hợp đồng lõi dịch (translation-core): nhận các đơn vị văn bản nguồn độc lập, ánh xạ ID tạm xác định theo lô, phân tích cú pháp khoan dung, đối soát toàn vẹn ID, sửa lỗi cục bộ và tính toán chi phí cùng hash ngữ cảnh.

## ADDED Requirements

### Requirement: Dịch theo danh sách đơn vị có ID xác định

Lõi dịch SHALL nhận danh sách đơn vị văn bản nguồn `{id, text}`, ngôn ngữ nguồn và đích, và cấu hình thực thi. Lõi dịch SHALL trả về kết quả dịch cho từng đơn vị theo đúng ID gốc, độc lập với thứ tự xuất hiện trong phản hồi của mô hình.

#### Scenario: Dịch thành công đầy đủ danh sách đơn vị
- **WHEN** gửi một danh sách gồm N đơn vị có ID hợp lệ
- **THEN** lõi dịch trả về đúng N bản dịch tương ứng với từng ID gốc, kèm dữ liệu usage và trạng thái thành công

#### Scenario: Đơn vị nguồn rỗng hoặc chỉ có khoảng trắng
- **WHEN** danh sách đầu vào chứa đơn vị có văn bản rỗng hoặc chỉ có khoảng trắng
- **THEN** lõi dịch tự động trả về chuỗi rỗng cho ID đó mà không gửi vào prompt tới mô hình

### Requirement: Ánh xạ ID tạm trong từng lời gọi mô hình

Lõi dịch SHALL ánh xạ các ID của đơn vị đầu vào sang dạng ID tạm tất định `[n]` (với n từ 1 đến kích thước lô) trong payload gửi tới mô hình AI. Khi nhận kết quả từ mô hình, lõi dịch SHALL ánh xạ ngược lại từ `[n]` về ID gốc ban đầu.

#### Scenario: Mô hình trả về kết quả theo ID tạm
- **WHEN** mô hình trả về các mục đánh dấu `[1]`, `[2]`, ...
- **THEN** lõi dịch ánh xạ chính xác các mục này về ID ban đầu của người gọi mà không nhầm lẫn

#### Scenario: Mô hình đảo lộn thứ tự các ID tạm
- **WHEN** mô hình trả về `[2]` trước `[1]`
- **THEN** lõi dịch vẫn gán đúng văn bản cho từng đơn vị dựa trên chỉ số tạm và ID gốc

### Requirement: Phân tích cú pháp khoan dung và đối soát tập ID

Lõi dịch SHALL sử dụng bộ phân tích cú pháp có khả năng phục hồi lỗi định dạng JSON thông thường (dấu phẩy thừa, bọc codeblock markdown, escape ký tự). Sau khi phân tích, lõi dịch SHALL đối soát tập ID nhận được so với tập ID yêu cầu.

#### Scenario: Phản hồi bị bọc trong khối mã markdown
- **WHEN** mô hình trả về JSON nằm trong khối ```json ... ```
- **THEN** bộ phân tích bóc tách khối mã và phân tích thành công mảng kết quả

#### Scenario: Phản hồi thiếu một số ID
- **WHEN** mô hình bỏ sót một hoặc nhiều ID tạm trong lô
- **THEN** lõi dịch xác định chính xác danh sách ID bị thiếu và đánh dấu cần xử lý lại

#### Scenario: Phản hồi chứa ID lạ ngoài danh sách yêu cầu
- **WHEN** mô hình sinh ra ID tạm không có trong yêu cầu
- **THEN** lõi dịch bỏ qua ID lạ đó và không làm sai lệch các ID hợp lệ

### Requirement: Sửa cục bộ đúng phần lỗi

Khi một lô gặp lỗi nội dung (thiếu ID, bản dịch rỗng, hoặc hỏng cú pháp không phục hồi được), lõi dịch SHALL giữ lại các đơn vị đã dịch thành công và chỉ gửi yêu cầu hỏi lại (retry) một lần duy nhất cho đúng tập ID bị thiếu/lỗi kèm văn bản nguồn tương ứng.

#### Scenario: Hỏi lại thành công các ID bị thiếu
- **WHEN** lô đầu tiên hoàn thành 8/10 ID và thiếu 2 ID
- **THEN** lõi dịch chỉ gửi lại 2 ID đó trong lượt sửa lỗi; khi thành công thì ghép đủ 10 ID trả về cho người gọi

#### Scenario: Lượt hỏi lại vẫn thất bại
- **WHEN** lượt hỏi lại một ID tiếp tục thất bại hoặc không hợp lệ
- **THEN** lõi dịch báo lỗi cục bộ cho riêng ID đó, giữ nguyên kết quả hợp lệ của các ID khác, và không lặp vô hạn

### Requirement: Tách biệt lỗi hạ tầng khỏi lỗi nội dung

Lõi dịch SHALL phân biệt lỗi hạ tầng (HTTP 429, timeout, lỗi mạng, lỗi xác thực) với lỗi nội dung (JSON hỏng, thiếu ID). Lỗi hạ tầng do lớp gateway chịu trách nhiệm retry/cooldown; lõi dịch SHALL NOT chia nhỏ lô hay thử lại nội dung khi gặp lỗi hạ tầng.

#### Scenario: Gặp lỗi 429 giới hạn tốc độ
- **WHEN** yêu cầu nhận lỗi 429 từ nhà cung cấp
- **THEN** lỗi được chuyển giao cho gateway xử lý theo thời gian chờ, lõi dịch không chia nhỏ lô hoặc coi là lỗi cú pháp

### Requirement: Bảo toàn đoạn quá dài

Khi một đơn vị nguồn có độ dài vượt trần ký tự hoặc token cho phép của một lượt gọi, lõi dịch SHALL chia nhỏ đơn vị đó thành các mảnh tạm, gửi dịch, và ráp lại thành một bản dịch duy nhất gán cho ID gốc trước khi trả về.

#### Scenario: Đoạn nguồn dài vượt giới hạn lô
- **WHEN** một đơn vị nguồn có độ dài lớn hơn trần lô quy định
- **THEN** đơn vị được chia thành các mảnh theo ranh giới câu/dòng an toàn, dịch tuần tự, và ghép nối chính xác về ID gốc
