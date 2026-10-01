## MODIFIED Requirements

### Requirement: Hiển thị bản gốc theo segment

Khi chương có bản gốc, màn SHALL hiển thị số segment và số ký tự, và hiển thị bản gốc trong editor soạn thảo theo đặc tả `source-editor`: sửa được trực tiếp, lề hiện số dòng, các đoạn khác nhau phân biệt được bằng xuống dòng trong văn bản. Màn SHALL mở và cuộn được chương 5.000 segment mà không làm giao diện đứng. Văn bản tiếng Trung, Nhật SHALL dùng đúng phông chữ theo ngôn ngữ nguồn của tác phẩm. Số segment và số ký tự SHALL cập nhật sau mỗi lần lưu.

#### Scenario: Chương đã nhập
- **WHEN** người dùng mở chương có bản gốc 40 segment
- **THEN** màn hiện "40 segment" và editor chứa đúng văn bản, với số dòng ở lề

#### Scenario: Chương rất nhiều segment
- **WHEN** người dùng mở chương có 5.000 segment
- **THEN** văn bản hiện ngay và các thao tác cuộn, gõ không đứng hình

#### Scenario: Phông chữ Nhật
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật
- **THEN** văn bản bản gốc hiển thị bằng phông chữ hợp tiếng Nhật chứ không phải phông tiếng Trung

#### Scenario: Số segment sau khi sửa
- **WHEN** người dùng xóa trọn một câu rồi lưu
- **THEN** số segment hiển thị giảm đi một

### Requirement: Thay bản gốc từ màn chương

Khi chương đã có bản gốc, màn SHALL có hành động "Thay bản gốc" mở luồng nhập và áp dụng yêu cầu thay bản gốc của đặc tả nhập liệu. Nếu editor còn thay đổi chưa lưu, hành động này SHALL áp dụng yêu cầu "Rời khỏi khi còn thay đổi chưa lưu" của đặc tả `source-editor` trước khi mở luồng. Sau khi nhập hoặc thay thành công, màn SHALL hiển thị ngay bản gốc mới và số segment mới trong editor với lịch sử hoàn tác trống, không cần mở lại chương.

#### Scenario: Nhập xong
- **WHEN** người dùng xác nhận nhập một văn bản vào chương trống
- **THEN** màn chuyển sang hiển thị bản gốc trong editor và danh sách chương của tác phẩm phản ánh chương đã có bản gốc

#### Scenario: Thay khi còn sửa dở
- **WHEN** người dùng có thay đổi chưa lưu trong editor và bấm "Thay bản gốc"
- **THEN** hệ thống hỏi lưu, bỏ hay ở lại trước khi mở luồng thay bản gốc

#### Scenario: Thay thành công
- **WHEN** người dùng thay bản gốc thành công
- **THEN** editor hiện văn bản mới, trạng thái "đã lưu" và không còn gì để hoàn tác
