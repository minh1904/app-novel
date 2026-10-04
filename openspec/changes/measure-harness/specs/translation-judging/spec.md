## Purpose

So cặp mù bằng judge LLM tùy chọn (T1) và người chấm (T3), đồng thời báo mức chưa hiệu chuẩn để
không biến một model judge thành nguồn chân lý.

## ADDED Requirements

### Requirement: Judge so cặp mù hai chiều

Judge SHALL nhận nguồn và hai candidate ẩn danh, trả A/B/tie cùng lỗi meaning/fluency/address/style.
Mỗi so sánh SHALL chạy A/B và B/A; chỉ phán thắng khi hai chiều cùng chỉ một candidate.

#### Scenario: Thiên lệch vị trí
- **WHEN** judge chọn vị trí A ở cả hai thứ tự
- **THEN** kết quả là không nhất quán/tie và được đếm riêng

### Requirement: Adapter judge độc lập và an toàn

Runner SHALL gọi endpoint tương thích được khai báo, retry hữu hạn với 429/5xx và `Retry-After`, ghi
model/prompt hash/tham số/usage, và quét secret trước khi ghi. Judge SHALL khác họ các model dịch,
trừ override tường minh được ghi vào report.

#### Scenario: Thiếu khóa
- **WHEN** không có cấu hình judge
- **THEN** T1 được bỏ qua rõ ràng, T0/T3 vẫn dùng được

#### Scenario: Cùng họ
- **WHEN** Gemini dịch và Gemini chấm mà không bật override
- **THEN** lệnh dừng trước khi gửi nội dung

### Requirement: Phản hồi hỏng không thành hòa

Parser MAY gỡ code fence và sửa lỗi JSON an toàn đã khai. Nếu vẫn không đọc được, runner SHALL hỏi
lại một lần; lần hai hỏng SHALL ghi “không chấm được”, không tính tie.

#### Scenario: Hỏng hai lần
- **WHEN** hai phản hồi liên tiếp không đọc được
- **THEN** chương bị loại khỏi mẫu T1 với lý do unparseable

### Requirement: Báo trạng thái hiệu chuẩn

A/A SHALL được gắn nhãn nhiễu. Báo cáo T1 SHALL nói “chưa hiệu chuẩn” cho tới khi có phép A/A phù
hợp và đối chiếu người; thiếu hai bước này SHALL không chặn hoàn tất phần offline của Bộ đo.

#### Scenario: Có code nhưng chưa chạy live
- **WHEN** adapter và test giả đã đạt nhưng chưa có khóa ngoài họ model dịch
- **THEN** tài liệu ghi khung sẵn sàng, chưa tuyên bố judge đáng tin

### Requirement: Người chấm mù theo tầng

Trang T3 SHALL chạy offline, ẩn điều kiện/model/prompt, xáo A/B từng mẫu và lưu key riêng. Mẫu SHALL
phân tầng theo chương và khi oracle cho phép theo ordinary/glossary/addressing. Ca khó hoặc có cờ
SHALL được báo riêng nhưng không bị loại im lặng khỏi kết quả của những gì người đã chấm.

#### Scenario: Mẫu có glossary và xưng hô
- **WHEN** pool có đủ cả ba tầng
- **THEN** trang chứa đại diện của từng tầng trước khi lấp phần còn lại ngẫu nhiên

#### Scenario: Ca bị cờ
- **WHEN** người đã chấm một mục có cờ T0/T1
- **THEN** kết quả tổng vẫn ghi lựa chọn đó và report thêm subgroup chẩn đoán

### Requirement: Đồng thuận chỉ là số liệu

Trên mẫu chung, công cụ SHALL báo agreement và kappa. Dưới ngưỡng mẫu đề xuất SHALL ghi chưa đủ đặt
ngưỡng, không giấu số và không suy rằng judge sai/đúng tuyệt đối.

#### Scenario: Ba mươi mẫu
- **WHEN** chỉ có 30 mục chung
- **THEN** report ghi agreement/kappa cùng cảnh báo cỡ mẫu
