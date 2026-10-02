## Why

Người dùng muốn biết khung soạn thảo đã gần với Obsidian tới đâu. Khảo sát cho thấy phần gần nhất hiện có — Live Preview nhẹ của `editor-redesign` — mới phủ đúng hai cú pháp (`#`/`##`/`###`, `**đậm**`) và không có gì cho ảnh; `editor-redesign` đã chủ ý liệt "Markdown đầy đủ (link, danh sách, nghiêng, lồng cú pháp nhiều dòng)" vào Không thuộc change đó. Nghiên cứu tài liệu chính thức Obsidian (help.obsidian.md, 2026-10-02) cho hai mảng "nhập text" và "nhập ảnh" làm cơ sở quyết định tập con nào nên đưa vào Mira, vì sao, và tập con nào cố tình bỏ — đặc biệt vì cách Obsidian làm Live Preview thật (ẩn hẳn ký tự cú pháp khi con trỏ rời dòng, dùng `Decoration.replace`/widget) **xung đột trực tiếp** với quy tắc an toàn IME đã chốt ở `source-editor` D7 (cấm decoration ẩn/thay ký tự sát con trỏ, vì có ca lỗi thật làm mất ký tự gõ đầu của bộ gõ tiếng Việt/Trung/Nhật). Ảnh cũng không có chỗ đứng sẵn: `content-model` hiện chỉ định nghĩa văn bản là chuỗi Markdown thuần, và `work-storage` lưu dữ liệu một tác phẩm trong đúng một tệp — khác hẳn mô hình vault-thư-mục của Obsidian — nên việc nhúng ảnh phải thiết kế lại cách lưu, không thể copy nguyên cách Obsidian làm.

## What Changes

- **Mở rộng Live Preview nhẹ cho bản dịch** (tiếp nối `full-text-editor`): thêm bốn cú pháp theo đúng khuôn mark-decoration/regex-theo-dòng đã có (không ẩn, không thay ký tự, không parser Markdown đầy đủ) — *nghiêng* (`*x*`/`_x_`), ~~gạch ngang~~ (`~~x~~`), trích dẫn (`> x`, tô vạch dọc + thụt lề, không ẩn dấu `>`), danh sách gạch đầu dòng và đánh số (`-`/`*`/`+`, `1.`) tô dấu đầu dòng mờ hơn văn bản thường. Không làm: bảng, callout, công thức toán, sơ đồ mermaid, footnote, comment `%% %%`, chữ đậm+nghiêng lồng nhau, danh sách công việc `- [ ]` — phạm vi quá lớn so với nhu cầu dịch tiểu thuyết, để lại cho backlog.
- **Nhúng ảnh vào bản dịch (mới)**: dán ảnh từ clipboard hoặc kéo-thả tệp ảnh vào pane bản dịch chèn một cú pháp nhúng cục bộ `![[id-ảnh]]`, hiện ngay thành ảnh thật trong Live Preview (widget thay thế dòng cú pháp — khác nguyên tắc "chỉ mark decoration" của text, có Decision riêng giải thích vì sao widget cho ảnh không phá IME trong khi widget cho text thì có). Ảnh lưu dạng blob ngay trong tệp dữ liệu của tác phẩm (không phải tệp rời trong thư mục đính kèm kiểu Obsidian), qua kênh IPC có kiểu mới do main process xử lý, đúng quy tắc "chỉ main process được chạm dữ liệu" của `work-storage`. Hỗ trợ đổi cỡ bằng kéo góc ảnh (ghi lại `|rộng` vào cú pháp) và xoá ảnh. Không làm: ảnh từ URL ngoài (cần mạng, trái tinh thần "không cần mạng" của `work-storage`), thư mục đính kèm tuỳ chỉnh, embed PDF/audio/video/note, caption, click-to-zoom toàn màn hình, kéo-thả đổi vị trí ảnh trong văn bản.
- **Phạm vi áp dụng**: cả hai thay đổi trên chỉ áp dụng cho pane bản dịch ở mode Toàn văn, giống `editor-redesign`; bản gốc (readOnly) và mode Từng câu không đổi.

## Capabilities

### New Capabilities

- `image-embed`: chèn, hiển thị, đổi cỡ và xoá ảnh nhúng trong bản dịch của một chương; lưu trữ ảnh dạng blob trong tệp dữ liệu tác phẩm qua IPC có kiểu.

### Modified Capabilities

- `full-text-editor`: mở rộng Live Preview nhẹ sang nghiêng, gạch ngang, trích dẫn, danh sách (tiếp nối phần Live Preview mà `editor-redesign` đã thêm, chưa archive); thêm chỗ cho widget ảnh hiển thị trong cùng pane.

## Impact

- **Phụ thuộc change khác:** `editor-redesign` (Live Preview, `ChapterWorkspace` ba cột, chưa archive) phải archive trước hoặc cùng lúc; dùng lại `TextEditor`, `livePreviewDecorations.ts`.
- **Code (renderer):** `src/renderer/src/features/editor/livePreviewDecorations.ts` (thêm regex/mark cho nghiêng, gạch ngang, trích dẫn, danh sách), `src/renderer/src/features/editor/imageEmbedDecorations.ts` (mới, widget ảnh), `src/renderer/src/features/editor/TextEditor.tsx` (nhận ảnh qua paste/drop, gọi IPC), `src/renderer/src/features/chapter/ChapterWorkspace.tsx` (nối luồng ảnh).
- **Code (main/preload/IPC):** kênh mới dạng `images.put`/`images.get`/`images.delete` theo khuôn các kênh `chapters.*` đã có; `work-storage` cần một bảng/khu vực blob mới trong tệp dữ liệu tác phẩm (không đổi yêu cầu "đúng một tệp", chỉ thêm loại dữ liệu lưu trong tệp đó).
- **Dữ liệu:** thêm khái niệm "ảnh nhúng" (ID, bytes, mime, kích thước) gắn với tác phẩm; cú pháp `![[id]]` trong chuỗi Markdown của văn bản dịch trỏ tới ảnh này — không đổi hợp đồng `content-model` hiện có (văn bản vẫn là chuỗi Markdown thuần, chỉ thêm một loại dữ liệu đi kèm tác phẩm).
- **Giới hạn:** cần quyết định giới hạn dung lượng/số ảnh mỗi tác phẩm (xem `design.md`) để tránh tệp dữ liệu phình to không kiểm soát, nhất quán với giới hạn kích thước đã có ở `content-model`.
- **Tài liệu:** `decisions.md`, `backlog.md`, `current-state.md`, `changelog.md` cập nhật khi change này được áp dụng (apply), không phải ở bước propose.
