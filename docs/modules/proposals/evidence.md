# Bằng chứng và câu hỏi mở

Cập nhật: 2026-10-09 · Trạng thái: quan sát nguồn chính thức và mã Mira; kết luận cho Mira là đề xuất.
Chủ trì: sản phẩm/kỹ thuật. Câu hỏi: phần nào là mẫu tham khảo, phần nào Mira phải tự quyết?

## Antigravity: phạm vi quan sát

Đọc tài liệu chính thức ngày 2026-10-04; giao diện và hành vi có thể đổi theo phiên bản/surface.

| Quan sát có nguồn | Điều rút ra cho Mira |
| --- | --- |
| [Antigravity IDE Agent Side Panel](https://antigravity.google/docs/agent-side-panel) cho mở hội thoại mới và theo dõi file changes trong panel. | Mẫu panel có hội thoại và review; không chứng minh chính sách lưu phiên của Mira. |
| [Antigravity IDE Review Changes](https://antigravity.google/docs/ide/review-changes-editor) hiện diff các thay đổi trong cuộc hội thoại và cho bình luận. | Học cách giữ bối cảnh cuộc hội thoại khi review; tài liệu này không mô tả nút Accept all của IDE. |
| [Antigravity 2.0 Projects](https://antigravity.google/docs/projects) gắn project với lịch sử hội thoại và cho mở lại hội thoại. | Lịch sử nên theo tác phẩm; đây là phép tương tự, không phải cùng mô hình dữ liệu. |
| [Antigravity CLI review mode](https://antigravity.google/docs/cli/modes) cho `y` nhận, `n` bỏ trước khi ghi file. [CLI artifact review](https://antigravity.google/docs/cli/artifacts/) có duyệt/từ chối từng file và `Shift+A` duyệt tất cả mục đang chờ. | Chứng cứ cho thao tác hàng loạt nằm ở **CLI**, không áp thẳng ngữ nghĩa của nó lên IDE hoặc đề xuất văn xuôi. |

“Giống Antigravity” ở đây là ưu tiên **đề xuất nhìn được, duyệt từng phần, duyệt hàng loạt có phạm
vi, và quay lại hội thoại**. Mira tự định nghĩa giao dịch văn bản, xung đột và phạm vi nhiều chương.

## Mira hiện có gì

| Quan sát từ mã | Giới hạn |
| --- | --- |
| `ai_session` và `ai_turn` được lưu bền trong SQLite của tác phẩm; mỗi lượt giữ câu hỏi, câu trả lời, reasoning, trạng thái, model, usage, tool và vị trí lúc gửi. | Phiên chưa có rename, delete, pin, archive, tìm kiếm hay retention. |
| Store chat nằm ở cấp ứng dụng theo tác phẩm và listener stream nằm ở `App`, nên ẩn panel hoặc đổi chương không làm mất lượt đang chạy. | Chọn phiên khác hoặc tạo hội thoại mới hủy request đang chạy của phiên hiện tại; lượt dở khi app đóng thành `interrupted` ở lần mở sau. |
| Storage và handler có keyset pagination cho phiên và lượt. | Bridge renderer chỉ tải trang đầu: tối đa 30 phiên và 100 lượt; chưa có tải thêm, `hasMore` hay cursor ở UI. |
| Lịch sử gửi model chỉ gồm câu hỏi và câu trả lời của lượt `done`, trong ngân sách 24.000 ký tự. | Tool call/result, reasoning, proposal và vị trí cũ không được gửi lại. Giới hạn 40 message chưa được áp đồng bộ khi dựng lịch sử. |
| Proposal chat gắn chương, phiên và lượt; storage kiểm tra ba liên kết khớp nhau. | Proposal có vòng đời độc lập: liên kết tới session/turn dùng `ON DELETE SET NULL`. Pending glossary chưa có provenance session/turn trực tiếp. |
| Chat agentic có tool đọc và tool ghi; tool ghi chỉ tạo proposal hoặc context entry chờ duyệt. | Attachment theo lượt và reference document theo tác phẩm chưa có contract, schema, API, UI hay OpenSpec. |

## Đã chốt sau khi tổng hợp

Chủ sản phẩm đã chọn [mọi kết quả AI đều có hồ sơ đề xuất](decisions.md), kể cả pane trống. Hộp dịch
chương vẫn có Duyệt trước/Áp dụng thẳng; panel chat từ quyết định 2026-10-08 không còn mode và proposal
chỉ sinh từ tool ghi, luôn chờ duyệt. Accept all trong chương và hành động riêng cho toàn lượt dịch;
phiên cũ mở lại để tiếp tục hội thoại.

## Câu hỏi còn mở sau triển khai

1. Retention và giới hạn dung lượng cho session, turn, snapshot và tool metadata là gì?
2. Rename, pin, archive và delete phiên có ngữ nghĩa nào; delete ảnh hưởng thế nào tới proposal và
   context entry đang chờ?
3. Phân trang được đưa tới renderer ra sao để UI và lịch sử gửi model không chỉ thấy trang đầu?
4. Có cần gửi lại tool call/result của lượt cũ cho model, hay chỉ question/answer như hiện tại?
5. Pending glossary do tool tạo giữ provenance tới session/turn ra sao?
6. Có làm attachment theo lượt và reference document theo tác phẩm không; nếu có thì ownership,
   versioning, backup, giới hạn và quyền đọc của tool là gì?
7. `ai_mark` ghi nguồn gốc phần chữ đã Accept thế nào khi proposal mất liên kết tới phiên/lượt?

[Về mục lục](README.md)
