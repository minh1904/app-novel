## Why

Người dùng gửi 5 ảnh mockup tham khảo (NekoNovel, SmartCat) và qua trao đổi chốt ba việc muốn thấy ngay trong mode Toàn văn: thanh bên trái đổi thành danh sách chương thay vì điều hướng thư viện khi đang dịch, một chỗ hỏi AI nhanh về đúng đoạn đang chọn mà không rời mạch đọc, và bản dịch hiện có định dạng ngay trong lúc gõ thay vì toàn chữ thuần. `translation-editor` và `sentence-mode` đã dựng hai pane và soát theo hàng nhưng chưa có cả ba thứ này; `full-text-editor` hiện chỉ có Source editor + Reading view tách rời (ADR theo `decisions.md` "Nội dung chung"). Ba mục đã được dựng thử bằng wireframe ([đề xuất redesign](../../../docs/handbook/experience/editor-redesign.md)), chọn phương án D, rồi dựng thẳng vào code vì chưa cần job AI hay dữ liệu thật mới làm được — sidebar dùng lại `useChapters` đã có, Live Preview chỉ là lớp trang trí trên văn bản đã có, panel AI là minh họa như các khu vực "Sắp có" khác của dự án.

## What Changes

- **Sidebar chương khi đang sửa một chương**: thanh bên trái đổi từ điều hướng thư viện (`LibrarySidebar`) sang danh sách chương của tác phẩm đang mở (`ChapterNavSidebar`), có nút quay lại tác phẩm, chương đang mở được đánh dấu, chấm trạng thái đã dịch/chưa dịch/chưa có bản gốc theo từng chương; đóng mở bằng đúng công tắc thanh bên đã có (Ctrl+B, "Tập trung").
- **Live Preview nhẹ cho bản dịch**: pane bản dịch ở mode Toàn văn hiện định dạng ngay khi gõ cho hai cú pháp `#`/`##`/`###` (tiêu đề, cỡ chữ lớn hơn) và `**đậm**` (chữ đậm), bằng cách tô màu/kiểu chữ lên đúng ký tự đã gõ (mark decoration), không ẩn hay thay ký tự `#`/`**` và không chèn phần tử nào cạnh con trỏ, để không phá bộ gõ tiếng Việt/Trung/Nhật theo nguyên tắc đã có ở `source-editor`. Đây không phải Live Preview đầy đủ kiểu Obsidian (không ẩn cú pháp); Reading view hiện có không đổi.
- **"Hỏi AI" minh họa trong mode Toàn văn**: nút "Hỏi AI" (và phím tắt Ctrl+K) mở một panel chiếm một cột thật cạnh hai pane (không đè lên nội dung, hai pane co lại nhường chỗ), có thẻ nêu đang hỏi về đoạn nào, bốn nút nhanh, một lượt hỏi/đáp và ô nhập — toàn bộ là dữ liệu mẫu cố định theo đúng quy ước "tính năng chưa triển khai chỉ hiện dưới dạng minh họa" đã dùng cho các khu vực khác của dự án: không gọi AI, không đọc/ghi dữ liệu. Đóng bằng Esc, nút đóng, hoặc bấm ra ngoài.
- **Xem trước Ngữ cảnh trong màn chương**: hàng nhãn tĩnh "Thuật ngữ · Xưng hô · Văn phong" cạnh mode Toàn văn/Từng câu, mỗi nhãn mang badge "Sắp có" (dùng chung minh họa `context-area` đã có ở cấp tác phẩm) nhưng không bấm được và không tạo điều hướng mới — chỉ cho thấy trước nội dung sẽ có, không thay thế hay trùng với tab "Ngữ cảnh" ở `work-area-navigation`.

Không thuộc change này: provider AI thật, "Hỏi AI" ở mode Từng câu, Markdown đầy đủ (link, danh sách, nghiêng, lồng cú pháp nhiều dòng), đổi điều hướng cấp tác phẩm.

## Capabilities

### New Capabilities

- `chapter-nav-sidebar`: thanh bên trái hiện danh sách chương của tác phẩm đang mở thay vì điều hướng thư viện, khi màn đang là một chương.

### Modified Capabilities

- `full-text-editor`: thêm Live Preview nhẹ cho pane bản dịch (`#`/`##`/`###`, `**đậm**`) và thêm panel "Hỏi AI" minh họa mở được từ mode Toàn văn. (Spec này đến từ `translation-editor`, đã sửa tiếp bởi `sentence-mode`; cả hai chưa archive.)

## Impact

- **Phụ thuộc change khác:** dùng `ChapterWorkspace`, `TextEditor`, trạng thái thanh bên của `translation-editor`/`sentence-mode`/`source-editor`; dùng `useChapters` đã có của `work-detail-screen`. Archive theo đúng thứ tự các change đó trước, rồi tới change này.
- **Code:** `src/renderer/src/App.tsx` (chọn sidebar theo loại màn), `src/renderer/src/features/chapter/ChapterNavSidebar.tsx` (mới), `src/renderer/src/features/chapter/AiPanel.tsx` (mới), `src/renderer/src/features/chapter/ChapterWorkspace.tsx` (nút/phím tắt Hỏi AI, cột thứ ba, `livePreview` cho pane dịch), `src/renderer/src/features/editor/livePreviewDecorations.ts` (mới), `src/renderer/src/features/editor/TextEditor.tsx` (prop `livePreview`), `src/renderer/src/features/work/mockFeatures.ts` (thêm `aiPanel`).
- **Dữ liệu và IPC:** không đổi schema, không thêm kênh IPC; panel AI không gọi gì ra ngoài renderer.
- **Tài liệu:** `decisions.md` (Live Preview nhẹ), `backlog.md` (`ai-chat-panel` chuyển "Chỉ minh họa", `rendered-direct-edit-view` chuyển "Đã triển khai", `work-area-nav-v2` chuyển "Không làm hiện tại"), `open-questions.md`, `current-state.md`, `changelog.md` — đã cập nhật trước khi viết spec này; change này là bản ghi hình thức theo đúng quy trình OpenSpec của dự án.
