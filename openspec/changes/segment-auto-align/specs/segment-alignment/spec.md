## Purpose

Ước lượng liên kết có cơ sở ngữ nghĩa giữa segment bản gốc và segment bản dịch chưa được liên kết trong một chương, để các bước ghép tự động ở mode Từng câu không chỉ dựa vào thứ tự xuất hiện khi dịch giả viết tự do ở Toàn văn rồi mới chuyển mode.

## ADDED Requirements

### Requirement: Chạy theo yêu cầu, offline, trong phạm vi một chương

Việc ước lượng SHALL chỉ chạy khi được gọi rõ ràng (ví dụ từ "Ghép theo thứ tự"), không tự chạy theo từng lần sửa văn bản. Việc ước lượng SHALL chạy hoàn toàn offline, không gọi dịch vụ bên ngoài, và SHALL chỉ xét các segment nguồn chưa có liên kết và segment dịch chưa thuộc liên kết nào trong cùng một chương.

#### Scenario: Gọi khi có segment chưa ghép
- **WHEN** một chương có segment nguồn chưa liên kết và segment dịch chưa thuộc liên kết nào, và việc ước lượng được gọi
- **THEN** chỉ các segment đó được xét, segment đã thuộc liên kết khác không bị đụng tới, và không có yêu cầu mạng nào được gửi

### Requirement: Hai bậc ước lượng, bậc rẻ trước bậc tốn kém

Việc ước lượng SHALL thử **Bậc 0** (không cần mô hình) trước cho mỗi cặp ứng viên: đối chiếu thứ tự tương đối giữa hai bên, số/ngày giống nhau, thuật ngữ đã có trong glossary xuất hiện ở cả hai câu, và tỷ lệ độ dài ký tự. Một segment nguồn có ứng viên đạt đủ bằng chứng ở Bậc 0 SHALL dừng ở đó, không cần tính thêm. Chỉ các segment nguồn **chưa có** ứng viên đủ tin ở Bậc 0 mới được đưa sang **Bậc 1**: so sánh bằng embedding ngữ nghĩa câu.

#### Scenario: Neo rẻ đủ dùng
- **WHEN** một segment nguồn có số thứ tự hoặc tên riêng trùng khớp rõ ràng với một segment dịch ứng viên
- **THEN** cặp đó được chọn ở Bậc 0, không cần tính embedding cho segment này

#### Scenario: Không đủ bằng chứng rẻ
- **WHEN** một segment nguồn không có ứng viên nào đạt ngưỡng Bậc 0
- **THEN** segment đó được đưa sang Bậc 1 để so bằng embedding

### Requirement: Bậc 1 giới hạn trong vùng lân cận, không so toàn bộ chương

Ở Bậc 1, mỗi segment nguồn SHALL chỉ được so với các segment dịch ứng viên nằm trong một vùng lân cận theo vị trí tương đối trong chương (không so với toàn bộ segment dịch chưa ghép của chương), để chi phí không tăng theo bậc hai với số segment.

#### Scenario: Chương nhiều hàng
- **WHEN** một chương có hàng nghìn segment nguồn và đích chưa ghép
- **THEN** một segment nguồn ở đầu chương không được so với các segment dịch ở cuối chương

### Requirement: Mỗi ước lượng có độ tin cậy và không ép khớp khi không chắc

Mỗi cặp do việc ước lượng đề xuất SHALL kèm một độ tin cậy. Một segment nguồn không có ứng viên nào vượt một mức bằng chứng tối thiểu SHALL không được gán cặp nào (không ép khớp cặp yếu), và được báo là chưa ước lượng được thay vì trả về một cặp không đáng tin.

#### Scenario: Không có ứng viên đủ tin
- **WHEN** một segment nguồn không có segment dịch ứng viên nào đạt mức bằng chứng tối thiểu ở cả hai bậc
- **THEN** segment đó được báo là chưa ước lượng được, không có cặp nào được đề xuất cho nó

### Requirement: Chỉ đề xuất, không tự thay đổi dữ liệu

Việc ước lượng SHALL chỉ trả về danh sách cặp đề xuất kèm độ tin cậy; nó SHALL không tự tạo, xóa hay sửa liên kết, segment hay văn bản. Việc áp dụng kết quả (tạo liên kết, đặt trạng thái) thuộc về nơi gọi nó (`segment-links`).

#### Scenario: Chỉ trả kết quả, không ghi
- **WHEN** việc ước lượng được gọi cho một chương
- **THEN** không có liên kết, segment hay văn bản nào trong kho bị thay đổi chỉ bởi lệnh gọi này
