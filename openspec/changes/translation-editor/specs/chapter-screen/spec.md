## MODIFIED Requirements

### Requirement: Hiển thị bản gốc theo segment

Khi chương có bản gốc, màn SHALL hiển thị số segment và số ký tự của từng bên có văn bản, và hiển thị chương trong màn editor hai pane theo đặc tả `full-text-editor` (bản gốc bên trái, bản dịch bên phải): bản gốc khóa mặc định và mở khóa để sửa lỗi, bản dịch sửa trực tiếp. Lề của từng pane hiện số dòng, các đoạn khác nhau phân biệt được bằng xuống dòng trong văn bản. Màn SHALL mở và cuộn được chương 5.000 segment mà không làm giao diện đứng. Văn bản tiếng Trung, Nhật SHALL dùng đúng phông chữ theo ngôn ngữ nguồn của tác phẩm. Số segment và số ký tự SHALL cập nhật sau mỗi lần lưu.

#### Scenario: Chương đã nhập
- **WHEN** người dùng mở chương có bản gốc 40 segment và chưa có bản dịch
- **THEN** màn hiện "40 segment" cho bản gốc và editor hai pane, pane dịch trống với gợi ý

#### Scenario: Chương có cả hai bên
- **WHEN** người dùng mở chương có bản gốc 40 segment và bản dịch 42 segment
- **THEN** màn hiện số segment của từng bên và hai pane với đúng nội dung

#### Scenario: Chương rất nhiều segment
- **WHEN** người dùng mở chương có 5.000 segment mỗi bên
- **THEN** văn bản hiện ngay và các thao tác cuộn, gõ không đứng hình

#### Scenario: Phông chữ Nhật
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật
- **THEN** văn bản bản gốc hiển thị bằng phông chữ hợp tiếng Nhật chứ không phải phông tiếng Trung

#### Scenario: Số segment sau khi sửa
- **WHEN** người dùng xóa trọn một câu của bản dịch rồi lưu
- **THEN** số segment của bản dịch giảm đi một
