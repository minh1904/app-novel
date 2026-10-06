## ADDED Requirements

### Requirement: Phiên bản thử nghiệm khai cặp trước bản dịch
Prompt v4 SHALL yêu cầu khai người nói/người nghe và cách xưng gọi trước `dst`, ưu tiên cặp đã duyệt. v1/v2/v3 SHALL giữ hợp đồng đầu ra hiện tại. Trường phụ SHALL NOT trở thành nội dung dịch.

#### Scenario: Cặp có tên gọi và đại từ ngôi hai riêng
- **WHEN** cặp khai tự xưng tôi, gọi bằng tên kèm kính ngữ, ngôi hai cậu
- **THEN** prompt hướng dẫn chọn tôi/cậu cho `xung`/`goi` và giữ tên theo quy ước

#### Scenario: Gọi lại các đoạn thiếu
- **WHEN** gửi request repair bằng v4
- **THEN** cùng quy tắc chọn cặp và lọc mục chưa duyệt được áp dụng

### Requirement: Đo cùng điều kiện
Kết quả SHALL ghi rõ phiên bản, model, chia lô, phạm vi, chi phí, thiếu đoạn và giới hạn phép chấm.

#### Scenario: Hai bản cũ khác cách chia lô
- **WHEN** T0 nguyên chương và T1 chia nhỏ
- **THEN** chạy đối chứng cùng chia lô trước khi kết luận hiệu quả thay prompt
