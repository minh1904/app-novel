# design-system Specification

## Purpose

Cho mọi màn của Mira cùng một ngôn ngữ thị giác theo Hermes Desktop (skin "nous"): màu, chữ, bán kính,
bóng, chuyển động, thanh cuộn và bộ component dùng chung. Đồng thời giữ được thao tác bằng bàn phím và
việc chọn chữ trong văn bản truyện.

## Requirements

### Requirement: Bảng màu theo skin "nous" cho hai theme

Mira SHALL lấy màu giao diện từ bảng màu skin "nous" của Hermes Desktop cho theme sáng và theme tối,
gồm: nền, chữ, card, muted, popover, accent, viền, destructive, sidebar và bong bóng tin người dùng.
Mặt nền, lớp phủ hover/chọn, các bậc chữ và các bậc viền SHALL được dẫn xuất từ các màu gốc đó, không
đặt màu rời ở từng màn. Accent SHALL là `#0053fd` ở theme sáng và `#4a84fe` ở theme tối.

#### Scenario: Theme tối
- **WHEN** Mira chạy ở theme tối
- **THEN** sidebar dùng màu gốc `#010409` trộn với trung tính tối của Hermes, accent là `#4a84fe`, và chữ
  chính là màu chữ nền `#e6edf3` ở độ đục 94 %

#### Scenario: Theme sáng
- **WHEN** Mira chạy ở theme sáng
- **THEN** nút primary có nền `#0053fd` với chữ `#fcfcfc`, và viền mặc định dẫn xuất từ accent cùng màu chữ
  nền

#### Scenario: Đổi theme
- **WHEN** người dùng đổi giữa sáng và tối
- **THEN** mọi màn đổi màu theo mà không cần tải lại cửa sổ, và không còn màu nào của hướng Obsidian cũ

### Requirement: Chữ theo thang của Hermes

Chữ thân của giao diện SHALL là 13 px. Thang chữ UI SHALL gồm năm cỡ 11, 12, 13, 14 và 16 px. Font UI
SHALL là `'Segoe WPC', 'Segoe UI'` kèm fallback hệ thống. Font code SHALL là JetBrains Mono, đóng gói
trong app nên không phụ thuộc mạng. Editor chương SHALL tiếp tục dùng font editor riêng của Mira. Nút và
nhãn SHALL dùng weight 500; chữ nhấn dùng 600.

#### Scenario: Cỡ chữ ngoài thang
- **WHEN** một màn trong renderer dùng cỡ chữ pixel tùy ý hoặc tên cỡ chữ mặc định của Tailwind
- **THEN** phép kiểm token fail và chỉ ra file cùng giá trị vi phạm

#### Scenario: Không có mạng
- **WHEN** máy không có kết nối mạng
- **THEN** khối code vẫn hiển thị bằng JetBrains Mono

### Requirement: Bán kính, bóng và chuyển động theo Hermes

Bán kính SHALL như sau: 2,5 px cho nút chữ và ô nhập; 3 px cho badge; 3,2 px cho dialog; 4 px cho nút
icon và tooltip. Menu, select và popover SHALL có bóng `shadow-md`, nền elevated đục 96 % và hiệu ứng mờ
nền. Dialog SHALL có bóng nhiều lớp mềm (`shadow-nous`), viền mảnh và lớp phủ nền đen 22 % có blur.
Chuyển trạng thái của control SHALL mất 100 ms; ô nhập và dialog mất 200 ms. Khi hệ điều hành yêu cầu
giảm chuyển động, transition SHALL tắt nhưng spinner vẫn quay.

#### Scenario: Mở menu
- **WHEN** người dùng mở một menu hoặc select
- **THEN** menu có nền hơi trong, nội dung phía sau bị làm mờ, có bóng và viền theo token

#### Scenario: Giảm chuyển động
- **WHEN** Windows bật tắt hiệu ứng động
- **THEN** hover và mở dialog đổi trạng thái tức thì, còn spinner vẫn quay

#### Scenario: Bán kính tùy ý
- **WHEN** một màn dùng bán kính hoặc bóng không có tên trong bảng token
- **THEN** phép kiểm token fail

### Requirement: Focus và chọn chữ

Mọi control tương tác SHALL hiện vòng focus 2 px màu accent khi được focus bằng bàn phím
(`:focus-visible`). Vòng focus SHALL không hiện khi bấm chuột. Văn bản truyện trong editor, câu trả lời
AI và nội dung chương SHALL chọn được để sao chép. Chữ của khung (thanh trên, sidebar, nhãn nút) có thể
không chọn được.

#### Scenario: Điều hướng bằng Tab
- **WHEN** người dùng nhấn Tab qua các nút trong một dialog
- **THEN** nút đang được focus có vòng accent nhìn thấy được

#### Scenario: Bấm chuột
- **WHEN** người dùng bấm chuột vào một nút
- **THEN** không có vòng focus hiện ra

#### Scenario: Sao chép câu trả lời
- **WHEN** người dùng kéo chọn một đoạn trong câu trả lời AI
- **THEN** đoạn đó được bôi đen bằng màu chọn chữ của theme và sao chép được

### Requirement: Thanh cuộn và lớp chồng

Vùng cuộn SHALL dùng thanh cuộn rộng 8 px, track trong suốt. Thumb SHALL chỉ hiện khi rê chuột vào vùng
cuộn và đậm hơn khi rê vào chính thumb. Lớp chồng SHALL theo một thang z-index có tên: nền phủ của
modal, modal, popover trong modal, và lớp trên modal. Không màn nào được đặt z-index số tùy ý.

#### Scenario: Rê vào danh sách chương
- **WHEN** chuột rê vào danh sách chương dài
- **THEN** thumb thanh cuộn hiện ra, rồi ẩn đi khi chuột rời

#### Scenario: Menu trong dialog
- **WHEN** người dùng mở một select bên trong dialog
- **THEN** danh sách của select nằm trên dialog chứ không bị dialog che

### Requirement: Bộ component dùng chung theo Hermes

Renderer SHALL có bộ component dùng chung với các biến thể và cỡ như Hermes Desktop:

- **Button:** biến thể default, destructive, outline, secondary, ghost, link, text; các cỡ xs, sm,
  default, lg và cỡ icon. Trạng thái loading SHALL giữ nguyên kích thước nút.
- **Ô nhập (TextField, TextArea, Select):** cùng một kiểu khung. Viền nhạt đậm lên khi hover, chuyển sang
  màu accent khi focus, đỏ khi không hợp lệ.
- **Các component khác:** Menu, Dialog, Switch, Tabs, Badge, SearchField, Panel và Banner.
- **Thêm mới:** Tooltip (nền màu chữ, chữ 11 px, có mũi tên, trễ khoảng 200 ms rồi mới hiện) và
  SegmentedControl.

#### Scenario: Tooltip trên nút icon
- **WHEN** người dùng rê chuột vào một nút chỉ có icon trên thanh trên
- **THEN** sau khoảng 200 ms một tooltip hiện tên tác vụ, thay cho thuộc tính `title` của trình duyệt

#### Scenario: Nút đang tải
- **WHEN** một nút chuyển sang trạng thái đang tải
- **THEN** nút hiện spinner và giữ nguyên chiều rộng, chiều cao

#### Scenario: Ô nhập sai
- **WHEN** một ô nhập được đánh dấu không hợp lệ
- **THEN** viền ô chuyển màu destructive
