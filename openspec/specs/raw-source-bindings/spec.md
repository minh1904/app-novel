# raw-source-bindings Specification

## Purpose
Quy định cách một tác phẩm quản lý nhiều Bản raw, chọn bản chính, ghép chương từ catalog và thay đổi nguồn mà không ghi đè nội dung biên tập.

## Requirements

### Requirement: Nguồn nội dung và Bản raw là hai đối tượng khác nhau

UI SHALL dùng **Nguồn nội dung** cho adapter, website, API, RSS, tệp hoặc thư mục có thể lấy dữ liệu;
SHALL dùng **Bản raw** cho một binding cụ thể đã gắn với tác phẩm. Binding SHALL có ID riêng, không dùng
ngôn ngữ làm định danh.

#### Scenario: Hai raw cùng ngôn ngữ
- **WHEN** một tác phẩm có bản Qidian và bản EPUB đều là `zh-Hans`
- **THEN** Mira hiển thị hai Bản raw riêng và thao tác trên một bản không ảnh hưởng bản kia

### Requirement: Một tác phẩm có bản chính và override theo chương

Một tác phẩm SHALL có tối đa một Bản raw chính mặc định. Người dùng SHALL đặt bản khác làm chính và SHALL
chọn override cho từng chương. Đổi bản chính SHALL hiển thị preview ảnh hưởng và không tự thay
`chapter_text.source` hoặc bản dịch đã có.

#### Scenario: Đổi bản chính
- **WHEN** người dùng chọn một Bản raw đối chiếu làm bản chính
- **THEN** Mira cho biết số chương sẽ dùng mặc định, số chương thiếu và chỉ đổi lựa chọn sau khi xác nhận

### Requirement: Wizard thêm Bản raw giữ được ý định của người dùng

Wizard SHALL hỗ trợ ít nhất nhập tệp và chọn thư mục trong change này; các cách URL/tìm nguồn SHALL chỉ
khả dụng khi adapter tương ứng đã được cài. Trước khi tạo binding, wizard SHALL cho xem metadata, ngôn ngữ,
số mục catalog, số chương ghép được, chưa ghép và không đọc được; SHALL cho chọn nhãn, vai trò và auth
profile nếu nguồn cần tài khoản.

#### Scenario: Thêm thư mục raw
- **WHEN** người dùng chọn thư mục có các tệp chương hợp lệ
- **THEN** Mira hiển thị preview thứ tự và kết quả ghép trước khi tạo Bản raw

### Requirement: Catalog item và chương Mira có quan hệ nhiều nguồn-một chương

Mỗi catalog item SHALL có remote identity trong phạm vi binding và có thể chưa ghép hoặc ghép với một
chương Mira. Nhiều catalog item từ các Bản raw khác nhau SHALL được phép trỏ tới cùng một chương Mira.
Ghép tự động không chắc chắn SHALL yêu cầu người dùng duyệt.

#### Scenario: Hai nguồn ghép cùng chương
- **WHEN** chương 12 có item từ Qidian và item từ EPUB
- **THEN** cả hai item có thể ghép với chương 12 mà không tạo thêm bản dịch thứ hai

### Requirement: Trang Bản raw trình bày độ phủ và trạng thái

Mỗi thẻ Bản raw SHALL hiện nhãn, ngôn ngữ, Nguồn nội dung, nền tảng, vai trò chính/đối chiếu, độ phủ nội
dung, số chương đã ghép, lần kiểm gần nhất, health adapter và trạng thái tài khoản. Menu SHALL có kiểm
tra cập nhật, xem catalog, sửa ghép, đổi bản chính, đổi tài khoản, tạm dừng và gỡ binding.

#### Scenario: Auth profile hết hạn
- **WHEN** profile của một Bản raw chuyển sang `relogin`
- **THEN** thẻ giữ nguyên catalog cũ, hiện cần đăng nhập lại và không đổi health adapter thành hỏng

### Requirement: Gỡ binding không xóa dữ liệu biên tập

Gỡ một Bản raw SHALL xóa hoặc tách metadata nguồn theo xác nhận của người dùng nhưng SHALL không xóa
chapter, `chapter_text`, bản dịch hay revision đã được áp vào tác phẩm.

#### Scenario: Gỡ bản raw chính
- **WHEN** người dùng gỡ Bản raw chính đang có các chương đã dịch
- **THEN** Mira yêu cầu chọn bản chính khác hoặc để trống và giữ nguyên mọi chương cùng bản dịch
