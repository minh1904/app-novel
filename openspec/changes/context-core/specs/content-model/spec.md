# content-model Specification

## MODIFIED Requirements

### Requirement: Nguồn gốc bản dịch

Hệ thống SHALL ghi nguồn gốc của bản dịch theo segment: do người dùng nhập, do AI tạo (kèm nhà cung cấp, model, thời điểm), do provider giả lập tạo hoặc nhập từ tệp. Khi bản dịch được tạo kèm ngữ cảnh, nguồn gốc SHALL ghi thêm **mã băm ngữ cảnh** đã dùng. Nguồn gốc SHALL được giữ khi đóng và mở lại.

#### Scenario: Bản dịch do provider tạo
- **WHEN** một segment nhận bản dịch từ provider
- **THEN** nguồn gốc ghi loại AI kèm định danh provider/model và thời điểm

#### Scenario: Bản dịch tạo kèm ngữ cảnh
- **WHEN** một segment nhận bản dịch từ một yêu cầu có ngữ cảnh
- **THEN** nguồn gốc của segment đó mang mã băm ngữ cảnh đã dùng, và mã này còn nguyên sau khi mở lại tác phẩm

#### Scenario: Bản dịch tạo không có ngữ cảnh
- **WHEN** một segment nhận bản dịch từ một yêu cầu không có ngữ cảnh
- **THEN** nguồn gốc ghi rõ là không có ngữ cảnh, không để trống gây nhầm với ngữ cảnh rỗng

## ADDED Requirements

### Requirement: Đổi ngữ cảnh đánh dấu được segment chịu ảnh hưởng

Khi ngữ cảnh của tác phẩm đổi, hệ thống SHALL xác định được tập segment có bản dịch được tạo bằng một ngữ cảnh khác với ngữ cảnh hiện tại, bằng cách so mã băm đã lưu với mã băm lắp lại từ trạng thái hiện tại. Việc này SHALL NOT tự dịch lại và SHALL NOT sửa bản dịch; nó chỉ sinh ra đánh dấu.

#### Scenario: Sửa một mục đang được dùng
- **WHEN** người dùng sửa cách dịch của một mục thuật ngữ đang khớp trong năm segment đã dịch
- **THEN** đúng năm segment đó được đánh dấu là ngữ cảnh đã đổi, và bản dịch của chúng không bị thay đổi

#### Scenario: Sửa một mục không được dùng
- **WHEN** người dùng sửa một mục không xuất hiện trong segment nào đã dịch
- **THEN** không segment nào bị đánh dấu

#### Scenario: Segment do người dùng viết
- **WHEN** ngữ cảnh đổi và một segment có bản dịch do người dùng tự nhập
- **THEN** segment đó không bị đánh dấu là ngữ cảnh đã đổi
