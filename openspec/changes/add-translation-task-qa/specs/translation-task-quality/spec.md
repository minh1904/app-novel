## ADDED Requirements

### Requirement: Kiểm item theo bản chụp item đã dùng
Hệ thống SHALL kiểm từng item của task dịch bền bằng glossary, cặp xưng hô và nhân vật trong bản chụp Context mà
item đã pin, không đọc Context hiện hành. Hệ thống SHALL ghép nguồn–đích theo segment ID và chỉ kiểm đoạn có target.

#### Scenario: Glossary sửa sau khi dịch
- **WHEN** người dùng đổi đích của một thuật ngữ sau khi chương 5 đã dịch xong
- **THEN** cảnh báo của chương 5 vẫn tính theo đích trong bản chụp chương 5

#### Scenario: Item chưa có target
- **WHEN** item chưa có đoạn nào được commit
- **THEN** hệ thống không tạo cảnh báo và hiện N/A cho item đó

### Requirement: Bộ luật dùng evaluator sẵn có và chỉ cảnh báo
Hệ thống SHALL tạo cảnh báo với các ruleCode `glossary.forbidden_used`, `glossary.missing_target`,
`addressing.unexpected_pronoun`, `addressing.inconsistent_pair`, `text.residual_source`, `text.length_ratio`,
`text.repetition`, `text.unbalanced_quotes`, mỗi cảnh báo mang ruleVersion, chapterId, segmentId, thông điệp và bằng
chứng ngắn. Mọi cảnh báo SHALL ở mức warning; hệ thống SHALL không có mức blocker hay error cho các luật này.
Đoạn có nguồn chứa mục glossary mà đích giữ nguyên chữ gốc SHALL không bị báo `text.residual_source`.

#### Scenario: Thuật ngữ cấm lọt vào
- **WHEN** target của một đoạn chứa đích của mục glossary bị cấm trong bản chụp
- **THEN** đoạn đó có cảnh báo `glossary.forbidden_used` nêu thuật ngữ

#### Scenario: Xưng hô không chắc chắn
- **WHEN** đoạn thoại có tên hai nhân vật của một cặp đã duyệt và dùng đại từ khác cặp
- **THEN** hệ thống tạo cảnh báo `addressing.unexpected_pronoun`, không phải lỗi

#### Scenario: Tên giữ nguyên chữ gốc
- **WHEN** bản chụp có mục glossary mà đích giữ nguyên chữ Hán và target chứa chữ đó
- **THEN** hệ thống không báo `text.residual_source` cho đoạn đó

### Requirement: Cảnh báo không đổi trạng thái hay văn bản
Hệ thống SHALL tính cảnh báo khi đọc và SHALL không lưu cảnh báo. QA SHALL không đổi trạng thái task hoặc item,
không chặn lưu hay xuất, và không sửa target. Luật hoàn tất item SHALL do task dịch bền quyết định, không phụ thuộc
cảnh báo.

#### Scenario: Item xong nhưng có cảnh báo
- **WHEN** item đủ target cho mọi đoạn nguồn không rỗng và có ba cảnh báo
- **THEN** item vẫn `completed` và tổng kết task nêu ba cảnh báo đang mở

#### Scenario: Sửa target làm cảnh báo hết
- **WHEN** người dùng sửa đoạn có cảnh báo `glossary.missing_target` để chứa đúng thuật ngữ
- **THEN** lần đọc tiếp theo không còn cảnh báo đó, không cần chạy lại bước nào

### Requirement: Chỉ quyết định dismiss được lưu
Khi người dùng bỏ qua một cảnh báo, hệ thống SHALL lưu trong work DB ruleCode, ruleVersion, chapterId, segmentId,
hash target hiện tại và lý do tùy chọn, và SHALL ẩn mọi cảnh báo khớp cả năm trường đầu. Target đổi hoặc ruleVersion
đổi SHALL làm quyết định không còn khớp. Dismiss SHALL không sửa target.

#### Scenario: Bỏ qua báo nhầm
- **WHEN** người dùng bỏ qua cảnh báo `text.length_ratio` của một đoạn
- **THEN** cảnh báo không còn trong danh sách mở và target không đổi

#### Scenario: Target đổi sau khi bỏ qua
- **WHEN** đoạn đã bỏ qua cảnh báo được sửa và vẫn vi phạm cùng luật
- **THEN** cảnh báo hiện lại

### Requirement: Màn Tác vụ hiện số cảnh báo mở và mở đúng đoạn
Màn Tác vụ SHALL hiển thị số cảnh báo đang mở của task và danh sách theo item với nhãn luật, bằng chứng, nút mở
đúng chương và đoạn trong editor và nút bỏ qua. Giao diện SHALL không dùng màu làm tín hiệu duy nhất và SHALL không
hiện nhãn “đúng 100%” hay điểm chất lượng.

#### Scenario: Mở đoạn từ cảnh báo
- **WHEN** người dùng bấm Mở đoạn trên một cảnh báo
- **THEN** editor mở chương và cuộn tới segment của cảnh báo

#### Scenario: Task không có cảnh báo
- **WHEN** mọi item không có cảnh báo mở
- **THEN** màn Tác vụ nói không có cảnh báo, không nói bản dịch đúng hoàn toàn
