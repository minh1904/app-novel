# agent-runtime-integration Specification

## Purpose
Đảm bảo đường runtime agent hiện có thực thi thật từ renderer tới storage, phản ánh đúng lỗi, hủy và usage, đồng thời bảo vệ mọi thay đổi bằng revision, journal và Undo.

## Requirements

### Requirement: Gửi turn được chấp nhận bền và chỉ một lần
Main SHALL lưu session/turn trước khi bắt đầu provider hoặc capability, rồi trả `sessionId`, `turnId` và `requestId`. Mỗi yêu cầu SHALL nhận `clientCommandId`; gửi lại cùng ID và cùng payload SHALL trả cùng turn đang có, còn cùng ID với payload khác SHALL trả conflict. Một session SHALL chỉ có tối đa một turn ở `queued`, `running` hoặc `waiting_user`. Khi session có turn `waiting_user` và nhận command mới không mang `continuesTurnId`, Main SHALL chuyển turn đang chờ sang `expired` và lưu turn mới trong cùng một transaction.

#### Scenario: Gửi lần đầu
- **WHEN** renderer gửi instruction hợp lệ với clientCommandId mới
- **THEN** turn queued được commit trước khi chạy và runtime dùng chính turn đó, không tạo turn thứ hai

#### Scenario: Mất response rồi gửi lại
- **WHEN** IPC response bị mất và renderer gửi lại cùng clientCommandId/payload
- **THEN** Main trả các ID cũ và không chạy thêm một operation

#### Scenario: Session đang bận
- **WHEN** session đã có turn queued hoặc running và nhận command mới
- **THEN** command mới không được lưu thành active turn, trả `session_busy` và draft phía renderer được giữ

#### Scenario: Lệnh mới khi turn đang chờ người dùng
- **WHEN** session có turn `waiting_user` và người dùng gửi một yêu cầu mới không phải câu trả lời cho turn đó
- **THEN** Main chuyển turn đang chờ sang `expired`, đánh dấu pending action của nó hết hạn và lưu turn mới trong cùng transaction

### Requirement: Một runtime có lifecycle do Main sở hữu
AgentService SHALL được compose một lần cùng các service ứng dụng, dùng cùng registry, resolver, library và provider connection. IPC SHALL gọi instance này; không tạo repository/service tạm cho mỗi handler. Vòng đời turn SHALL thuộc Main: đóng hoặc reload cửa sổ đã gửi lệnh SHALL không hủy turn; chỉ lệnh Stop tường minh hoặc thoát app được kết thúc turn đang chạy. Khi app đóng, runtime SHALL abort request, giải phóng lease và ghi turn/operation còn chạy thành interrupted theo bằng chứng commit.

#### Scenario: IPC gọi runtime thật
- **WHEN** user gửi lệnh dịch một chương từ UI
- **THEN** cùng request đi qua AgentService và capability dịch, tạo journal batch và thay đổi nội dung thật

#### Scenario: Thoát app khi đang chờ provider
- **WHEN** Electron bắt đầu đóng trong lúc request chưa trả
- **THEN** request bị abort, không có commit sau shutdown và trạng thái bền không phải completed

#### Scenario: Đóng cửa sổ đã gửi lệnh
- **WHEN** cửa sổ gửi lệnh bị đóng hoặc reload trong lúc turn đang chạy
- **THEN** turn tiếp tục chạy trong Main, kết quả được lưu và cửa sổ khác hoặc cửa sổ mở lại thấy trạng thái cuối từ snapshot

### Requirement: Stream có thứ tự và đúng một kết thúc
Mọi event SHALL có requestId, turnId và eventSeq tăng đơn điệu. Main SHALL lưu state/result/error trước khi phát terminal event. Một request SHALL phát đúng một trong `done`, `error` hoặc `cancelled`; event sau terminal bị bỏ. Capability `ok: false`, exception hoặc persistence failure SHALL không được chuyển thành câu thành công.

#### Scenario: Capability trả lỗi có cấu trúc
- **WHEN** capability trả `{ok:false,error}`
- **THEN** activity/turn/operation lưu failed với lỗi đã phân loại và stream kết thúc bằng error

