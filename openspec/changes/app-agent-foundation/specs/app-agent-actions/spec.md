## Purpose

Quy định cách Mira Agent resolve đích và thực hiện capability sản phẩm an toàn, bắt đầu bằng đọc cross-work, dịch hoặc sửa trực tiếp một chương, checkpoint và hoàn tác mà không đẩy bản dịch dài vào chat.

## ADDED Requirements

### Requirement: Resolve đích trước khi thao tác

Agent SHALL resolve mọi yêu cầu cần resource thành target cụ thể trước khi đọc hoặc ghi. Khi người dùng dùng từ chỉ định tương đối, context hiện tại SHALL là mặc định. Khi người dùng nêu tác phẩm hoặc chương khác, target đã nêu SHALL thắng context. Nếu không có đúng một target phù hợp, agent SHALL hỏi lại và SHALL NOT thực hiện thao tác ghi.

#### Scenario: Chương này
- **WHEN** context là tác phẩm A chương 4 và người dùng yêu cầu “dịch chương này”
- **THEN** target được resolve thành A chương 4

#### Scenario: Chương khác trong tác phẩm hiện tại
- **WHEN** context là A chương 1 và người dùng yêu cầu “dịch chương 2”
- **THEN** target được resolve thành A chương 2 mà không yêu cầu người dùng mở chương 2

#### Scenario: Tác phẩm khác
- **WHEN** context là A và người dùng yêu cầu “dịch chương 2 của B” với B xác định duy nhất
- **THEN** target được resolve thành B chương 2

#### Scenario: Tên tác phẩm mơ hồ
- **WHEN** hai tác phẩm cùng khớp tên người dùng nêu
- **THEN** agent hỏi người dùng chọn một tác phẩm và không tạo operation ghi

### Requirement: Phân biệt trả lời và thực hiện theo ý định

Yêu cầu tìm hiểu, giải thích, so sánh hoặc xin nhiều phương án SHALL chỉ trả lời trong chat trừ khi người dùng yêu cầu ghi. Yêu cầu dịch, sửa, đổi hoặc áp dụng với target xác định SHALL tạo operation thực hiện. Agent SHALL không cần mode Hỏi/Sửa/Đề xuất trong composer.

#### Scenario: Xin ba phương án
- **WHEN** người dùng hỏi “cho ba cách dịch tên này”
- **THEN** agent trả các phương án trong chat và không thay đổi glossary hay bản dịch

#### Scenario: Yêu cầu sửa rõ ràng
- **WHEN** người dùng yêu cầu “sửa đoạn đang chọn tự nhiên hơn” và vùng chọn xác định
- **THEN** agent tạo operation sửa và áp dụng kết quả an toàn vào vùng đó

#### Scenario: Ý định ghi không rõ
- **WHEN** yêu cầu có thể là xin phương án hoặc yêu cầu ghi và không có cách hiểu rõ ràng từ câu chữ
- **THEN** agent hỏi lại trước khi tạo operation ghi

### Requirement: Dịch chương dùng pipeline chuyên dụng

Yêu cầu dịch toàn chương SHALL được thực hiện bằng capability dịch chương của Mira, dùng model và cấu hình đã chụp khi operation bắt đầu, chia lô, dùng context dịch đã duyệt và kiểm kết quả như luồng dịch chương. Model điều phối chat SHALL không trả toàn bộ bản dịch như câu trả lời để thay cho capability này.

#### Scenario: Dịch và áp dụng chương khác
- **WHEN** người dùng đang ở chương 1 và yêu cầu dịch chương 2
- **THEN** agent chạy pipeline dịch cho chương 2, bản dịch được ghi vào editor của chương 2 và transcript chỉ nhận tiến độ cùng kết quả tóm tắt

#### Scenario: Model chỉ trả bản dịch trong chat
- **WHEN** model điều phối tạo một khối bản dịch dài nhưng không gọi capability dịch
- **THEN** khối chữ không được ghi vào bản dịch và lượt không được báo là đã thực hiện

#### Scenario: Chương có đoạn người dùng đã sửa
- **WHEN** pipeline dịch gặp đoạn đích được đánh dấu do người dùng viết hoặc đã soát
- **THEN** hệ thống giữ nguyên đoạn đó, áp dụng các đoạn an toàn còn lại, báo số đoạn được giữ và kết thúc operation ở trạng thái hoàn tất một phần; bản AI của đoạn được giữ không tạo proposal pending

### Requirement: Sửa vùng ngắn dùng replacement có giới hạn

