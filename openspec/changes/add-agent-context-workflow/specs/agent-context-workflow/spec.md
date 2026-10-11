## Purpose

Chuẩn bị Context cho task dịch bằng extraction có bằng chứng, review của người dùng và snapshot tái hiện được; chỉ dữ liệu đã duyệt, đúng phạm vi mới đi vào model.

## ADDED Requirements

### Requirement: Preflight chọn chiến lược Context rõ ràng
Trước khi task dịch cần Context, Mira SHALL cho người dùng chọn dùng Context đã duyệt hiện có, chạy extraction rồi review, hoặc tiếp tục không extraction. Lựa chọn SHALL được lưu trên task. Mira SHALL không tự chạy extraction tốn inference hoặc tự chấp nhận candidate chỉ vì task dịch đã được cấp quyền.

#### Scenario: Dùng Context hiện có
- **WHEN** người dùng chọn dịch bằng Context đã duyệt hiện tại
- **THEN** task chụp effective Context mà không tạo extraction run mới

#### Scenario: Yêu cầu extraction
- **WHEN** người dùng chọn trích thuật ngữ trước dịch
- **THEN** task tạo bước extraction riêng và chưa giao item dịch cho tới khi review được giải quyết

### Requirement: Candidate có nguồn và bằng chứng
Extraction SHALL tạo candidate `pending` với loại, source form, đề xuất, chapter/segment evidence, model/run identity và phạm vi đề xuất. Candidate giống entry hiện có SHALL được đối chiếu thay vì tạo bản sao mù. Lỗi extraction SHALL không thay đổi entry approved.

#### Scenario: Thuật ngữ mới
- **WHEN** model đề xuất một thuật ngữ từ chapter 3
- **THEN** pending entry giữ đoạn bằng chứng và liên kết extraction run để người dùng kiểm tra

#### Scenario: Trùng entry approved
- **WHEN** candidate có cùng source form/phạm vi với entry approved
- **THEN** UI nêu entry hiện có và khác biệt đề xuất, không tự tạo quy tắc cạnh tranh

### Requirement: Review là hàng rào trước prompt
Người dùng SHALL approve, edit-and-approve hoặc reject candidate. Chỉ entry approved và effective ở item SHALL được đưa vào snapshot. Pending/rejected SHALL không đi vào prompt. Bulk approve SHALL hiển thị số lượng/phạm vi và áp dụng cùng validation như từng mục.

#### Scenario: Review một phần
- **WHEN** có 12 candidate, 8 approved, 2 rejected và 2 còn pending
- **THEN** snapshot dịch chỉ có 8 entry mới approved cùng Context approved trước đó

#### Scenario: Sửa trước duyệt
- **WHEN** người dùng đổi bản dịch đề xuất rồi approve
- **THEN** snapshot dùng giá trị đã sửa và audit giữ candidate gốc + quyết định cuối

### Requirement: Effective Context đúng chương và loại nội dung
Resolver Context SHALL áp dụng scope toàn truyện/chapter range/character relation và trạng thái theo luật Context hiện hành. Quy tắc lời thoại/lời kể SHALL giữ điều kiện sử dụng, không hạ thành replace-all. Kết quả SHALL có lý do vì sao mỗi entry effective hoặc bị loại khi cần chẩn đoán.

#### Scenario: Entry ngoài phạm vi
- **WHEN** glossary chỉ áp dụng chương 1–10 và item là chương 11
- **THEN** entry không có trong snapshot chương 11

#### Scenario: Bố trong lời thoại, ông trong lời kể
- **WHEN** quy tắc phân biệt speech/narration được duyệt
- **THEN** prompt giữ chỉ dẫn điều kiện, không tạo phép thay toàn bộ một từ thành một giá trị

### Requirement: Snapshot tái hiện được input đã gửi
Mỗi translation item/attempt SHALL tham chiếu snapshot bất biến chứa nội dung normalized thực đã gửi hoặc phiên bản immutable có thể đọc lại, cùng entry IDs/revisions, instruction version và createdAt. Sửa/xóa Context sau đó SHALL không đổi snapshot cũ. Pending state không được “sống lại” qua tham chiếu mutable.

#### Scenario: Glossary đổi sau khi dịch
- **WHEN** người dùng sửa entry sau khi item hoàn tất
- **THEN** chi tiết run vẫn hiển thị giá trị cũ đã dùng và run mới dùng revision mới

### Requirement: Task chờ review không giữ tài nguyên ghi
Task waiting_review SHALL không giữ write lease, provider request hoặc editor lock. Người dùng có thể review từ activity hoặc màn Context; Continue SHALL kiểm lại task/revision và tạo snapshot trước item tiếp theo. Cancel khi chờ review SHALL không tự xóa candidate.

#### Scenario: Đóng app khi chờ review
- **WHEN** app đóng và mở lại
- **THEN** task vẫn waiting_review, candidate còn nguyên và chưa có item dịch chạy ngầm

### Requirement: Side panel Ngữ cảnh dùng chung nguồn dữ liệu
Trong màn chương, side panel SHALL có `Trợ lý | Ngữ cảnh`; tab Ngữ cảnh mặc định `Đang áp dụng`, có `Tất cả` và `Chờ duyệt`, tìm kiếm và sửa/duyệt nhanh. Nó SHALL đọc/ghi qua module Context hiện có; màn Context đầy đủ tiếp tục xử lý import, lọc nâng cao và bulk. Chuyển tab giữ draft chat, filter, selection và scroll hợp lý.

#### Scenario: Mở review từ activity
- **WHEN** activity báo 12 mục cần duyệt và người dùng chọn Xem và duyệt
- **THEN** panel mở tab Ngữ cảnh, filter pending của đúng work/run và focus heading phù hợp

#### Scenario: Chỉnh cùng một entry ở hai bề mặt
- **WHEN** entry được approve trong side panel
- **THEN** màn quản lý đầy đủ và task đọc cùng trạng thái, không có bản sao trong agent store
