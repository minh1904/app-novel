## Purpose

Quy định model chính và chuỗi model dự phòng cho cả app: nơi chọn, nơi được dùng, và cách Mira chuyển
sang dự phòng khi model đang dùng thất bại.

## ADDED Requirements

### Requirement: Model chính

Mục Model › Model chính SHALL có:

- chọn kết nối;
- chọn mục model của kết nối đó;
- mức suy luận, chỉ các mức model hỗ trợ;
- nút Áp dụng.

Áp dụng SHALL lưu lựa chọn vào thư viện và báo "Đã đổi model chính".

Nếu kết nối được chọn chưa có khóa dùng được, mục SHALL hiện ô dán khóa và nút Kích hoạt ngay tại chỗ.

Chat mới, hộp thoại dịch và hàng chờ dịch SHALL dùng model chính khi người dùng chưa chọn model khác cho
lần đó.

#### Scenario: Đổi model chính
- **WHEN** người dùng chọn OpenRouter › `deepseek/deepseek-v4`, mức Cao, rồi bấm Áp dụng
- **THEN** mở chat mới thì pill model ghi model đó với nhãn mức Cao

#### Scenario: Chưa có model chính
- **WHEN** thư viện có kết nối nhưng chưa đặt model chính
- **THEN** Mira lấy mục mặc định của kết nối đầu tiên còn bật, như cách chọn hiện nay

### Requirement: Chuỗi model dự phòng

Mục Model › Dự phòng SHALL là một danh sách có thứ tự gồm kết nối, mục model và nút xóa, cùng nút "+ Thêm
dự phòng". Khi danh sách trống, mục SHALL ghi "Chưa có model dự phòng; khi model chính lỗi, Mira dừng và
báo lỗi". Danh sách SHALL tự lưu.

#### Scenario: Thêm hai dự phòng
- **WHEN** người dùng thêm Gemini 2.5 Flash rồi DeepSeek
- **THEN** danh sách có hai dòng đánh số 1 và 2, và vẫn còn sau khi mở lại app

### Requirement: Chuyển sang dự phòng

Khi một lượt chat hoặc một lô dịch thất bại sau khi đã thử lại theo chính sách hiện có, Mira SHALL thử lần
lượt từng mục của chuỗi dự phòng, nhưng chỉ với các lý do lỗi mà đổi model có thể giải quyết:

- hết hạn mức của mọi khóa;
- model không tồn tại hoặc không được phép;
- lỗi máy chủ kéo dài;
- quá thời gian.

Lỗi do nội dung bị chặn, request không hợp lệ hoặc người dùng hủy SHALL NOT chuyển dự phòng. Mục dự phòng
trùng model vừa lỗi, hoặc không có khóa dùng được, SHALL bị bỏ qua.

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