#### Scenario: Lưu terminal thất bại
- **WHEN** Main không thể commit terminal state
- **THEN** runtime không phát done và dừng với persistence error có thể chẩn đoán

### Requirement: Cancel chặn commit mới
Cancel SHALL abort controller của turn đang chạy, truyền AbortSignal tới capability, runner và provider hỗ trợ signal. Coordinator SHALL serialize cancel với batch commit: transaction đã bắt đầu có thể hoàn tất trước khi cancel được chấp nhận; sau thời điểm chấp nhận không batch mới nào được commit. Batch đã commit được giữ và có thể Undo.

#### Scenario: Kết quả provider trả sau cancel
- **WHEN** cancel đã được chấp nhận rồi provider trả kết quả
- **THEN** kết quả bị bỏ, target revision không đổi và turn/operation không thành completed

#### Scenario: Cancel giữa hai batch
- **WHEN** batch 1 đã commit và cancel đến trước batch 2
- **THEN** batch 1 còn nguyên, batch 2 không commit, operation ghi đúng progress và trạng thái cancelled/partial

### Requirement: Ghi chỉ sau flush và kiểm revision
Trước operation ghi, Main SHALL yêu cầu mọi editor liên quan flush và xác nhận. Timeout hoặc `flush-failed` SHALL fail closed. `not-open` chỉ hợp lệ khi Main xác nhận không có editor target. Capability SHALL lấy lease ngắn, kiểm source/target revision trước mỗi batch và commit nội dung, journal, checkpoint trong một transaction work DB.

#### Scenario: Editor lưu thất bại
- **WHEN** editor có dirty state và flush trả lỗi
- **THEN** operation không chạy, dirty state còn nguyên và lỗi hướng dẫn người dùng xử lý

#### Scenario: Target đổi khi model đang suy luận
- **WHEN** target revision đổi sau request model nhưng trước commit
- **THEN** batch bị conflict và không ghi đè nội dung mới

### Requirement: Undo khôi phục dữ liệu thật
Undo IPC SHALL gọi storage/domain service để phục hồi checkpoint và tạo revision mới. Undo chỉ khả dụng cho operation có thay đổi đã commit và SHALL kiểm revision hiện tại bằng revision cuối operation ghi. UI chỉ chuyển `undone` sau response thành công; conflict giữ nguyên bản sửa người dùng.

#### Scenario: Undo hợp lệ
- **WHEN** operation đã commit và target chưa đổi
- **THEN** nội dung trước operation được phục hồi trong transaction, response trả revision mới thực

#### Scenario: Undo sau sửa tay
- **WHEN** target đã được người dùng sửa sau operation
- **THEN** Undo trả revision conflict, không đổi nội dung và operation không bị đánh dấu undone

### Requirement: Model settings và usage không bị mất
Connection, model, settingsKey SHALL được chốt trên turn/operation và truyền tới translator. Usage SHALL chỉ lấy từ provider; thiếu hoặc incomplete SHALL giữ trạng thái không đầy đủ. Chi phí SHALL là null khi thiếu giá hoặc usage và nếu hiển thị phải có nhãn ước tính.

#### Scenario: Settings tùy chỉnh
- **WHEN** người dùng chọn model entry có settingsKey riêng
- **THEN** request dịch dùng đúng settings đó và operation lưu model reference tương ứng

#### Scenario: Provider không báo usage
- **WHEN** request đã chạy nhưng provider không trả usage
- **THEN** UI hiện chưa đủ dữ liệu, không hiện 0 token hoặc $0 như số thực

### Requirement: Startup reconcile dựa trên journal
Khi mở app, Mira SHALL đối chiếu operation queued/running với work journal. Batch đã commit SHALL được phản ánh vào library DB; operation không có bằng chứng commit SHALL thành interrupted. Reconcile SHALL idempotent và không tự gọi provider hoặc tự lặp side effect.

#### Scenario: Crash sau work commit
- **WHEN** app crash sau commit work DB nhưng trước update library DB
- **THEN** startup nhận batch từ journal, cập nhật progress/result một lần và không dịch lại batch
