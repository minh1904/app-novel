## MODIFIED Requirements

### Requirement: Chuyển sang dự phòng

Khi một lượt chat hoặc một lô dịch thất bại sau khi đã thử lại theo chính sách hiện có, Mira SHALL thử lần
lượt từng mục của chuỗi dự phòng, nhưng chỉ với các lý do lỗi mà đổi model có thể giải quyết:

- hết hạn mức của mọi khóa;
- model không tồn tại hoặc không được phép;
- lỗi máy chủ kéo dài;
- quá thời gian.

Lỗi do nội dung bị chặn, request không hợp lệ hoặc người dùng hủy SHALL NOT chuyển dự phòng. Mục dự phòng
trùng model vừa lỗi, hoặc không có khóa dùng được, SHALL bị bỏ qua.

Khi model vừa lỗi thuộc một kết nối tài khoản thuê bao (đăng nhập OAuth) hoặc một gateway được nhận là
CLIProxyAPI, Mira SHALL NOT tự chuyển dự phòng với bất kỳ lý do nào. Lượt SHALL dừng với lỗi đó, kèm mốc
đặt lại khi biết, và SHALL có nút "Thử bằng Y" để người dùng tự chọn.

Mỗi lần chuyển SHALL được ghi trên lượt chat hoặc lô dịch bằng dòng "Đã chuyển sang Y vì X không dùng được
(lý do)". Model của lượt hoặc lô đó SHALL ghi model thực sự đã trả lời.

#### Scenario: Hết hạn mức
- **WHEN** model chính trả lỗi hết hạn mức trên mọi khóa và dự phòng 1 có khóa dùng được
- **THEN** lượt chạy lại bằng dự phòng 1, và hiện dòng "Đã chuyển sang Gemini 2.5 Flash vì DeepSeek V4
  hết hạn mức"

#### Scenario: Nội dung bị chặn
- **WHEN** model chính từ chối vì bộ lọc an toàn
- **THEN** Mira không chuyển dự phòng và báo lỗi như hiện nay

#### Scenario: Hết chuỗi
- **WHEN** mọi mục dự phòng đều lỗi
- **THEN** lượt dừng với lỗi của lần thử cuối, kèm danh sách các model đã thử

#### Scenario: Tài khoản thuê bao hết hạn mức
- **WHEN** model chính thuộc kết nối Codex đã đăng nhập, trả lỗi hết hạn mức, và dự phòng 1 là một model
  khóa API
- **THEN** lượt dừng với lỗi hết hạn mức kèm mốc đặt lại, không gọi dự phòng 1, và có nút "Thử bằng <dự
  phòng 1>"
