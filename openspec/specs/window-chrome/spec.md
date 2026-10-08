# window-chrome Specification

## Purpose

Quy định khung cửa sổ của Mira trên desktop theo Hermes Desktop: thanh tiêu đề gộp với thanh trên, màu
nút cửa sổ theo theme, zoom mặc định và hiệu ứng kính acrylic tùy chọn.

## Requirements

### Requirement: Thanh trên là thanh tiêu đề cao 34 px

Trên Windows, thanh trên của trang SHALL là thanh tiêu đề của cửa sổ, cao 34 px (đơn vị CSS). Hệ điều
hành SHALL chỉ vẽ ba nút cửa sổ ở đầu phải thanh đó. Ba nút SHALL có chiều cao khớp thanh trên sau khi
áp zoom. Màu nền và màu biểu tượng của ba nút SHALL lấy từ màu khung và màu chữ phụ của theme đang dùng.
Đổi theme SHALL đổi màu ba nút ngay. macOS SHALL giữ khung gốc của hệ điều hành.

#### Scenario: Đổi sang theme sáng
- **WHEN** người dùng chuyển từ theme tối sang theme sáng
- **THEN** ba nút cửa sổ đổi nền và biểu tượng sang màu khung và chữ phụ của theme sáng, không còn dải
  màu tối

#### Scenario: Kéo cửa sổ
- **WHEN** người dùng kéo vùng trống của thanh trên
- **THEN** cửa sổ di chuyển. Bấm vào nút hay tab trên thanh đó vẫn là bấm, không kéo cửa sổ

#### Scenario: Màu chép tay lệch token
- **WHEN** màu khung hoặc chữ phụ trong token khác bản sao mà main process dùng cho ba nút cửa sổ
- **THEN** test fail

### Requirement: Zoom mặc định 90 %

Nội dung cửa sổ Mira SHALL hiển thị ở zoom 90 %, như Hermes Desktop. Các cỡ chữ trong token vì vậy là
cỡ trước zoom. Cỡ chữ của editor chương SHALL được nâng để bù, sao cho văn bản truyện hiển thị không nhỏ
hơn trước change này. Phím tắt zoom của trình duyệt SHALL không làm lệch thanh trên khỏi ba nút cửa sổ.

#### Scenario: Mở app
- **WHEN** người dùng mở Mira
- **THEN** nội dung hiển thị ở zoom 90 %, và overlay nút cửa sổ cao bằng thanh trên đã zoom

#### Scenario: Văn bản truyện
- **WHEN** người dùng mở một chương sau change này
- **THEN** chữ trong editor có kích thước hiển thị không nhỏ hơn bản trước change

### Requirement: Kính acrylic tùy chọn

Cài đặt SHALL có nhóm "Giao diện" với công tắc "Hiệu ứng kính (acrylic)", **mặc định tắt**.

Khi bật:

- Trên Windows 11 build 22621 trở lên, cửa sổ SHALL dùng chất liệu acrylic.
- Sidebar SHALL trong suốt một phần để thấy lớp kính.
- Cột nội dung và editor SHALL giữ nền đặc để chữ dễ đọc.

Khi tắt, hoặc khi máy không hỗ trợ, cửa sổ SHALL dùng nền đặc theo theme.

Lựa chọn SHALL được ghi nhớ giữa các lần mở app. Thay đổi SHALL có hiệu lực ngay, không cần khởi động
lại. Khi Windows bật "giảm trong suốt" (transparency effects tắt), Mira SHALL hiển thị nền đặc dù công
tắc đang bật.

#### Scenario: Bật kính
- **WHEN** người dùng bật công tắc kính trên Windows 11 build 22621
- **THEN** sidebar hiện lớp acrylic ngay, còn vùng editor vẫn nền đặc

#### Scenario: Máy không hỗ trợ
- **WHEN** Mira chạy trên Windows 10 hoặc Windows 11 bản cũ hơn 22621
- **THEN** công tắc bị khóa kèm dòng giải thích máy không hỗ trợ, và cửa sổ dùng nền đặc

#### Scenario: Mở lại app
- **WHEN** người dùng đã bật kính, đóng rồi mở lại Mira
- **THEN** cửa sổ mở lên với kính đã bật, không có khung hình nền đặc rồi mới chuyển sang kính

#### Scenario: Lần đầu cài
- **WHEN** Mira chạy lần đầu
- **THEN** kính đang tắt
