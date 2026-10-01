## ADDED Requirements

### Requirement: Chương chưa có bản gốc dùng chung khung với chương đã có

Chương chưa có bản gốc SHALL dùng cùng khung với chương đã có bản gốc: một **thanh chương cao 42px** mang tên chương, tác phẩm và cặp ngôn ngữ, và một nút quay về tác phẩm ở mép phải. Chỉ phần giữa màn đổi, để vào và ra khỏi trạng thái này không thấy màn đổi khung.

Phần giữa SHALL hiện **hai thẻ ngang nhau**, không phải một khối có hai nút:

- Thẻ **"Dán văn bản"** SHALL nói lối này hợp khi nào và mở hộp thoại nhập ở bước dán.
- Thẻ **"Chọn hoặc kéo tệp vào"** SHALL nêu định dạng nhận được, giới hạn kích thước và việc bảng mã được nhận tự động; thẻ này SHALL nhận thả tệp vào thẳng nó, và SHALL hiện rõ khi tệp đang được kéo lên trên nó.

Hai thẻ SHALL cùng cỡ, vì chưa có bằng chứng lối nào thường dùng hơn. Thả một tệp vào thẻ SHALL mở hộp thoại nhập ở bước xem trước, giống như chọn tệp qua nút.

#### Scenario: Hai lối đi nói rõ khác nhau ở đâu
- **WHEN** người dùng mở một chương chưa có bản gốc
- **THEN** màn hiện hai thẻ "Dán văn bản" và "Chọn hoặc kéo tệp vào", mỗi thẻ có một câu nói lối đó hợp khi nào

#### Scenario: Kéo tệp thả vào thẻ
- **WHEN** người dùng kéo một tệp .txt lên thẻ chọn tệp rồi thả
- **THEN** thẻ đổi hình trong lúc kéo, và khi thả thì hộp thoại nhập mở ở bước xem trước với nội dung tệp đó

#### Scenario: Khung không đổi giữa hai trạng thái
- **WHEN** người dùng nhập bản gốc xong cho một chương đang rỗng
- **THEN** thanh chương 42px vẫn ở nguyên chỗ, chỉ phần giữa đổi từ hai thẻ thành hai pane dịch
