## Why

Mira hiện ghi trực tiếp kết quả dịch chương vào các hàng segment; chat Sửa cũng tự ghi khi pane dịch trống, còn hội thoại mất khi đóng panel. Theo [quyết định Module Đề xuất](../../../docs/modules/proposals/decisions.md), mọi chữ AI thay bản dịch phải có hồ sơ đề xuất và phiên AI phải mở lại được; người dùng chọn Duyệt trước hoặc Áp dụng thẳng cho từng lượt. Giai đoạn 2 bắt đầu bằng đường ghi an toàn này trước khi có tác vụ nhiều chương.

## What Changes

- Mọi kết quả dịch chương và chat Sửa tạo đề xuất bền vững theo tác phẩm/chương, kể cả pane trống. Mặc định người dịch duyệt diff trong editor với Accept/Deny/Accept all; khi chọn Áp dụng thẳng, hệ thống tự Accept phần an toàn qua cùng giao dịch và giữ phần xung đột để duyệt.
- Lưu phiên, lượt chat, snapshot ngữ cảnh và liên kết đề xuất trong tệp `.mira`; ẩn panel, chuyển chương hoặc khởi động lại không xóa lịch sử. Mở phiên cũ để tiếp tục chat.
- Sửa panel: chat thường dùng nút Gửi; ngay lúc gửi có thể chọn Tạo đề xuất hoặc Áp dụng thẳng cho yêu cầu viết, không duy trì mode Hỏi/Sửa. Câu trả lời có trình bày Markdown an toàn; ngữ cảnh đọc và đích sửa được hiển thị riêng, xem trước đúng nội dung sẽ gửi, cảnh báo cắt ngữ cảnh và câu trả lời chưa hoàn chỉnh.
- Chuyển luồng dịch một chương sang đơn vị đoạn tự nhiên và hàng đề xuất, dùng lõi dịch hiện có; tiến độ phản ánh đoạn đã xử lý/đề xuất đã tạo, không gọi đó là chữ đã ghi. Giữ retry/hủy của luồng một chương hiện tại.
- **BREAKING:** thay yêu cầu của `ai-translate-chapter` về ghi trực tiếp theo segment và ngoại lệ pane trống. Dữ liệu cũ vẫn được migration đọc nguyên vẹn; xóa bảng segment/link/provenance và JobRunner nhiều chương nằm ở Module 8 và Module 7.

## Capabilities

### New Capabilities

- `ai-proposals`: tạo, lưu, điều hướng, duyệt thủ công hoặc tự Accept đề xuất với snapshot, từng phần diff, kiểm tra xung đột và Accept all theo chương.
- `ai-sessions`: lưu lịch sử chat theo tác phẩm và snapshot của từng lượt để mở lại, tiếp tục và gắn đề xuất đúng chương.
- `ai-chat-panel`: tương tác chat, ngữ cảnh đầu vào, hiển thị câu trả lời và ranh giới giữa nội dung đọc với phạm vi được đề xuất sửa.

### Modified Capabilities

- `ai-translate-chapter`: dịch một chương theo đoạn và đưa kết quả vào hàng đề xuất thay vì ghi thẳng theo segment.

## Impact

- **Storage/IPC:** migration `.mira` sau schema hiện hành; API phiên và đề xuất có kiểm quyền tác phẩm/chương, revision và kích thước; backup/restore mang theo dữ liệu mới.
- **Main AI:** luồng dịch một chương tạo đề xuất từ kết quả lõi dịch và giữ metadata model, usage, `contextHash` cùng danh sách ngữ cảnh thực gửi.
- **Renderer/editor:** panel theo tác phẩm, transcript/Markdown/ngữ cảnh trước gửi, hàng chờ theo chương và review tại pane dịch. Đường auto-apply pane trống và đường `saveRow` từ AI bị thay.
- **Kiểm chứng:** V11–V12, migration dữ liệu cũ, đóng cưỡng bức giữa ghi/duyệt, IME, chương dài, nội dung trùng và phiên sau khởi động lại.