`edit_translation` SHALL chỉ chạy sau khi model đã đọc target và SHALL nhận replacement text do chính model điều phối tạo ra, cùng instruction và khoảng đoạn đã resolve. Replacement SHALL chịu trần kích thước, kiểm văn bản rỗng/trùng, base revision và phạm vi; model SHALL NOT được truyền `workId` hoặc `chapterId` khác target đã resolve. Usage và provenance của replacement SHALL thuộc lời gọi model điều phối đã tạo tool call.

#### Scenario: Sửa vùng đã đọc
- **WHEN** model đã đọc đoạn 7–9, tạo replacement hợp lệ và gọi `edit_translation`
- **THEN** handler kiểm base/revision rồi áp dụng replacement vào đúng đoạn 7–9 và ghi provenance model của lượt

#### Scenario: Replacement quá lớn
- **WHEN** model gửi replacement vượt trần của capability
- **THEN** capability từ chối trước khi ghi, activity nêu giới hạn và operation không có checkpoint đã áp dụng

### Requirement: Thao tác ghi trực tiếp có checkpoint và provenance

Mọi operation sửa dữ liệu nội bộ có thể hoàn tác SHALL chụp base/revision và checkpoint trước lần ghi đầu, ghi bằng transaction của domain, và lưu provenance gồm session, turn, operation, capability, model và target. Lượt mới SHALL không tạo proposal chờ duyệt hoặc yêu cầu Accept/Deny để hoàn tất operation.

#### Scenario: Áp dụng thành công
- **WHEN** revision đích vẫn khớp base và kết quả qua kiểm tra
- **THEN** hệ thống áp dụng thay đổi, đánh dấu operation hoàn tất và cung cấp hành động Hoàn tác

#### Scenario: Revision đổi trước khi ghi
- **WHEN** văn bản đích đã đổi sau lúc operation chụp base
- **THEN** hệ thống không ghi đè, đánh dấu operation xung đột và cung cấp hành động Mở đích hoặc Chạy lại; không tạo proposal pending

### Requirement: Operation ghi phối hợp với editor đang mở

Trước batch ghi đầu tiên, main SHALL phát write intent cho target đã resolve. Nếu target đang mở, renderer SHALL chặn input mới ngay, flush thay đổi dirty rồi ack revision; nếu target không mở, app coordinator SHALL ack `not-open` ngay. Main SHALL chỉ lấy write lease khi ack hợp lệ và revision vẫn khớp; timeout hoặc flush lỗi SHALL fail closed trước khi ghi. Khi operation giữ lease, editor target SHALL ngăn lưu cạnh tranh và hiển thị trạng thái Agent đang cập nhật; editor khác vẫn dùng bình thường. Sau trạng thái terminal, main SHALL phát target-changed với revision cuối để renderer tải lại một lần. Revision guard trong main SHALL vẫn là lớp bảo vệ bắt buộc kể cả khi UI đã khóa.

#### Scenario: Target đang có thay đổi chưa lưu
- **WHEN** Agent sắp ghi vào chương đang mở và editor target đang dirty
- **THEN** renderer thử flush thay đổi trước; nếu flush thất bại hoặc revision xung đột thì operation không ghi, chuyển `conflict` với lý do editor dirty và không ghi đè nội dung trong RAM

#### Scenario: Agent đang ghi target được mở
- **WHEN** operation đã lấy write lease cho bản dịch của chương đang mở
- **THEN** editor target chuyển sang read-only có giải thích, autosave không chạy cạnh tranh và source editor hoặc chương khác không bị khóa

#### Scenario: Target không được mở
- **WHEN** write intent nhắm một chương không có editor đang mount
- **THEN** app coordinator ack `not-open`, main kiểm revision và lấy lease mà không chờ một workspace không tồn tại

#### Scenario: Operation kết thúc sau nhiều batch
- **WHEN** operation đạt trạng thái terminal với `lastAppliedRev`
- **THEN** renderer nhận target-changed, tải/apply bản ghi revision đó một lần, giữ editor đồng bộ và nhả trạng thái Agent đang cập nhật

### Requirement: Batch write có journal bền và idempotent

Checkpoint mới SHALL bắt đầu ở trạng thái `prepared` với revision/nội dung trước operation và chưa có `lastAppliedRev`. Mỗi batch SHALL dùng một idempotency key bền; thay đổi domain, batch journal và cập nhật checkpoint SHALL commit trong cùng transaction work DB. Chỉ batch journal đã commit mới là bằng chứng dữ liệu đã áp dụng. Reconcile SHALL không diễn giải checkpoint `prepared` đơn độc thành operation đã áp dụng.

#### Scenario: Crash trước batch đầu tiên
- **WHEN** app dừng sau khi tạo checkpoint `prepared` nhưng trước transaction batch đầu tiên
- **THEN** khi mở lại không có nội dung được coi là đã ghi và operation chuyển `interrupted` mà không có hành động Hoàn tác giả

