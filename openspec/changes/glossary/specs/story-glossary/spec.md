## Purpose

Lưu trữ, tổ chức và truy vấn danh mục thuật ngữ theo từng tác phẩm trong tệp dữ liệu SQLite (.mira), bao gồm các dạng viết khác (alias), thuật ngữ cấm, phạm vi hiệu lực theo chương, và hỗ trợ nhập hàng loạt từ tệp Names.txt.

## ADDED Requirements

### Requirement: Lưu trữ mục thuật ngữ và dạng viết khác

Hệ thống SHALL lưu các mục thuật ngữ vào bảng `context_entry` trong tệp `.mira` của tác phẩm với kiểu `term`. Mỗi mục SHALL có từ khóa gốc (`source`), bản dịch đích (`target`), trạng thái duyệt (`status`: `approved | pending | rejected`), nguồn gốc (`origin`: `user | ai | import`), và cờ cấm (`forbidden`: boolean). Mỗi mục SHALL có thể có nhiều dạng viết khác (`context_alias`).

#### Scenario: Thêm mục thuật ngữ mới hợp lệ
- **WHEN** người dùng tạo mục thuật ngữ với từ gốc và bản dịch đích
- **THEN** mục được lưu vào cơ sở dữ liệu tác phẩm với trạng thái `approved` và nguồn gốc `user`

#### Scenario: Thêm các dạng viết khác (alias)
- **WHEN** người dùng thêm một hoặc nhiều alias cho mục thuật ngữ
- **THEN** các alias được lưu kèm và trỏ tới đúng ID của mục thuật ngữ đó

#### Scenario: Ràng buộc tính duy nhất của từ khóa và alias
- **WHEN** người dùng tạo hoặc sửa một mục có từ khóa hoặc alias trùng với một mục đã tồn tại trong cùng tác phẩm
- **THEN** hệ thống từ chối lưu và thông báo lỗi trùng lặp rõ ràng

### Requirement: Phạm vi hiệu lực theo chương

Mỗi mục thuật ngữ SHALL có thể gán phạm vi hiệu lực từ chương bắt đầu (`from_chapter_id`) và/hoặc chương kết thúc (`to_chapter_id`). Khi không khai báo, mục thuật ngữ SHALL có hiệu lực trên toàn bộ tác phẩm.

#### Scenario: Truy vấn thuật ngữ có hiệu lực tại một chương
- **WHEN** hệ thống truy vấn các thuật ngữ hiệu lực tại một chương cụ thể
- **THEN** chỉ các mục không có giới hạn chương, hoặc có chương đang xét nằm trong khoảng `[from, to]` mới được trả về

#### Scenario: Chương làm mốc hiệu lực bị xóa
- **WHEN** một chương được dùng làm mốc `from_chapter_id` hoặc `to_chapter_id` bị xóa khỏi tác phẩm
- **THEN** trường liên kết của mục thuật ngữ được tự động đặt về `NULL` mà không làm mất mục thuật ngữ

### Requirement: Nhập thuật ngữ từ tệp Names.txt

Hệ thống SHALL hỗ trợ phân tích và nhập các cặp thuật ngữ từ định dạng văn bản `Names.txt` (dạng `Từ_gốc=Từ_dịch`, phân tách theo dòng). Các dòng trống hoặc chú thích bắt đầu bằng `#` hoặc `//` SHALL được bỏ qua.

#### Scenario: Nhập tệp Names.txt hợp lệ
- **WHEN** người dùng chọn tệp `Names.txt` chứa danh sách `Từ_gốc=Từ_dịch`
- **THEN** hệ thống đọc, chuẩn hóa, lưu các mục chưa có vào tác phẩm với nguồn gốc `import`, và báo cáo số mục đã nhập thành công và số mục bị trùng/bỏ qua

#### Scenario: Nhập dòng bị lỗi định dạng
- **WHEN** tệp chứa các dòng không có dấu `=` hoặc rỗng một bên
- **THEN** hệ thống bỏ qua các dòng lỗi đó, tiếp tục nhập các dòng hợp lệ, và liệt kê các dòng bị bỏ qua trong kết quả

### Requirement: Quản lý trạng thái duyệt

Mỗi mục thuật ngữ SHALL có trạng thái duyệt gồm `approved` (đã duyệt), `pending` (chờ duyệt), và `rejected` (đã loại). Chỉ các mục `approved` mới được cung cấp cho Lõi dịch để đưa vào prompt.

#### Scenario: Duyệt mục thuật ngữ đang chờ
- **WHEN** người dùng chấp nhận một mục thuật ngữ đang ở trạng thái `pending`
- **THEN** trạng thái của mục chuyển sang `approved` và sẵn sàng tham gia vào quá trình dịch

#### Scenario: Từ chối mục thuật ngữ
- **WHEN** người dùng từ chối một mục thuật ngữ
- **THEN** trạng thái chuyển sang `rejected`, mục này không bị xóa khỏi kho nhưng không bao giờ được gửi cho AI
