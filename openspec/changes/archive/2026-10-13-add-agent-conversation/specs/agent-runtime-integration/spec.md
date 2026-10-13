## MODIFIED Requirements

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
