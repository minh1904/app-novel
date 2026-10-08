# settings-modal Specification

## Purpose

Quy định modal Cài đặt của Mira theo Hermes Desktop: khung phủ lên app, điều hướng, tìm kiếm, link sâu,
hàng cài đặt dùng chung và cách lưu, cùng hai nhóm Giao diện và Về Mira.

## Requirements

### Requirement: Cài đặt là một modal phủ lên app

Cài đặt SHALL mở thành một thẻ lớn phủ lên app, không thay màn đang xem:

- nền phủ đen 22 % có blur;
- thẻ cách thanh trên một khoảng, có viền và bóng;
- màn phía sau giữ nguyên trạng thái.

Esc, nút đóng, hoặc bấm vào nền phủ SHALL đóng modal. Focus SHALL nằm trong modal khi mở, và trở về nút đã
mở nó khi đóng. Nút bánh răng trên thanh trên SHALL mở modal ở mọi màn.

#### Scenario: Mở từ màn chương
- **WHEN** người dùng đang sửa chương 5 rồi bấm bánh răng
- **THEN** modal mở đè lên màn chương; đóng modal thì vẫn ở chương 5 với con trỏ và bản sửa như cũ

#### Scenario: Esc
- **WHEN** modal đang mở và không có menu con nào mở
- **THEN** Esc đóng modal và focus trở về nút bánh răng

### Requirement: Điều hướng dọc và breadcrumb

Modal SHALL có cột điều hướng rộng 13rem gồm các nhóm Model, Kết nối AI, Giao diện, Về Mira. Mỗi nhóm có
các mục con. Nhóm đang mở SHALL hiện mục con của nó. Mục đang chọn SHALL được đánh dấu. Đầu vùng nội dung
SHALL là breadcrumb "Cài đặt › Nhóm › Mục", thay cho tiêu đề trang. Khi modal hẹp hơn 47,5rem, cột điều
hướng SHALL thành một dropdown.

#### Scenario: Chọn mục con
- **WHEN** người dùng bấm "Khóa API" trong nhóm Kết nối AI
- **THEN** vùng nội dung hiện mục Khóa API và breadcrumb ghi "Cài đặt › Kết nối AI › Khóa API"

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ thu nhỏ làm modal hẹp hơn 47,5rem
- **THEN** cột điều hướng thành một dropdown, vẫn chọn được mọi mục

### Requirement: Tìm trong cài đặt

Một ô tìm kiếm SHALL nằm vắt trên mép trên của thẻ. Bấm vào ô, hoặc gõ một phím chữ khi focus không ở
trong ô nhập, SHALL mở danh sách kết quả lọc theo tên và mô tả của mọi hàng cài đặt và mọi thẻ provider.
Chọn một kết quả SHALL chuyển tới mục đó, cuộn tới hàng và làm hàng nhấp sáng khoảng 1,6 giây.

#### Scenario: Tìm khóa
- **WHEN** người dùng mở modal rồi gõ "gemini"
- **THEN** danh sách có thẻ Google Gemini; chọn nó thì mục Khóa API mở và thẻ Gemini nhấp sáng

### Requirement: Link sâu

Mira SHALL mở được modal ở một nhóm, mục và hàng cụ thể bằng một địa chỉ nội bộ gồm nhóm, mục và khóa.
Thông báo lỗi kết nối, onboarding và menu model SHALL dùng link sâu để đưa người dùng tới đúng chỗ cần
sửa.

#### Scenario: Từ lỗi khóa
- **WHEN** một lượt chat thất bại vì khóa Gemini sai và người dùng bấm "Sửa khóa"
- **THEN** modal mở ở Kết nối AI › Khóa API, thẻ Gemini mở ra và nhấp sáng

### Requirement: Hàng cài đặt và cách lưu

Mọi hàng cài đặt SHALL dùng một component chung:

- tên 13 px, mô tả 12 px muted;
- control ở cột phải rộng 15–22rem, rơi xuống dưới mô tả khi vùng nội dung hẹp;
- không kẻ đường giữa các hàng;
- mọi bật/tắt là Switch.

Trường văn bản và lựa chọn SHALL tự lưu sau 550 ms không đổi, các lần lưu không được vượt nhau, và báo lỗi
bằng toast khi lưu hỏng. Khóa API, model chính và endpoint tùy chỉnh SHALL có nút lưu riêng. Toast thành
công SHALL tự ẩn sau 5 giây ở góc dưới phải. Toast lỗi hoặc toast có nút SHALL đứng yên ở giữa trên cho tới
khi người dùng đóng.

#### Scenario: Gõ nhanh
- **WHEN** người dùng gõ liên tục vào ô tên endpoint trong 2 giây rồi dừng
- **THEN** chỉ có một lần lưu, khoảng 550 ms sau ký tự cuối

#### Scenario: Lưu hỏng
- **WHEN** lưu một hàng thất bại
- **THEN** một toast lỗi đứng yên hiện lý do, và hàng vẫn giữ giá trị người dùng vừa gõ

### Requirement: Nhóm Giao diện và Về Mira

Nhóm Giao diện SHALL gồm:

- **Theme:** chọn Sáng / Tối / Theo hệ thống bằng SegmentedControl.
- **Kính:** công tắc hiệu ứng kính hiện có, cùng điều kiện hỗ trợ.

"Theo hệ thống" SHALL đổi theme khi Windows đổi chế độ sáng/tối. Lựa chọn SHALL được ghi nhớ giữa các lần
mở app.

Nhóm Về Mira SHALL hiện tên, phiên bản và nền tảng.

#### Scenario: Theo hệ thống
- **WHEN** người dùng chọn "Theo hệ thống" rồi Windows chuyển sang chế độ tối
- **THEN** Mira chuyển sang theme tối mà không cần mở lại
