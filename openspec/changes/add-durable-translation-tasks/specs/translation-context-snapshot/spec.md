## MODIFIED Requirements

### Requirement: Chụp ngữ cảnh một lần khi lập kế hoạch

Khi lập kế hoạch một lượt dịch chương, hệ thống SHALL chụp ngữ cảnh tác phẩm đã duyệt áp cho chương đó:
glossary hiệu lực (gồm alias, ghi chú, mục cấm), cặp xưng hô hiệu lực, nhân vật đã duyệt và bộ mặc định
suy ra từ tác phẩm. Bản chụp SHALL được lưu bền trong dữ liệu của tác phẩm, gắn với định danh lượt dịch,
và SHALL không đổi sau khi tạo. Kế hoạch trả về SHALL cho biết bản chụp gồm bao nhiêu mục mỗi loại.
Item của task dịch bền là một lượt dịch: bản chụp SHALL được tạo khi item bắt đầu chạy lần đầu và mọi lần
chạy sau của item SHALL dùng lại bản chụp đó. Việc dọn bản chụp mồ côi SHALL không xóa bản chụp còn được
một đề xuất hoặc một item của task tham chiếu.

#### Scenario: Lập kế hoạch tạo bản chụp
- **WHEN** người dùng lập kế hoạch dịch một chương có glossary, cặp xưng hô và nhân vật đã duyệt
- **THEN** hệ thống lưu một bản chụp gắn với lượt dịch, và kế hoạch hiện số mục glossary, cặp xưng hô và nhân vật trong bản chụp

#### Scenario: Mục chưa duyệt không vào bản chụp
- **WHEN** chương có mục glossary đang chờ duyệt
- **THEN** bản chụp không chứa mục đó

#### Scenario: Bản chụp của item task không bị dọn
- **WHEN** bản chụp của một item task đã cũ hơn hạn dọn bản chụp mồ côi và không có đề xuất nào trỏ tới
- **THEN** lần dọn bản chụp mồ côi kế tiếp giữ nguyên bản chụp đó, và Retry item vẫn dùng được nó
