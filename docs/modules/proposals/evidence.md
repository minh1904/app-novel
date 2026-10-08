# Bằng chứng và câu hỏi mở

Cập nhật: 2026-10-04 · Trạng thái: quan sát nguồn chính thức và mã Mira; kết luận cho Mira là đề xuất.
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
| [`chatReview.ts`](https://github.com/minh1904/app-novel/blob/c21c555/src/renderer/src/features/editor/chatReview.ts) dùng CodeMirror merge để nhận/bỏ từng khối ngay trong pane. | Review này chỉ cho chat; chưa là hồ sơ đề xuất bền vững. |
| [`chatTurns.ts`](../../../src/renderer/src/features/chapter/chat/chatTurns.ts) ghi rõ session chỉ sống khi panel còn mở. [`ChapterWorkspace.tsx`](../../../src/renderer/src/features/chapter/ChapterWorkspace.tsx) chỉ render `AiPanel` khi `aiOpen`. | Đóng panel unmount và mất hội thoại; chưa có lịch sử phiên. |
| [`AiPanel.tsx`](../../../src/renderer/src/features/chapter/chat/AiPanel.tsx) nhận `chapterId` hiện tại; [`useAiChat.ts`](../../../src/renderer/src/features/chapter/chat/useAiChat.ts) giữ state trong hook. | Panel đang buộc vào chương mở, chưa có hàng chờ xuyên chương. |
| [Roadmap Module 5](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#5-đề-xuất) dự kiến `proposal`/`text_snapshot`; [Module 7](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#7-tác-vụ) mới có `JobRunner`. | Đều là kế hoạch; chưa có bảng và dịch nhiều chương bền vững. |
| [Spec content-model](https://github.com/minh1904/app-novel/blob/501be2a/openspec/specs/content-model/spec.md) và [spec dịch chương](https://github.com/minh1904/app-novel/blob/501be2a/openspec/specs/ai-translate-chapter/spec.md) vẫn mô tả segment/provenance. | Đây là hợp đồng MVP cần sửa khi lập change Module 5/8, không phải thiết kế đoạn mới đã chốt. |

## Đã chốt sau khi tổng hợp

Chủ sản phẩm đã chọn [mọi kết quả AI đều có hồ sơ đề xuất](decisions.md), kể cả pane trống; mặc định
duyệt trước, nhưng có mode Áp dụng thẳng trong chat và dịch chương (quyết định bổ sung 2026-10-05).
Accept all trong chương và hành động riêng cho toàn lượt dịch; phiên cũ mở lại để tiếp tục hội thoại.

## Cần chốt trong OpenSpec Module 5

1. Đề xuất lưu theo cả chương để review từng khối hay từng đoạn riêng? Cách ánh xạ khối diff về
   đoạn nguồn khi số đoạn hai bên lệch là gì?
2. Chọn neo/ID đoạn thế nào để chịu được chèn, dời, tách, gộp và đoạn trùng chữ?
3. Lưu bao lâu hội thoại và snapshot; backup, xóa tác phẩm, xóa phiên tác động thế nào tới đề xuất?
4. Cách lưu quyết định từng khối và phục hồi review dang dở sau khi app tắt?
5. `ai_mark` ở Module 8: Module 5 ghi nguồn gốc của chữ được Accept thế nào trong giai đoạn chuyển
   tiếp, để sau này tạo dấu mà không suy ngược từ nội dung?

Các câu này không chặn việc ghi yêu cầu UX vào tài liệu. Chúng phải được giải trước khi khóa schema
và giao diện, đồng thời kiểm V11/V12 và IME theo [kế hoạch kiểm chứng](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/validation.md).

[Về mục lục](README.md)
