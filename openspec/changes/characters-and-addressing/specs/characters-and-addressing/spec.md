## Purpose

Quản lý danh sách nhân vật và ma trận quan hệ xưng hô đối thoại có chiều cấp tác phẩm, có hiệu lực theo chương và hỗ trợ các chiến lược xưng hô nhất quán trong tiểu thuyết.

## ADDED Requirements

### Requirement: Lưu trữ và phân loại mục nhân vật

Hệ thống SHALL lưu trữ thông tin nhân vật (`character`) của tác phẩm bao gồm tên hiển thị, tên gốc, giới tính, vai vế/mô tả ngắn, trạng thái duyệt (`approved | pending | rejected`) và danh sách các bí danh/tên gọi khác (`aliases`).

#### Scenario: Thêm nhân vật mới thành công
- **WHEN** người dùng tạo một nhân vật mới với tên gốc, giới tính và vai vế
- **THEN** hệ thống lưu nhân vật vào cơ sở dữ liệu tác phẩm với ID duy nhất và trạng thái duyệt mặc định là `approved`

#### Scenario: Quản lý bí danh của nhân vật
- **WHEN** người dùng cập nhật danh sách các dạng viết khác hoặc biệt danh của nhân vật
- **THEN** hệ thống lưu trữ các alias tương ứng và đảm bảo chúng liên kết chính xác với nhân vật đó

### Requirement: Ma trận quan hệ xưng hô có chiều giữa các cặp nhân vật

Hệ thống SHALL lưu trữ các quan hệ xưng hô (`dyad`) có chiều xác định: quan hệ từ nhân vật $A$ đến nhân vật $B$ xác định cách $A$ tự xưng (`speaker_pronoun`) và cách $A$ gọi $B$ (`recipient_pronoun`). Chiều $B \to A$ là một bản ghi độc lập và hệ thống SHALL NOT tự ý đảo ngược từ xưng hô để tạo chiều ngược lại.

#### Scenario: Thiết lập xưng hô một chiều A đến B
- **WHEN** người dùng thiết lập $A \to B$ là tự xưng "ta", gọi $B$ là "ngươi"
- **THEN** hệ thống ghi nhận đúng quy ước $A \to B$ mà không tự động gán $B \to A$ thành "ngươi" - "ta"

#### Scenario: Cập nhật độc lập cả hai chiều quan hệ
- **WHEN** người dùng thiết lập $A \to B$ là "huynh" - "muội" và $B \to A$ là "muội" - "huynh"
- **THEN** hệ thống lưu 2 bản ghi riêng biệt cho 2 chiều quan hệ

### Requirement: Hiệu lực xưng hô theo khoảng chương

Mỗi quy ước xưng hô SHALL có phạm vi hiệu lực theo chương tùy chọn (`from_chapter_id` và `to_chapter_id`). Khi truy vấn xưng hô cho một chương cụ thể, hệ thống SHALL chỉ trả về các quy ước có hiệu lực bao gồm chương đó.

#### Scenario: Thay đổi cách xưng hô theo diễn biến truyện
- **WHEN** cặp $A \to B$ có quy ước xưng hô thân mật từ Chương 10 trở đi
- **THEN** khi truy vấn tại Chương 5 hệ thống trả về quy ước ban đầu (hoặc không có), và tại Chương 12 hệ thống trả về quy ước thân mật

#### Scenario: Cặp xưng hô không bị áp dụng ngoài phạm vi hiệu lực
- **WHEN** quy ước chỉ có hiệu lực đến hết Chương 20
- **THEN** khi truy vấn tại Chương 25 quy ước này không được áp dụng

### Requirement: Trạng thái duyệt và bảo mật dữ liệu

Hệ thống SHALL gán trạng thái duyệt (`approved | pending | rejected`) cho từng nhân vật và cặp xưng hô. Khi cung cấp dữ liệu cho lõi dịch hoặc dịch vụ bên ngoài, hệ thống SHALL chỉ cung cấp các mục có trạng thái `approved`.

#### Scenario: Loại trừ xưng hô chưa duyệt khỏi dữ liệu gửi cho AI
- **WHEN** một cặp xưng hô đang ở trạng thái `pending` hoặc `rejected`
- **THEN** hệ thống không đưa cặp xưng hô đó vào danh sách gửi tới AI khi dịch chương
