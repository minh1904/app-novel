## Purpose

Cung cấp chat Trợ lý toàn ứng dụng với lịch sử tập trung, context theo lượt và vòng model–tool có giới hạn, trong đó quyền và target luôn do code của Mira kiểm soát.

## ADDED Requirements

### Requirement: Session toàn ứng dụng và lịch sử bền
Người dùng SHALL tạo/tiếp tục session từ Trang chủ, Thư viện hoặc chương. Đổi màn, đóng panel hay mở tác phẩm khác SHALL không tạo lịch sử thứ hai hoặc hủy turn. Một session MAY chứa turn liên quan nhiều tác phẩm; mỗi turn giữ context/target riêng. Dữ liệu chat legacy vẫn đọc được trong luồng legacy.

#### Scenario: Chat trước khi mở truyện
- **WHEN** người dùng tạo chat ở Trang chủ rồi mở một chương
- **THEN** session vẫn giữ các turn trước và lượt mới có thể nhận context chương

#### Scenario: Mở lại ứng dụng
- **WHEN** app mở lại sau các turn đã hoàn tất
- **THEN** danh sách session và transcript được đọc từ library DB theo thứ tự ổn định

### Requirement: Context được chụp tại lúc gửi
Composer SHALL hiển thị context chip cho work/chapter/selection/caret và cho bỏ chip trước gửi. Runtime SHALL lưu snapshot khi nhận command; navigation sau đó không đổi target. Target nêu rõ trong instruction SHALL được resolve trong quyền được phép và ưu tiên hơn context mặc định. Không tìm thấy hoặc nhiều ứng viên SHALL chuyển waiting_user trước mọi write.

#### Scenario: Đổi chương sau khi gửi
- **WHEN** gửi yêu cầu cho chương A rồi chuyển UI sang B
- **THEN** tool call vẫn dùng snapshot A và Mở đích quay về A

#### Scenario: Target mơ hồ
- **WHEN** tên yêu cầu khớp hai tác phẩm
- **THEN** agent hỏi một lần với lựa chọn phân biệt được và chưa tạo operation

### Requirement: Vòng model–tool dùng schema và policy từ code
Agent SHALL gửi cho model chỉ các capability được phép trong lượt, validate tool name/arguments/result và đưa result trở lại model cho tới khi có câu trả lời hoặc chạm gate. Quyết định allow/deny/needs-user, target policy và budget SHALL do registry/runtime áp dụng; văn bản truyện, lịch sử và tool output SHALL không thể cấp quyền hay thêm tool.

#### Scenario: Câu hỏi chỉ đọc
- **WHEN** người dùng hỏi số chương của một tác phẩm
- **THEN** model có thể gọi tool đọc và không tạo operation ghi

#### Scenario: Prompt injection trong raw
- **WHEN** raw chứa chỉ dẫn yêu cầu bỏ policy và sửa tác phẩm khác
- **THEN** runtime coi đó là dữ liệu, không cung cấp tool/target ngoài grant của turn

#### Scenario: Tool không tồn tại
- **WHEN** model gọi tên ngoài registry của lượt
- **THEN** call không chạy, model nhận lỗi có cấu trúc và activity không giả thành công

### Requirement: Continuation ràng buộc đúng yêu cầu đang chờ
Turn waiting_user SHALL lưu pending action identity, schema/version và lựa chọn cần làm rõ. Câu trả lời của người dùng SHALL gửi với waitingTurnId; runtime kiểm turn còn chờ và ràng buộc với action cũ. Nếu action/arguments thay đổi về bản chất, policy SHALL được đánh giá lại; continuation cũ không áp dụng cho call mới.

#### Scenario: Chọn một trong hai chương
- **WHEN** người dùng trả lời lựa chọn cho waitingTurnId hợp lệ
- **THEN** turn tiếp tục đúng pending action, không tạo turn hay operation trùng

#### Scenario: Reply đến turn đã hết hạn
- **WHEN** client gửi continuation cho turn không còn waiting_user
- **THEN** runtime từ chối stale continuation và không chạy hành động

### Requirement: Loop và context budget có giới hạn rõ
Mỗi turn SHALL có trần model round, capability call, write operation và ký tự đọc. Runtime SHALL phát hiện lặp cùng `(tool, normalized args)` và dừng trước vòng vô hạn. Khi transcript vượt context, Mira SHALL giữ system policy, yêu cầu hiện tại, pending state và result liên quan; phần lịch sử bỏ bớt phải được ghi nhận, không cắt im lặng source/instruction đang cần.

#### Scenario: Model gọi cùng tool lặp lại
- **WHEN** cùng tool và arguments lặp tới ngưỡng cấu hình mà không có tiến triển
- **THEN** runtime dừng gọi, trả lý do và usage đã có

#### Scenario: Hết budget
- **WHEN** turn chạm trần trước khi có final answer
- **THEN** runtime không gọi thêm model chỉ để viết tổng kết; UI hiển thị lý do và các kết quả bền hiện có

### Requirement: Reconnect dựng từ snapshot bền
Stream SHALL upsert activity theo ID và event sequence. Khi renderer mount/reconnect, nó SHALL subscribe trước, đọc snapshot session/turn rồi áp event mới hơn snapshot; gap SHALL kích hoạt đọc lại. Không bắt buộc lưu từng token delta, nhưng final answer/activity/operation SHALL phục hồi được mà không chạy lại tool.

#### Scenario: Mất stream sau tool commit
- **WHEN** renderer mất kết nối sau operation commit nhưng trước khi thấy terminal
- **THEN** reconnect hiển thị operation/result từ DB và không gọi lại capability

### Requirement: Giao diện chat dùng chung state và accessible
Màn Trợ lý SHALL có Chat mới, lịch sử, transcript, composer, activity và Mở đích. Màn chương SHALL dùng cùng agent store trong side panel có chế độ `Trợ lý | Ngữ cảnh`; lát này chỉ cung cấp shell và tab Trợ lý. Draft được giữ theo session, auto-scroll không kéo người dùng đang đọc lịch sử, trạng thái streaming/loading/error có nhãn cho bàn phím và assistive technology.

#### Scenario: Đổi bề mặt
- **WHEN** người dùng viết draft ở panel chương rồi mở màn Trợ lý cùng session
- **THEN** draft và transcript vẫn còn, không gửi tự động

#### Scenario: Người dùng đang đọc lịch sử
- **WHEN** token mới đến trong lúc viewport không ở cuối
- **THEN** scroll không bị cưỡng bức; có affordance để về nội dung mới
