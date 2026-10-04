## Purpose

Cung cấp analyzer thuần và tất định cho các thuộc tính kiểm được bằng luật. Kết quả là số liệu/cờ,
không tự là lỗi ngôn ngữ đã xác nhận và không quy định UX của module QA.

## ADDED Requirements

### Requirement: Thuần và tất định

Analyzer SHALL chỉ phụ thuộc đầu vào, không mạng/đồng hồ/ngẫu nhiên, và cùng input SHALL cho cùng
output cùng thứ tự.

#### Scenario: Chấm lại
- **WHEN** cùng dữ liệu được chấm hai lần
- **THEN** kết quả trùng khít

### Requirement: Ghép đoạn phục vụ đo

Analyzer SHALL hỗ trợ 1–1, 1–0, 0–1, 2–1 và 1–2 theo thứ tự, để một lần gộp/tách không làm trượt
mọi cặp sau. Kết quả SHALL NOT được ghi vào tác phẩm hoặc coi là alignment sản phẩm.

#### Scenario: Số lượng bằng nhưng vị trí trượt
- **WHEN** output bỏ đoạn 3 và tách đoạn 60 nên tổng dòng vẫn bằng nguồn
- **THEN** báo đúng một sót và một tách, các đoạn giữa không bị ghép lệch dây chuyền

### Requirement: T0 báo cấu trúc và anomaly

Kết quả SHALL gồm số đoạn/bead, chữ và dấu câu nguồn còn lại, ngoặc không cân, kiểu thoại, độ dài
bất thường và lặp. Cấu hình SHALL cho phép miễn chuỗi CJK giữ có chủ ý.

#### Scenario: CJK được phép giữ
- **WHEN** đoạn chơi chữ được oracle miễn kiểm
- **THEN** chữ CJK đã khai không tạo cờ residual

### Requirement: Glossary có mức chặt và chấp nhận được

Với mỗi mục xuất hiện ở nguồn, analyzer SHALL báo strict hit, acceptable hit và forbidden hit. So
khớp tiếng Việt SHALL chuẩn hóa Unicode/cách đặt dấu đã hỗ trợ. Metric strict SHALL NOT thay thế
acceptable rate trong quyết định về Context.

#### Scenario: Biến thể hợp lệ
- **WHEN** target ưu tiên là “núi Hoa Quả” và “Hoa Quả Sơn” đã được duyệt
- **THEN** ca đó không strict nhưng acceptable

### Requirement: Assertion trả bằng chứng, không tự sửa

Assertion có điều kiện chuỗi SHALL trả đạt/trượt và lý do; assertion chỉ có ghi chú SHALL trả “chấm
tay”. Không analyzer nào SHALL sửa bản dịch, chặn save/export hoặc tự gọi lại model.

#### Scenario: Assertion cần người
- **WHEN** quy tắc mô tả giọng điệu mà không có điều kiện chuỗi
- **THEN** kết quả là chấm tay, không ép đạt/trượt

### Requirement: QA tái sử dụng có ranh giới

Module QA MAY gọi analyzer nhưng SHALL định nghĩa riêng severity, khả năng bỏ qua và cách giải thích.
Bộ đo SHALL NOT coi việc dùng chung mã là bằng chứng QA đã triển khai.

#### Scenario: Độ dài bất thường
- **WHEN** analyzer báo tỷ lệ dài/ngắn ngoài băng
- **THEN** QA có thể hiện cờ xem lại nhưng không gọi đó là mất nghĩa nếu chưa có bằng chứng
