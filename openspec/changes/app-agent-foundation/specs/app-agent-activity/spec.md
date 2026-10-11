## Purpose

Quy định giao diện streaming của Mira Agent để thinking, đọc dữ liệu, thực hiện operation và câu trả lời xuất hiện như một tiến trình ổn định, dễ theo dõi và không làm transcript phình bởi nội dung đã được ghi vào editor.

## ADDED Requirements

### Requirement: Một activity timeline thống nhất cho mỗi lượt

Mỗi lượt đang chạy SHALL hiển thị một activity hiện tại và một danh sách bước theo thứ tự. Mỗi bước SHALL có loại, trạng thái, mô tả ngắn và target khi có. Các trạng thái SHALL phân biệt chờ, đang chạy, hoàn tất, lỗi và đã hủy. Các bước hoàn tất SHALL có thể thu gọn nhưng vẫn mở lại được.

#### Scenario: Đọc rồi dịch
- **WHEN** agent resolve chương 2, đọc context và chạy bảy lô dịch
- **THEN** timeline lần lượt hiện resolve đích, đọc context và tiến độ dịch; không hiện ba chỉ báo chờ không liên quan

#### Scenario: Một bước lỗi
- **WHEN** bước đọc glossary lỗi nhưng operation vẫn có thể kết thúc
- **THEN** bước đó hiện trạng thái lỗi cùng lý do và các bước sau vẫn có trạng thái riêng

### Requirement: Thứ tự activity và thứ tự stream là hai trường riêng

Mỗi activity SHALL có `stepSeq` bất biến biểu diễn thứ tự bước trong turn; mọi update của cùng activity SHALL giữ cùng `activityId` và `stepSeq`. Mỗi event IPC SHALL có `eventSeq` tăng đơn điệu trong request/turn để renderer phát hiện event trùng hoặc đến sai thứ tự. `eventSeq` SHALL NOT được persist như một activity mới hoặc dùng làm khóa `(turnId, stepSeq)`.

#### Scenario: Cập nhật tiến độ bảy lô
- **WHEN** một activity dịch được cập nhật từ 1/7 đến 7/7
- **THEN** DB vẫn có một activity với cùng `stepSeq`, còn bảy event update có `eventSeq` tăng dần

#### Scenario: Event trùng sau reconnect
- **WHEN** renderer nhận lại một event có `eventSeq` không lớn hơn event cuối đã áp dụng
- **THEN** renderer bỏ event trùng và không lùi progress hoặc tạo activity thứ hai

### Requirement: Thinking có preview và trạng thái kết thúc

Khi provider stream reasoning, panel SHALL hiện preview giới hạn của reasoning đang chạy và cho người dùng mở toàn bộ phần provider đã gửi. Khi answer hoặc operation bắt đầu, thinking SHALL tự thu gọn nếu người dùng chưa tự mở. Sau khi kết thúc, nhãn SHALL cho biết đã suy nghĩ và thời lượng nếu đo được. Panel SHALL không tự tạo hoặc mô phỏng reasoning khi provider không gửi.

#### Scenario: Provider stream reasoning
- **WHEN** provider gửi reasoning trong năm giây trước answer
- **THEN** panel hiện preview đang suy nghĩ, cho mở chi tiết và sau đó thu thành “Đã suy nghĩ 5 giây”

#### Scenario: Provider không gửi reasoning
- **WHEN** provider chỉ stream answer hoặc tool call
- **THEN** panel không tạo nội dung thinking giả; activity chuyển từ chờ sang bước thực tế đầu tiên

### Requirement: Streaming answer ổn định

Renderer SHALL gom delta answer/reasoning thành các lần cập nhật có giới hạn tần suất thay vì render từng token. Markdown đã hoàn tất SHALL giữ ổn định; phần block cuối chưa hoàn tất SHALL không làm các block trước nhấp nháy hoặc đổi khóa. Khi stream kết thúc, toàn bộ answer SHALL được parse và hiển thị nhất quán.

#### Scenario: Stream nhiều delta nhỏ
- **WHEN** provider gửi hàng trăm delta trong một giây
- **THEN** nội dung vẫn xuất hiện liên tục nhưng renderer không commit một lần cho mỗi delta

#### Scenario: Fence chưa đóng
- **WHEN** answer đang stream một code fence chưa có dấu đóng
- **THEN** phần chưa hoàn tất được hiển thị an toàn và các block trước không bị dựng lại; khi fence đóng, kết quả được parse đúng

### Requirement: Auto-scroll tôn trọng người đọc

Panel SHALL tự theo cuối stream chỉ khi người dùng đang ở gần cuối. Khi người dùng cuộn lên để đọc, stream SHALL không kéo vị trí xuống; panel SHALL cung cấp affordance để trở về nội dung mới. Motion SHALL tôn trọng `prefers-reduced-motion`.

#### Scenario: Người dùng đang ở cuối
- **WHEN** answer tiếp tục stream và panel đang ở gần cuối
- **THEN** panel theo nội dung mới mà không nhảy quá phần vừa xuất hiện

#### Scenario: Người dùng cuộn lên
- **WHEN** người dùng cuộn lên trong lúc stream
- **THEN** vị trí đọc giữ nguyên và một hành động trở về nội dung mới xuất hiện

### Requirement: Operation dài chỉ stream tiến độ và kết quả tóm tắt

Operation dịch hoặc sửa dài SHALL stream target, đơn vị đã hoàn tất trên tổng, trạng thái và lỗi; transcript SHALL NOT lặp toàn bộ văn bản đã ghi vào editor. Khi kết thúc, UI SHALL cung cấp hành động phù hợp như Mở đích, Hoàn tác hoặc Xem chi tiết.

#### Scenario: Dịch chương hoàn tất
- **WHEN** operation dịch 86 đoạn kết thúc thành công
- **THEN** transcript hiện số đoạn, thời lượng và hành động Mở chương/Hoàn tác, không hiện lại 86 đoạn dịch

#### Scenario: Hủy operation
- **WHEN** người dùng hủy operation đang chạy
- **THEN** activity chuyển sang đã hủy, ghi số đơn vị đã hoàn tất và vẫn hiện Hoàn tác nếu đã có thay đổi

### Requirement: Trạng thái accessible không phụ thuộc animation

Mọi trạng thái activity SHALL có nhãn chữ hoặc accessible name; màu và animation không phải dấu hiệu duy nhất. Nút mở rộng SHALL phản ánh `aria-expanded`, bước đang chạy SHALL được công bố có kiểm soát và animation SHALL dừng khi reduced motion được bật.

#### Scenario: Reduced motion
- **WHEN** hệ điều hành yêu cầu giảm chuyển động
- **THEN** activity vẫn phân biệt đang chạy và hoàn tất bằng chữ/icon tĩnh, không dùng pulse lặp lại
