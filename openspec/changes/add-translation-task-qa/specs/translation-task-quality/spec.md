## Purpose

Kiểm tra tính đầy đủ, revision và nhất quán của kết quả task dịch bằng rule có bằng chứng; phân biệt blocker với cảnh báo và không tự nhận định tuyệt đối về chất lượng văn học.

## ADDED Requirements

### Requirement: Structural validation chặn commit sai manifest
Trước commit, mỗi batch SHALL đối chiếu đúng item/attempt, source revision, instruction/context version và segment manifest. Mỗi segment bắt buộc xuất hiện đúng một lần; ID lạ, thiếu, trùng hoặc output vượt giới hạn SHALL làm batch không commit. Validation error SHALL chỉ rõ segment và khả năng retry.

#### Scenario: Thiếu một segment
- **WHEN** provider trả 9 trên 10 segment
- **THEN** batch không commit và item ghi blocker `missing_segment` với ID thiếu

#### Scenario: Segment trùng
- **WHEN** cùng segment ID xuất hiện hai lần
- **THEN** batch không chọn ngẫu nhiên một bản; nó trả blocker deterministic

### Requirement: Gate completion dựa trên dữ liệu đã commit
Item completed SHALL yêu cầu mọi source segment thuộc scope có target commit ở revision hợp lệ và không còn blocker bắt buộc. Task completed SHALL yêu cầu mọi item bắt buộc completed; failed/skipped/waiting_review tạo trạng thái khác. Số request thành công không phải bằng chứng completion.

#### Scenario: Provider thành công nhưng commit conflict
- **WHEN** provider trả đủ output nhưng target revision conflict
- **THEN** item không completed và task không tăng completed count

### Requirement: Kiểm nhất quán tạo finding có bằng chứng
Sau dịch, Mira SHALL có thể kiểm glossary approved, tên riêng, addressing rule và dấu hiệu thiếu/thừa nội dung bằng rule xác định được. Mỗi finding SHALL có rule code, severity, work/chapter/segment target, evidence, expected/observed và version dữ liệu dùng để kiểm. Cùng rule/target/version SHALL upsert, không nhân bản sau retry.

#### Scenario: Glossary không nhất quán
- **WHEN** target dùng biến thể khác entry approved effective
- **THEN** finding trỏ đúng segment, nêu expected/observed và snapshot Context liên quan

#### Scenario: Không đủ dữ liệu để kết luận xưng hô
- **WHEN** addressing rule không đủ ngữ cảnh chắc chắn
- **THEN** finding là warning cần review, không phải blocker tự động

### Requirement: Findings có lifecycle review riêng
Finding SHALL có `open`, `accepted`, `dismissed`, `resolved` và audit actor/time/reason. Dismiss không sửa nội dung; resolve chỉ sau khi revision mới không còn vi phạm hoặc người dùng xác nhận cách xử lý. Re-run trên revision mới SHALL đánh dấu finding cũ stale/resolved phù hợp thay vì sửa evidence lịch sử.

#### Scenario: Người dùng dismiss false positive
- **WHEN** người dùng dismiss warning với lý do
- **THEN** bản dịch không đổi, finding giữ audit và không xuất hiện như blocker chưa xử lý

### Requirement: QA không tự sửa hoặc hứa chất lượng văn học
QA SHALL không auto-polish hoặc sửa target nếu người dùng chưa tạo operation ghi riêng. Các check về văn phong, tự nhiên, sắc thái chỉ được ghi là heuristic/review suggestion với model/rule provenance; UI SHALL không dùng nhãn “đúng hoàn toàn” hoặc điểm chất lượng tuyệt đối từ các check này.

#### Scenario: Model chê câu chưa tự nhiên
- **WHEN** optional model review trả nhận xét văn phong
- **THEN** Mira tạo suggestion có provenance/usage riêng và không thay target

### Requirement: Tiến độ QA tách khỏi tiến độ dịch
Task detail SHALL hiển thị translation progress, required QA progress và optional review riêng. Required QA lỗi có thể làm item failed/needs_attention; optional warning không hạ completed translation nhưng task summary phải nêu số finding mở. Retry QA SHALL không gọi lại dịch.

#### Scenario: Dịch xong, QA còn chạy
- **WHEN** mọi chapter đã commit nhưng required QA chưa hoàn tất
- **THEN** task chưa báo hoàn tất toàn bộ và UI hiển thị phase kiểm tra

### Requirement: QA dùng budget và snapshot riêng
Deterministic checks SHALL không gọi model. Optional model QA SHALL là request có inference source, budget, usage và snapshot riêng, không tự dùng provider trả phí khi task external. Nếu input revision đổi trong lúc QA, kết quả SHALL stale và không gắn vào revision mới.

#### Scenario: External translation task
- **WHEN** task dùng external agent và chỉ bật deterministic QA
- **THEN** Mira không gọi provider API nội bộ
