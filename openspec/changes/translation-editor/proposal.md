## Why

Màn chương hiện chỉ có một khung cho bản gốc. Luồng chính của Mira là soát và sửa **bản dịch bên cạnh bản gốc** ([scope](../../../docs/handbook/product/scope.md) S1.5, [quyết định](../../../docs/handbook/product/decisions.md) "Hai mode"); chưa có màn này thì job dịch AI và mode Từng câu không có nơi hiển thị kết quả, và người dịch tự dịch hay dán sẵn bản dịch cũng chưa làm được việc gì. Kho đã lưu được bản dịch (`text:get`/`text:save` bên `target`) và editor CodeMirror, ánh xạ segment, lưu và xung đột đã có từ change `source-editor`, nên đây là lát cắt tiếp theo: dựng màn editor hai pane (mode **Toàn văn**) trên nền đó.

## What Changes

- Thêm **màn editor hai pane** thay khung đơn của màn chương: bản gốc bên trái, bản dịch bên phải, mỗi pane cuộn độc lập trong khung cao bằng vùng làm việc; **không số nối, đường nối hay ép cân hàng** giữa hai bên (quyết định "Bố cục").
- **Bản gốc khóa mặc định** (chỉ đọc, vẫn chọn và sao chép được); nút "Sửa bản gốc" mở khóa để sửa lỗi bản gốc bằng editor của `source-editor`, "Khóa lại" để khóa. Đây là thao tác riêng theo quyết định "bản gốc chỉ đọc trong luồng dịch thường"; thay hành vi của `source-editor` là sửa được ngay.
- **Bản dịch sửa trực tiếp** bằng cùng editor (dạng Source), có gợi ý khi trống; dán hoặc gõ bản dịch toàn văn có sẵn; segment chia bằng quy tắc tiếng Việt, lề hiện số như bản gốc. Lưu bên `target` (lần đầu tạo bản dịch với revision 0).
- **Reading view** cho pane dịch: chuyển giữa "Soạn thảo" và "Đọc" (đọc chỉ-đọc, chữ và khoảng cách để đọc liền mạch); không đổi hay mất chữ chưa lưu khi chuyển.
- **Lưu cả hai bên**: nút "Lưu" và Ctrl+S lưu mọi bên đang có thay đổi; trạng thái, lỗi và xung đột theo từng bên; chặn rời xét cả hai bên.
- **Chọn mode** Toàn văn | Từng câu: Toàn văn dùng được; Từng câu hiện nhãn "Sắp có" và không chọn được (ghi vào backlog).
- **Chế độ tập trung**: nút ẩn thanh bên để mở rộng hai pane (dùng lại cơ chế ẩn thanh bên có sẵn).

Không thuộc change này: mode Từng câu, job dịch và provider, liên kết giữa segment gốc và dịch, căn chỉnh, hiển thị Markdown trong Reading view (hiện đọc văn bản thuần theo đoạn), tự lưu định kỳ, tách/gộp segment thủ công, xuất tệp, đổi schema hay IPC.

## Capabilities

### New Capabilities

- `full-text-editor`: màn hai pane Toàn văn của một chương: bố cục, khóa và mở khóa bản gốc, soạn bản dịch, Reading view, lưu hai bên, chặn rời, chọn mode, chế độ tập trung, IME và hiệu năng cho bên dịch.

### Modified Capabilities

- `chapter-screen`: yêu cầu hiển thị bản gốc không còn là một khung đơn mà là màn hai pane. (Spec này đến từ `chapter-source-import` và được sửa tiếp bởi `source-editor`, cả hai chưa archive.)

## Impact

- **Phụ thuộc change khác:** dùng editor, `EditorSession`, ánh xạ segment, chặn rời của `source-editor`; phải archive theo thứ tự `chapter-source-import` → `source-editor` → `translation-editor`.
- **Code:** `src/renderer/src/features/editor/` (đổi `SourceEditor` thành `TextEditor` dùng được cho cả hai bên, thêm chế độ chỉ đọc, thêm `ReadingView`), `src/renderer/src/features/chapter/` (workspace hai pane, nạp bản dịch trong `useChapterScreen`), `App.tsx` (truyền nút tập trung).
- **Dữ liệu và IPC:** không đổi schema, không thêm kênh; bản dịch đã đọc/ghi được qua `text:get`/`text:save` với `side = 'target'`.
- **Tài liệu:** `current-state.md`, `roadmap.md`, `backlog.md` (thêm `sentence-mode`, `reading-view-markdown`; `translation-editor` chuyển sang đã triển khai), `validation.md` (ca IME cho bên dịch, số đo hai pane), `decisions.md` ghi cách thể hiện "bản gốc chỉ đọc", `changelog.md`.