#### Scenario: Crash sau batch commit
- **WHEN** batch thứ ba đã commit cả dữ liệu lẫn journal nhưng library DB chưa nhận progress
- **THEN** khi mở lại reconciler nhận đúng ba batch đã áp dụng, không chạy lại chúng và khôi phục progress từ journal

#### Scenario: Retry cùng batch
- **WHEN** runner thử lại cùng operation và batch key sau timeout không rõ kết quả
- **THEN** unique idempotency key trả lại kết quả đã commit hoặc từ chối duplicate mà không ghi nội dung lần hai

### Requirement: Operation tuân theo state machine chuẩn

Operation SHALL chỉ chuyển `queued → running → completed | partially_completed | conflict | failed | cancelled | interrupted`. Operation `completed`, `partially_completed` hoặc `cancelled` có thay đổi MAY chuyển sang `undone`; các trạng thái terminal khác SHALL không chuyển ngược về `running`. Activity và turn SHALL dùng state machine riêng, không tái sử dụng tùy ý state của operation.

#### Scenario: Hủy operation chưa ghi gì
- **WHEN** người dùng hủy operation trước batch đầu tiên
- **THEN** operation chuyển `cancelled` không có thay đổi và không cung cấp Hoàn tác

#### Scenario: Reconciler gặp operation terminal
- **WHEN** startup reconciler gặp operation đã `completed`
- **THEN** nó không chuyển operation về `running` hoặc chạy lại capability

### Requirement: Hủy operation giữ kết quả đã ghi và cho hoàn tác toàn run

Operation nhiều lô SHALL có một checkpoint cấp operation trước khi bắt đầu ghi. Khi người dùng hủy, request đang chạy SHALL bị hủy, các lô đã ghi hợp lệ SHALL được giữ, kết quả SHALL nói rõ phạm vi đã hoàn tất, và một hành động Hoàn tác SHALL khôi phục toàn bộ target về checkpoint trước operation.

#### Scenario: Hủy giữa chương
- **WHEN** người dùng dừng sau khi 52 trên 86 đoạn đã được áp dụng
- **THEN** operation chuyển sang đã hủy có thay đổi, 52 đoạn vẫn có trong bản dịch, UI báo đúng tiến độ và Hoàn tác khôi phục trạng thái trước operation

### Requirement: Hoàn tác kiểm tra trạng thái hiện tại

Hoàn tác SHALL chỉ ghi khi trạng thái hiện tại còn tương thích với kết quả operation hoặc có thể khôi phục bằng checkpoint mà không xóa thay đổi mới không liên quan. Nếu đích đã được sửa sau operation và không thể hoàn tác an toàn, hệ thống SHALL từ chối và giải thích xung đột.

#### Scenario: Hoàn tác ngay sau khi dịch
- **WHEN** người dùng bấm Hoàn tác trước khi có thay đổi khác ở target
- **THEN** target trở về checkpoint trước operation và operation chuyển sang trạng thái đã hoàn tác

#### Scenario: Có thay đổi mới sau operation
- **WHEN** người dùng đã sửa target sau khi operation hoàn tất
- **THEN** hệ thống không âm thầm ghi đè thay đổi mới và báo không thể hoàn tác tự động

### Requirement: Xác nhận theo mức độ rủi ro

Thao tác đọc và thao tác nội bộ có checkpoint SHALL có thể chạy ngay khi target rõ. Thao tác xóa, thao tác khó hoàn tác, thao tác có side effect bên ngoài hoặc thao tác hàng loạt có phạm vi chưa rõ SHALL yêu cầu xác nhận hiển thị target và tác động trước khi thực hiện.

#### Scenario: Dịch một chương
- **WHEN** người dùng yêu cầu dịch một chương xác định
- **THEN** agent bắt đầu operation mà không yêu cầu Accept từng phần

#### Scenario: Xóa tác phẩm
- **WHEN** một capability tương lai yêu cầu xóa tác phẩm
- **THEN** agent phải xin xác nhận rõ tên tác phẩm trước khi gọi capability phá hủy

### Requirement: Capability không phơi primitive đặc quyền

Agent SHALL chỉ được gọi capability có contract và phạm vi domain. Agent SHALL NOT có capability chạy SQL tùy ý, shell tùy ý, ghi file tùy ý hoặc gửi IPC tùy ý. Mỗi capability ghi SHALL tự kiểm target, revision, giới hạn và idempotency.

#### Scenario: Model gọi capability không đăng ký
- **WHEN** model yêu cầu một tên tool hoặc capability không có trong registry
- **THEN** hệ thống từ chối, không ánh xạ nó sang primitive tổng quát và ghi activity lỗi
