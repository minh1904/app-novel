## MODIFIED Requirements

### Requirement: Ghép theo thứ tự

"Ghép theo thứ tự" SHALL trước tiên dùng kết quả của việc ước lượng liên kết (`segment-alignment`) để nối segment dịch **chưa có liên kết** với hàng **chưa có bản dịch**: mỗi cặp được đề xuất SHALL tạo một liên kết với độ tin cậy do việc ước lượng trả về, trạng thái `ok` khi độ tin cậy đạt ngưỡng đủ dùng, `needs_review` khi không đạt. Các segment dịch và hàng còn lại sau bước đó — không được đề xuất cặp nào — SHALL được nối theo thứ tự xuất hiện như phương án cuối, mỗi cặp một liên kết trạng thái `needs_review` và không có độ tin cậy (ước đoán thuần theo thứ tự, không có cơ sở ngữ nghĩa). Segment dịch hay hàng thừa sau cả hai bước SHALL giữ nguyên. Thao tác SHALL không đổi văn bản, segment hay liên kết đã có, và SHALL báo số cặp đã ghép ở mỗi bước.

#### Scenario: Có ứng viên ngữ nghĩa đủ tin
- **WHEN** việc ước lượng đề xuất một cặp đủ tin cậy giữa một hàng chưa dịch và một segment dịch chưa ghép
- **THEN** hàng đó được nối với độ tin cậy đó, trạng thái `ok`, hàng hiện là *AI đã dịch* (không phải *Cần kiểm tra*), và cặp này không rơi vào bước ghép theo thứ tự

#### Scenario: Ứng viên ngữ nghĩa tin cậy thấp
- **WHEN** việc ước lượng đề xuất một cặp nhưng độ tin cậy dưới ngưỡng đủ dùng
- **THEN** hàng đó được nối với độ tin cậy đó, trạng thái `needs_review`, hàng hiện là *Cần kiểm tra*

#### Scenario: Bản dịch viết sẵn ở Toàn văn, không có ứng viên ngữ nghĩa
- **WHEN** chương có 10 hàng chưa dịch và bản dịch toàn văn có 9 segment chưa ghép, và việc ước lượng không đề xuất được cặp nào cho các segment này
- **THEN** 9 hàng đầu được nối theo thứ tự với 9 segment dịch, không có độ tin cậy, trạng thái `needs_review`, hàng 10 vẫn *Chưa dịch*, văn bản dịch không đổi
