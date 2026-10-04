## ADDED Requirements

### Requirement: Tích hợp thuật ngữ khớp vào Tầng C của prompt

Lõi dịch SHALL tiếp nhận danh sách các mục thuật ngữ đã khớp từ văn bản nguồn và chèn vào Tầng C (`layerC`) của prompt hệ thống khi dịch. Lõi dịch SHALL chỉ chấp nhận các thuật ngữ ở trạng thái đã duyệt (`approved`), và SHALL tính toán `contextHash` bao gồm thông tin các thuật ngữ đã gửi.

#### Scenario: Chèn thuật ngữ đã duyệt vào prompt
- **WHEN** một hoặc nhiều thuật ngữ đã duyệt khớp với văn bản nguồn của lô dịch
- **THEN** prompt Tầng C chứa các cặp thuật ngữ nguồn - đích và chỉ dẫn dịch bắt buộc tuân thủ

#### Scenario: Mục chưa duyệt không được đưa vào prompt
- **WHEN** thuật ngữ khớp nhưng đang ở trạng thái `pending` hoặc `rejected`
- **THEN** thuật ngữ đó bị loại bỏ hoàn toàn và không xuất hiện trong bất kỳ khối prompt nào gửi tới mô hình AI
