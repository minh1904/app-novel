# Nghiên cứu: tính năng Markdown của Obsidian, đối chiếu với Mira

Cập nhật: 2026-10-02. Phạm vi: tài liệu chính thức Obsidian (help.obsidian.md — xem [S25](sources.md)) cho cú pháp Markdown, Live Preview, nhúng/resize ảnh, cộng với khảo sát mã nguồn Mira hiện tại ([`livePreviewDecorations.ts`](../../../src/renderer/src/features/editor/livePreviewDecorations.ts), [`imageEmbedDecorations.ts`](../../../src/renderer/src/features/editor/imageEmbedDecorations.ts), [`boldCommand.ts`](../../../src/renderer/src/features/editor/boldCommand.ts)). Đây là bảng kiểm để quyết định làm tiếp gì, không phải cam kết roadmap — xem [backlog](../delivery/backlog.md) cho thứ đã lên kế hoạch thật.

Ký hiệu trạng thái: ✅ Đã có · ◐ Một phần · ☐ Chưa có · — Không áp dụng (không hợp mô hình dữ liệu hoặc mục tiêu của Mira, xem giải thích ở Ghi chú).

## A. Định dạng chữ trong dòng

| Tính năng | Cú pháp Obsidian | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Đậm | `**x**` / `__x__` | ✅ | Live Preview ẩn hẳn cặp dấu khi con trỏ rời khỏi span đã gõ xong — loại cú pháp duy nhất ẩn, không chỉ mờ (lý do IME ở `design.md` D1b của `editor-rich-text-images`). Ctrl+B bật/tắt. |
| Nghiêng | `*x*` / `_x_` | ✅ | Cùng cơ chế ẩn/hiện như đậm. Ctrl+I bật/tắt (2026-10-02); chỉ chèn `*x*`, không tự dùng `_x_`. |
| Đậm + nghiêng lồng | `***x***` | ☐ | Non-goal đã ghi: không xử lý cú pháp lồng nhau. |
| Gạch ngang | `~~x~~` | ✅ | Cùng cơ chế ẩn/hiện như đậm. **Chưa có phím tắt.** |
| Highlight | `==x==` | ☐ | Chưa làm. |
| Mã nội tuyến | `` `x` `` | ☐ | Chưa làm. |
| Comment (ẩn ở reading view) | `%%x%%` | ☐ | Non-goal đã ghi. |
| Ký tự thoát | `\*`, `\#`... | — | Không có cú pháp nào hiện cần thoát theo nghĩa Obsidian; văn bản lưu nguyên ký tự người dùng gõ. |

## B. Cấu trúc khối

