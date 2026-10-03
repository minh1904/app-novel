# content-model Specification

> Cập nhật 2026-10-03 (ADR-005): bảng `provenance` và nguồn gốc theo segment bị gỡ khi bỏ mode Từng câu. Delta này không còn nói về `provenance`; nó nói về chỗ lưu `contextHash` trong **`proposal`** và **`job_item`** của kiến trúc AI-first ([§5.3](../../../../../docs/handbook/engineering/ai-first-architecture.md)). Hai bảng đó **chưa tồn tại**: change này phụ thuộc module đề xuất và module tác vụ dịch (xem `design.md`, D11).

## MODIFIED Requirements

### Requirement: Nguồn gốc bản dịch

Hệ thống SHALL ghi nguồn gốc của mỗi lần AI tạo chữ: do người dùng nhập, do AI tạo (kèm nhà cung cấp, model, thời điểm), do provider giả lập tạo hoặc nhập từ tệp. Nguồn gốc của một lần gọi AI SHALL nằm ở bản ghi của chính lần gọi đó — `proposal` với lần gọi từ chat hoặc từ ngoài, `job_item` với lần gọi của tác vụ dịch. Khi bản dịch được tạo kèm ngữ cảnh, bản ghi đó SHALL ghi thêm **mã băm ngữ cảnh** đã dùng. Nguồn gốc SHALL được giữ khi đóng và mở lại.

#### Scenario: Bản dịch do provider tạo
- **WHEN** một lần gọi AI trả bản dịch cho một đoạn
- **THEN** bản ghi của lần gọi đó ghi loại AI kèm định danh provider/model và thời điểm

#### Scenario: Bản dịch tạo kèm ngữ cảnh
- **WHEN** một lần gọi AI có ngữ cảnh trả bản dịch
- **THEN** bản ghi của lần gọi đó (`proposal` hoặc `job_item`) mang mã băm ngữ cảnh đã dùng, và mã này còn nguyên sau khi mở lại tác phẩm

#### Scenario: Bản dịch tạo không có ngữ cảnh
- **WHEN** một lần gọi AI không kèm ngữ cảnh
- **THEN** bản ghi của lần gọi đó để mã băm là **trống (NULL)**, phân biệt được với ngữ cảnh rỗng (có ba tầng nhưng không có nội dung) vốn có một mã băm thật

## ADDED Requirements

### Requirement: Đổi ngữ cảnh đánh dấu được đoạn chịu ảnh hưởng

Khi ngữ cảnh của tác phẩm đổi, hệ thống SHALL xác định được tập đoạn có bản dịch được tạo bằng một ngữ cảnh khác với ngữ cảnh hiện tại, bằng cách so mã băm đã lưu với mã băm lắp lại từ trạng thái hiện tại. Chỉ đoạn nằm trong **vùng dấu AI** (hoặc trong một đề xuất AI) mới được xét; chữ không còn dấu AI là chữ của người dùng. Việc này SHALL NOT tự dịch lại và SHALL NOT sửa bản dịch; nó chỉ sinh ra đánh dấu.

#### Scenario: Sửa một mục đang được dùng
- **WHEN** người dùng sửa cách dịch của một mục thuật ngữ đang khớp trong năm đoạn đã dịch
- **THEN** đúng năm đoạn đó được đánh dấu là ngữ cảnh đã đổi, và bản dịch của chúng không bị thay đổi

#### Scenario: Sửa một mục không được dùng
- **WHEN** người dùng sửa một mục không xuất hiện trong đoạn nào đã dịch
- **THEN** không đoạn nào bị đánh dấu

#### Scenario: Đoạn do người dùng viết
- **WHEN** ngữ cảnh đổi và một đoạn có bản dịch do người dùng tự nhập, hoặc đã mất dấu AI vì người dùng gõ vào
- **THEN** đoạn đó không bị đánh dấu là ngữ cảnh đã đổi
