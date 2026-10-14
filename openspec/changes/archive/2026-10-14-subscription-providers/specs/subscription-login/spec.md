## Purpose

Quy định cách người dùng đăng nhập gói ChatGPT/Codex và GitHub Copilot ngay trong Mira, theo Hermes
Desktop: mã thiết bị, lưu và làm mới token, ngắt kết nối, các trạng thái giao diện và chip hạn mức.

## ADDED Requirements

### Requirement: Đăng nhập bằng mã thiết bị

Bấm thẻ ChatGPT/Codex hoặc GitHub Copilot ở mục Tài khoản, hoặc trong onboarding, SHALL bắt đầu đăng nhập
bằng mã thiết bị. Luồng gồm:

1. Mira xin mã thiết bị.
2. Mira hiện mã trong các ô kiểu OTP (bấm để sao chép, chớp accent 1,5 giây khi đã chép) và mở trang xác
   minh trong trình duyệt mặc định.
3. Màn hình có link "Mở lại trang xác minh", dòng "Đang chờ bạn xác nhận…" có spinner, và nút Hủy.
4. Mira hỏi lại theo khoảng thời gian nhà cung cấp cho, cho tới khi được xác nhận, bị từ chối, hết hạn
   (Codex 15 phút, Copilot theo GitHub), hoặc người dùng hủy.

Toàn bộ trao đổi mạng SHALL chạy ở main process. Renderer chỉ nhận mã hiển thị, trạng thái và lỗi.

#### Scenario: Đăng nhập Codex thành công
- **WHEN** người dùng bấm thẻ ChatGPT/Codex, nhập mã ở trang của OpenAI và xác nhận
- **THEN** Mira chuyển sang "Đã kết nối", tạo kết nối Codex, rồi hiện màn chọn model mặc định

#### Scenario: Hủy giữa chừng
- **WHEN** người dùng bấm Hủy khi đang chờ xác nhận
- **THEN** Mira ngừng hỏi lại, không lưu token nào, và quay về danh sách thẻ

#### Scenario: Hết hạn
- **WHEN** quá 15 phút mà người dùng chưa xác nhận mã Codex
- **THEN** màn hình báo mã đã hết hạn, cùng nút "Thử lại"

### Requirement: Lưu và làm mới token

Token SHALL chỉ được lưu đã mã hóa bằng `safeStorage`. Nếu máy không mã hóa được, Mira SHALL từ chối lưu
và báo lý do. Token SHALL không bao giờ được gửi về renderer.

**Codex:**

- Làm mới khi access token còn dưới 120 giây theo `exp` của JWT, và làm mới một lần rồi thử lại khi API
  trả 401.
- Mỗi lần làm mới SHALL ghi lại refresh token mới nếu có.
- Hai lần làm mới cùng lúc cho một tài khoản SHALL không được chạy song song.

**Copilot:** đổi lại token Copilot khi còn dưới 120 giây.

Khi làm mới thất bại vì token không còn hiệu lực (`invalid_grant`, `refresh_token_reused`, 401/403), kết
nối SHALL chuyển sang trạng thái "Cần đăng nhập lại", và lỗi của lượt gọi SHALL có nút mở thẳng thẻ đó.

#### Scenario: Token sắp hết hạn
- **WHEN** một lượt dịch bắt đầu lúc access token Codex còn 60 giây
- **THEN** Mira làm mới token trước khi gọi, và lượt dịch chạy bình thường

#### Scenario: Refresh token đã bị dùng
- **WHEN** làm mới trả `refresh_token_reused`
- **THEN** thẻ Codex ghi "Cần đăng nhập lại", và lượt đang chạy báo lỗi kèm nút "Đăng nhập lại"

### Requirement: Ngắt kết nối

Thẻ đã kết nối SHALL có dấu ✓ "Đã kết nối" và nút ngắt (thùng rác). Ngắt SHALL hỏi xác nhận "Ngắt <tên>?",
rồi xóa token và kết nối tương ứng. Trong lúc ngắt, nút SHALL thành spinner. Model chính hoặc dự phòng trỏ
tới kết nối đó SHALL bị gỡ như khi xóa kết nối.

#### Scenario: Ngắt Copilot
- **WHEN** người dùng ngắt GitHub Copilot và xác nhận
- **THEN** token bị xóa khỏi thư viện, thẻ trở về trạng thái chưa kết nối, và Copilot biến khỏi menu model

### Requirement: Cảnh báo điều khoản và thẻ Claude

Thẻ Codex và Copilot SHALL có một dòng cho biết Mira đăng nhập bằng cách giống công cụ chính hãng, nên nhà
cung cấp có thể đổi hoặc chặn cách này. Thẻ Claude SHALL nói rõ Mira không dùng gói Claude Pro/Max, và dẫn
tới thẻ khóa Anthropic.

#### Scenario: Xem thẻ Claude
- **WHEN** người dùng bấm thẻ Claude ở mục Tài khoản
- **THEN** Mira chuyển sang Khóa API › Anthropic, không mở luồng đăng nhập nào

### Requirement: Trạng thái lỗi của đăng nhập

Khi đăng nhập thất bại, màn hình SHALL hiện:

- "Đăng nhập <tên> chưa xong", kèm lý do bằng lời của Mira;
- phần "Chi tiết" thu gọn chứa thông báo gốc đã che token;
- các nút "Thử lại", "Dùng khóa API" và "Chọn nhà cung cấp khác".

Lỗi mạng tạm thời trong lúc hỏi lại SHALL được thử lại im lặng, tối đa 6 lần liên tiếp, trước khi báo lỗi.

#### Scenario: Mạng chập chờn
- **WHEN** hai lần hỏi lại liên tiếp bị lỗi mạng rồi lần thứ ba thành công
- **THEN** người dùng không thấy lỗi nào và đăng nhập hoàn tất

### Requirement: Chip hạn mức

Với kết nối Codex, menu model và thẻ tài khoản SHALL hiện hạn mức lấy từ nhà cung cấp:

- phần trăm còn lại của cửa sổ "Phiên" và "Tuần", gán theo độ dài cửa sổ;
- mốc đặt lại.

Chip chỉ SHALL hiện khi phần còn lại dưới 20 %, và chuyển màu cảnh báo dưới 10 %. Dữ liệu hạn mức SHALL
được đọc lại không quá một lần mỗi 5 phút.

#### Scenario: Gần hết hạn mức tuần
- **WHEN** hạn mức tuần còn 8 %
- **THEN** nhóm Codex trong menu model có chip cảnh báo "Còn 8 % · đặt lại <thời điểm>"