| Tính năng | Cú pháp Obsidian | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Tiêu đề | `#` … `######` (6 cấp) | ◐ | Live Preview chỉ nhận 3 cấp đầu (`#`/`##`/`###`); mark mờ, không ẩn (cố ý — xem phần Live Preview bên dưới). |
| Trích dẫn | `> x` | ✅ | Vạch dọc + thụt lề; dấu `>` mờ, không ẩn. |
| Danh sách gạch đầu dòng | `-`/`*`/`+` | ✅ | Dấu đầu dòng mờ, không vẽ bullet thật. |
| Danh sách đánh số | `1.` | ✅ | Cùng extension với danh sách gạch đầu dòng. |
| Danh sách công việc | `- [ ]` / `- [x]` | ☐ | Non-goal đã ghi. |
| Danh sách lồng (thụt dòng) | thụt Tab | ◐ | Không bị chặn gõ, nhưng không có hiển thị hay xử lý riêng cho cấp lồng — chưa kiểm chứng rõ ràng. |
| Khối mã | ```` ``` ```` | ☐ | Chưa làm. |
| Đường ngang | `---`/`***`/`___` | ☐ | Chưa làm. |
| Bảng | `\| \| \|` | ☐ | Chưa làm. |
| Footnote | `[^1]` | ☐ | Chưa làm. |
| Ngắt dòng trong đoạn | 2 dấu cách cuối dòng / Shift+Enter | — | Enter luôn chèn một LF; editor không phân biệt "đoạn" và "dòng" kiểu CommonMark, nên khái niệm này chưa áp dụng được. |

## C. Liên kết & tham chiếu

| Tính năng | Cú pháp Obsidian | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Wikilink (liên kết nội bộ) | `[[Note]]` | ☐ | Mira không có khái niệm nhiều "note" liên kết nhau — một tác phẩm là danh sách chương tuyến tính, không phải mạng ghi chú. Làm được nhưng cần định nghĩa lại "liên kết tới đâu" trước. |
| Alias | `[[Note\|text]]` | — | Phụ thuộc wikilink. |
| Heading/block link | `[[Note#Heading]]`, `[[Note#^id]]` | — | Phụ thuộc wikilink. |
| Link ngoài | `[text](url)` | ☐ | Gõ được (lưu nguyên văn) nhưng chưa có Live Preview hay kiểm tra gì cho cú pháp này. |
| Tag | `#tag`, `#parent/child` | ☐ | Chưa làm. |

## D. Nhúng ảnh và tệp

| Tính năng | Cú pháp Obsidian | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Nhúng ảnh | `![[image.png]]` | ✅ | Cú pháp riêng `![[uuid]]` — ID nội bộ, không phải tên tệp, vì ảnh là blob trong tệp `.mira` chứ không phải tệp thật trong vault (lý do ở `design.md` D4). |
| Resize bằng kéo góc | hậu tố `\|300` | ✅ | Kéo góc dưới-phải, ghi lại `\|rộng`, chỉ đổi chiều rộng (giữ tỉ lệ). |
| Dán/kéo-thả ảnh | — | ✅ | Nén phía renderer (tối đa 2000px, 8 MB) trước khi lưu; PNG/JPEG/GIF/WebP. |
| Ảnh từ URL ngoài | `![alt](url)` | ☐ | Cố ý chưa làm — cần mạng để hiển thị, trái tinh thần "không cần mạng" của `work-storage`. |
| Nhúng note khác | `![[Note]]` | — | Không có khái niệm nhiều note để nhúng lẫn nhau. |
| Nhúng PDF/audio/video | `![[file.pdf]]` | ☐ | Chưa làm. |

## E. Cú pháp nâng cao

| Tính năng | Cú pháp Obsidian | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Callout | `> [!note]` | ☐ | Chưa làm. |
| Công thức toán (LaTeX) | `$x$` / `$$x$$` | ☐ | Chưa làm. |
| Sơ đồ Mermaid | ```` ```mermaid ```` | ☐ | Chưa làm. |
| HTML thô | thẻ HTML trực tiếp | ☐ | Cố ý chưa làm — render HTML thô trong renderer là rủi ro XSS nếu sau này có nội dung từ nguồn không tin cậy (ví dụ chia sẻ tác phẩm). |

## F. Trải nghiệm soạn thảo

| Tính năng | Obsidian làm gì | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Live Preview (ẩn cú pháp khi con trỏ rời) | Ẩn hẳn mọi cú pháp khi không focus dòng đó | ◐ | Chỉ đậm/nghiêng/gạch ngang ẩn hẳn; tiêu đề/trích dẫn/danh sách chỉ mờ, luôn hiện (ẩn dấu đầu dòng sẽ mất luôn dấu hiệu "đây là gì" mà không có gì thay thế). |
| Reading view | Render Markdown đầy đủ, chỉ đọc | ◐ | Có view riêng (`ReadingView.tsx`) nhưng hiện văn bản thuần theo đoạn — `#`, `*` vẫn hiện nguyên ký tự, chưa render thật. |
| Source mode | Luôn hiện markdown thô | — | Không tách riêng khỏi Live Preview; bản gốc (readOnly) là một khái niệm khác, không phải "source mode" của bản dịch. |
| Phím tắt định dạng | Ctrl+B, Ctrl+I, Ctrl+K (link)... | ◐ | Ctrl+B và Ctrl+I đã có (`formatCommands.ts`, cùng một hàm tham số hoá theo dấu bọc — xem `design.md` D8), cùng chặn không đọc nhầm `**` thành `*` lồng bên trong. Không làm phím cho gạch ngang (không có quy ước bàn phím chuẩn). **Ctrl+K đã bị dùng cho panel "Hỏi AI"**, không còn trống cho link. |
| Backlinks panel | Danh sách note trỏ tới note hiện tại | — | Không có liên kết nhiều note để truy ngược. |
| Outline (mục lục theo heading) | Cây heading của note, bấm nhảy tới | ☐ | Chưa làm — có thể hữu ích để nhảy giữa các đoạn dài trong một chương. |
| Graph view | Mạng lưới note liên kết | — | Không hợp mô hình một tác phẩm → nhiều chương tuyến tính. |
| Quick switcher | Ctrl+O mở nhanh note bất kỳ | — | Có ô tìm chương theo tên nhưng khác mục đích (điều hướng thư viện, không phải chuyển note tự do). |
| Tìm trong văn bản đang mở | Ctrl+F trong note | ☐ | Chưa làm thật — có ô tìm/lọc minh họa "Sắp có" ở mode Từng câu (`SentenceFilterToolbarMock`), không đọc dữ liệu thật. |

## Kết luận phục vụ thiết kế Mira

1. **Phần "— Không áp dụng" không phải nợ kỹ thuật, mà là ranh giới mục tiêu thật.** Wikilink, backlinks, graph view, quick switcher, nhúng note đều dựa trên tiền đề "nhiều ghi chú liên kết nhau" của Obsidian — Mira không phải app ghi chú, mà là một tác phẩm dịch với chương tuyến tính. Bê các tính năng này sang sẽ cần bịa ra một mô hình dữ liệu mới (ghi chú rời, liên kết chương-tới-chương) không ai yêu cầu; không nên tự thêm vào roadmap chỉ vì Obsidian có.
2. **Phần dễ làm nhất tiếp theo là hoàn thiện đúng những gì đã có**, không phải mở rộng cú pháp mới:
   - Phím tắt Ctrl+I (nghiêng) và có thể một phím cho gạch ngang — cùng khuôn `boldCommand.ts` đã có, chỉ đổi delimiter.
   - Outline theo heading trong một chương dài — hữu ích thật cho dịch truyện (nhảy giữa các đoạn), không phụ thuộc mô hình nhiều-note.
   - Tìm trong văn bản đang mở — đã có minh họa "Sắp có", là ứng viên tự nhiên để làm thật.
3. **Phần có giá trị nhưng tốn công, cân nhắc sau:** Reading view render Markdown thật (hiện chỉ đọc đoạn thuần); bảng, code block, highlight — ít gặp trong văn xuôi dịch nhưng không phải không bao giờ cần (ví dụ truyện có đoạn trích dẫn hệ thống/UI game dùng code block).
4. **Phần cố ý không làm, đã có lý do ghi trong design.md, đừng tự ý mở lại nếu không có yêu cầu mới:** HTML thô (rủi ro XSS), ảnh từ URL ngoài (cần mạng), comment `%%%%` và task list (phạm vi hẹp có chủ đích), đậm+nghiêng lồng nhau (không đáng độ phức tạp parser cho văn xuôi).
