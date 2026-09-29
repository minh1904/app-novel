## Purpose

Định nghĩa hợp đồng chung cho mọi nhà cung cấp dịch (giả lập ở M0, thật ở M2): gửi và nhận bản dịch theo segment ID, lỗi có phân loại, hủy, và một provider giả lập chạy hoàn toàn offline để kiểm thử luồng AI.

## ADDED Requirements

### Requirement: Yêu cầu và phản hồi dịch theo segment ID

Một yêu cầu dịch SHALL gồm danh sách segment (ID, văn bản nguồn), ngôn ngữ nguồn và đích, và ngữ cảnh tùy chọn. Phản hồi thành công SHALL trả với mỗi segment ID một bản dịch, kèm định danh provider và model. Ánh xạ kết quả SHALL dựa trên ID, không dựa trên thứ tự.

#### Scenario: Phản hồi đủ ID
- **WHEN** provider trả về kết quả cho mọi ID đã gửi
- **THEN** mỗi bản dịch được gắn đúng segment theo ID kể cả khi thứ tự trả về khác thứ tự gửi

#### Scenario: Phản hồi thiếu hoặc thừa ID
- **WHEN** phản hồi thiếu một ID hoặc chứa ID không có trong yêu cầu
- **THEN** hệ thống coi các ID thiếu là lỗi có thể thử lại, bỏ qua ID thừa, và không gắn bản dịch nào sai segment

### Requirement: Lỗi có phân loại

Provider SHALL báo lỗi theo các loại phân biệt được: giới hạn tốc độ (kèm thời gian chờ nếu có), lỗi mạng, xác thực, nội dung bị từ chối, phản hồi không hợp lệ, bị hủy. Loại lỗi SHALL cho biết lỗi có nên thử lại hay không.

#### Scenario: Giới hạn tốc độ
- **WHEN** provider báo giới hạn tốc độ kèm thời gian chờ
- **THEN** lỗi được phân loại là có thể thử lại và mang thời gian chờ đó

#### Scenario: Lỗi xác thực
- **WHEN** provider báo khóa không hợp lệ
- **THEN** lỗi được phân loại là không thử lại được

### Requirement: Hủy yêu cầu

Người gọi SHALL hủy được một yêu cầu đang chạy; provider SHALL dừng sớm và trả lỗi loại "bị hủy" mà không trả kết quả một phần được coi là hoàn chỉnh.

#### Scenario: Hủy giữa chừng
- **WHEN** người dùng hủy khi yêu cầu đang chạy
- **THEN** yêu cầu kết thúc với loại "bị hủy" và không segment nào bị ghi bản dịch từ yêu cầu đó

### Requirement: Provider giả lập chạy offline

Hệ thống SHALL có một provider giả lập hoạt động không cần mạng và không cần khóa. Provider này SHALL trả bản dịch xác định được từ văn bản nguồn, cho phép cấu hình độ trễ và các kiểu lỗi (giới hạn tốc độ, lỗi mạng, thiếu ID, ID trùng, xáo thứ tự, phản hồi rỗng), và SHALL ghi rõ trong nguồn gốc bản dịch rằng đó là giả lập.

#### Scenario: Dịch giả lập
- **WHEN** gửi ba segment cho provider giả lập không bật lỗi
- **THEN** trả về ba bản dịch xác định theo đúng ID, nguồn gốc ghi "giả lập"

#### Scenario: Bật lỗi giả lập
- **WHEN** cấu hình provider giả lập trả phản hồi thiếu một ID
- **THEN** người gọi nhận đúng tình huống thiếu ID để kiểm thử xử lý lỗi

### Requirement: Bản dịch giả lập không lẫn với bản dịch thật

Bản dịch do provider giả lập tạo SHALL luôn được đánh dấu là giả lập trong nguồn gốc và SHALL NOT xuất hiện như bản dịch AI thật trong thống kê hoặc xuất bản.

#### Scenario: Nguồn gốc giả lập
- **WHEN** đọc nguồn gốc của segment do provider giả lập tạo
- **THEN** loại nguồn gốc là giả lập và người dùng thấy dấu hiệu này trong giao diện dùng nguồn gốc
