## ADDED Requirements

### Requirement: Tiêm ma trận xưng hô của chương vào Tầng B của Prompt

Khi chuẩn bị prompt dịch cho một chương, lõi dịch SHALL nhận ma trận xưng hô gồm các cặp `dyad` có hiệu lực tại chương đó và định dạng thành khối chỉ dẫn xưng hô rõ ràng đưa vào Tầng B (Layer B) của system prompt.

#### Scenario: Tiêm ma trận xưng hô thành công vào Layer B
- **WHEN** chương có các cặp xưng hô đã duyệt giữa các nhân vật trong truyện
- **THEN** prompt được xây dựng chứa khối `[XƯNG HÔ & ĐỐI THOẠI]` trong Tầng B với quy ước rõ ràng cho từng cặp nhân vật

#### Scenario: Bảo mật dữ liệu chưa duyệt
- **WHEN** có các cặp xưng hô ở trạng thái `pending` hoặc `rejected`
- **THEN** lõi dịch hoàn toàn loại bỏ các mục này khỏi khối Layer B trước khi gửi tới mô hình AI
