## Purpose

Định dạng tập đo có nguồn gốc và kiểm tra được, tách dữ liệu công khai khỏi raw riêng tư. Dữ liệu
fixture là oracle của phép đo, không là schema lưu Context của sản phẩm.

## ADDED Requirements

### Requirement: Fixture có cấu trúc và provenance

Mỗi tác phẩm SHALL khai ngôn ngữ nguồn, định danh, danh sách chương, nguồn và tình trạng quyền sử
dụng; kèm glossary oracle, ma trận xưng hô oracle và dữ liệu chương. Mỗi chương SHALL có nguồn,
metadata và assertion; reference tiếng Việt là tùy chọn và SHALL ghi provenance.

#### Scenario: Thiếu metadata bắt buộc
- **WHEN** fixture thiếu nguồn, chương hoặc tệp bắt buộc
- **THEN** bộ nạp từ chối và chỉ rõ đường dẫn/trường sai

#### Scenario: Reference không rõ nguồn
- **WHEN** một reference được dùng để chấm nhưng không có mô tả nguồn/người dịch
- **THEN** báo cáo SHALL gắn nhãn provenance chưa đủ, không gọi nó là gold người dịch

### Requirement: Tách public và private

`fixtures/public/` SHALL chỉ chứa dữ liệu có căn cứ quyền sử dụng; `fixtures/private/` SHALL bị Git
bỏ qua. Thiếu private SHALL không làm phép kiểm công khai thất bại. Báo cáo SHALL liệt kê tập đã dùng.

#### Scenario: Checkout sạch
- **WHEN** máy không có `fixtures/private/`
- **THEN** bộ nạp vẫn chạy các fixture public và báo đúng tập thực tế

### Requirement: Fixture không ràng buộc schema sản phẩm

Tên tệp và trường của fixture SHALL chỉ là hợp đồng benchmark. Module Context MAY cung cấp adapter
xuất snapshot sang oracle; database và IPC SHALL NOT bị buộc dùng cùng cấu trúc.

#### Scenario: Context đổi schema
- **WHEN** schema Context được thiết kế khác `glossary.json` hoặc `pronouns.json`
- **THEN** Bộ đo dùng adapter mà không đòi migration sản phẩm sang schema fixture

### Requirement: Định nghĩa đoạn ổn định

Đoạn nguồn SHALL là mỗi dòng không trống sau khi chuẩn hóa CRLF/CR về LF; dòng chỉ có khoảng trắng
hoặc U+3000 SHALL là trống.

#### Scenario: Khác kiểu xuống dòng
- **WHEN** cùng nguồn được đọc ở LF và CRLF
- **THEN** số đoạn và nội dung đoạn giống nhau

### Requirement: Assertion neo được và oracle có trạng thái

Assertion SHALL neo duy nhất bằng nội dung và cặp xưng hô được nhắc SHALL tồn tại trong oracle.
Glossary/xưng hô/assertion SHALL có trạng thái hoặc ghi chú đủ để báo cáo phân biệt dữ liệu duyệt và
nháp. Mục nháp MAY được đo thăm dò nhưng SHALL NOT bị trình bày như chuẩn đã duyệt.

#### Scenario: Neo mơ hồ
- **WHEN** chuỗi neo khớp nhiều đoạn
- **THEN** bộ nạp từ chối và báo số vị trí khớp

#### Scenario: Oracle còn nháp
- **WHEN** lần chạy dùng glossary nháp
- **THEN** report ghi trạng thái nháp cạnh metric glossary
