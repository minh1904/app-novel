## Purpose

Cho agent CLI bên ngoài nhận một batch dịch và nộp kết quả về Mira qua MCP local, trong khi Mira giữ quyền truy cập, task state, revision validation, commit, audit và Undo.

## ADDED Requirements

### Requirement: MCP là adapter mỏng tới runtime Mira
MCP server SHALL chạy qua stdio cho client local và chuyển tool call vào broker/runtime Mira; không mở library/work DB trực tiếp và không export SQL, shell hoặc đường dẫn file tùy ý. Mira chưa chạy SHALL trả `app_unavailable`. Business result/error SHALL giống caller nội bộ cho cùng capability.

#### Scenario: App chưa mở
- **WHEN** client gọi tool trong khi broker Mira không khả dụng
- **THEN** MCP trả lỗi rõ, không tạo writer riêng hoặc sửa file DB

#### Scenario: Tool ghi
- **WHEN** client gọi submit hợp lệ
- **THEN** request đi qua task/coordinator/journal/Undo hiện có, không có code path commit riêng trong adapter

### Requirement: Pairing và grant ràng buộc danh tính client
External access SHALL mặc định tắt. Người dùng SHALL pair client trong Mira và cấp read hoặc read-write theo work scope; credential lưu bằng secret mechanism hiện có. Broker SHALL gắn actor/client/grant từ connection, không tin field do tool arguments tự khai. Mỗi call SHALL kiểm grant hiện tại; revoke fail closed cho call chưa commit.

#### Scenario: Client read-only submit
- **WHEN** client có grant read gọi submit
- **THEN** request bị permission_denied trước flush/lease/commit

#### Scenario: ID ngoài phạm vi
- **WHEN** client scoped work A gửi chapter ID của work B
- **THEN** không trả dữ liệu hoặc tiết lộ work B tồn tại

### Requirement: Tool surface dùng object nghiệp vụ và phân trang
MVP SHALL cung cấp tool đọc work/chapter/context theo cursor/limit; tạo/đọc/hủy task external; lấy item tiếp theo; submit batch; report error; undo operation và open target khi client hỗ trợ. Payload SHALL có giới hạn kích thước và không trả cả dải chương một lần. Tool names/schema/version được công bố và validate trước domain call.

#### Scenario: Chapter dài
- **WHEN** source vượt batch limit
- **THEN** get-next trả segment manifest/batch hữu hạn cùng cursor/claim, không cắt im lặng

### Requirement: Claim giao đúng một batch cho một attempt
`get_next_translation_item` SHALL yêu cầu taskId và requestKey, rồi trả item/batch ID, opaque claim token, expiry, attempt, source/target revision, exact segment manifest/source, approved Context snapshot và instruction version. Một task MVP có tối đa một claim sống. Gọi lại cùng requestKey khi claim còn sống SHALL trả cùng claim; claim không phải write lease editor.

#### Scenario: Request get-next bị retry
- **WHEN** response bị mất và client gọi lại cùng requestKey
- **THEN** Mira trả cùng batch/claim, không tiến sang batch tiếp theo

#### Scenario: Claim hết hạn
- **WHEN** TTL hết trước submit
- **THEN** claim cũ không cấp quyền ghi; attempt mới có token mới và audit liên kết attempt cũ

### Requirement: Submit kiểm toàn bộ precondition và commit nguyên tử
Submit SHALL kiểm authenticated client/grant, task state, claim/attempt, item/batch manifest, source/target revision, Context/instruction version, payload schema/size và mỗi segment đúng một lần. Sau đó SHALL chạy flush/write coordinator và commit target+journal+checkpoint nguyên tử. Validation failure không được commit một phần payload.

#### Scenario: Người dùng sửa target khi client dịch
- **WHEN** target revision đổi sau lúc giao claim
- **THEN** submit trả revision_conflict và giữ bản sửa người dùng

#### Scenario: Payload thiếu/thừa
- **WHEN** submit không khớp exact manifest
- **THEN** toàn batch bị từ chối với segment IDs cụ thể

### Requirement: Submit idempotent qua timeout và retry
Mỗi submit SHALL có idempotencyKey ràng buộc task/item/batch/client/attempt và payload digest. Nếu journal đã commit cùng key/digest, Mira SHALL trả kết quả cũ sau kiểm danh tính mà không tăng revision/usage. Cùng key khác digest SHALL trả idempotency_conflict. Kiểm committed result SHALL diễn ra trước reject claim đã kết thúc để retry sau timeout vẫn đọc được kết quả.

#### Scenario: Timeout sau commit
- **WHEN** client không nhận response rồi gửi lại cùng key/payload
- **THEN** operationId/revision/progress cũ được trả, không có commit thứ hai

#### Scenario: Mutate payload khi retry
- **WHEN** client dùng key cũ với output khác
- **THEN** request bị conflict và cả hai payload không bị trộn

### Requirement: Pause, cancel, expiry và revoke vô hiệu work chưa commit
Task pause/cancel hoặc grant revoke SHALL vô hiệu claim chưa commit và chặn claim mới. Submit đến sau đó SHALL không ghi. Disconnect chỉ làm task chờ client/claim expiry; không tự completed, không tự fallback sang Mira provider. Batch đã commit trước cancel/revoke vẫn giữ và Undo theo luật chung.

#### Scenario: Client cũ trả sau khi claim được cấp lại
- **WHEN** attempt mới đã nhận claim và client cũ submit
- **THEN** submit cũ bị stale_claim, không ảnh hưởng attempt mới

### Requirement: Inference source, usage và lịch sử được mô tả trung thực
Task SHALL ghi `external_agent`, client identity và attempt provenance. Mira SHALL không gọi provider nội bộ cho phần sinh bản dịch external hoặc deterministic QA. Usage/quota phía client chỉ lưu khi client cung cấp bằng chứng theo schema; thiếu dữ liệu hiện unknown. Mira lưu tool activity/task/operation, không dựng transcript của Gemini/Codex nếu không sở hữu hội thoại.

#### Scenario: API key Mira hết quota
- **WHEN** external client còn hoạt động và submit hợp lệ
- **THEN** Mira vẫn lưu được mà không gọi translation provider nội bộ; UI ghi nguồn external và usage client unknown nếu không được báo

### Requirement: Log và transport không làm lộ nội dung
Stdio SHALL dành stdout cho protocol và chuyển diagnostic sang stderr/log đã lọc. Log mặc định chỉ giữ ID, client, state, size, timing và error code; không ghi source/translation/claim token/credential. Shutdown SHALL đóng connection và để task ở trạng thái có thể chẩn đoán, không mất journal.

#### Scenario: Lỗi validation chứa nội dung dài
- **WHEN** payload không hợp lệ
- **THEN** log ghi code/size/IDs đã lọc và response chỉ trả chi tiết cần sửa, không dump cả chương hoặc secret
