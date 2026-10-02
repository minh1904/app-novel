## Context

Nền đã có (xem `proposal.md` cho lý do, `openspec/changes/editor-redesign/design.md` cho khuôn gốc):

- `livePreviewDecorations.ts`: `ViewPlugin` + `RangeSetBuilder`, quét từng dòng trong `view.visibleRanges` bằng regex, chỉ dùng `Decoration.mark` (tô class CSS lên ký tự đã có), không ẩn/thay ký tự, giữ nguyên khi `update.view.composing`. Đây là ranh giới cứng do `source-editor` D7 đặt ra: có ca lỗi thật mất ký tự gõ đầu của IME khi decoration chèn/ẩn phần tử sát con trỏ.
- `content-model`: văn bản là chuỗi Markdown thuần, segment neo theo vị trí UTF-16 trong chuỗi đó; không có khái niệm blob/tệp đính kèm.
- `work-storage`: dữ liệu một tác phẩm nằm trong đúng một tệp; renderer chỉ được chạm dữ liệu qua API có kiểu do main process cung cấp; mọi thao tác lưu/đọc phải hoạt động không cần mạng; chỉ báo "đã lưu" khi dữ liệu đã bền xuống đĩa.
- `ChapterWorkspace`/`TextEditor`: hai pane nguồn (readOnly)/dịch cạnh nhau ở mode Toàn văn; `TextEditor` dựng `extensions` một lần lúc mount.

Nghiên cứu Obsidian (help.obsidian.md, 2026-10-02) cho thấy hai điểm không thể bê nguyên:
1. Live Preview thật của Obsidian ẩn hẳn ký tự cú pháp bằng `Decoration.replace`/widget khi con trỏ rời dòng — đúng loại decoration mà `source-editor` D7 đã loại.
2. Ảnh của Obsidian là tệp rời trong thư mục đính kèm của vault — không có "vault thư mục" trong Mira, chỉ có một tệp dữ liệu mỗi tác phẩm.

## Goals / Non-Goals

**Goals:**
- Mở rộng Live Preview sang 4 cú pháp thường gặp khi dịch văn xuôi (nghiêng, gạch ngang, trích dẫn, danh sách) mà không đổi nguyên tắc an toàn IME đã chốt.
- Cho phép dán/kéo-thả một ảnh vào bản dịch, lưu bền trong đúng tệp dữ liệu tác phẩm, hiển thị lại đúng ảnh đó khi mở lại tác phẩm.
- Giữ mọi thao tác hoạt động không cần mạng, đúng tinh thần `work-storage`.

**Non-Goals:**
- Ẩn ký tự cú pháp khi con trỏ rời dòng (Live Preview đầy đủ kiểu Obsidian) — vẫn ngoài phạm vi, lý do như `editor-redesign` D1.
- Bảng, callout, công thức toán, mermaid, footnote, comment `%% %%`, bold+italic lồng nhau, task list `- [ ]`.
- Ảnh từ URL ngoài, embed PDF/audio/video/note, thư mục đính kèm tuỳ chỉnh, caption, click-to-zoom toàn màn hình, kéo-thả đổi vị trí ảnh đã chèn, dọn ảnh mồ côi tự động.
- Mode Từng câu và pane bản gốc: không đổi.

## Decisions

### D1. Bốn cú pháp mới dùng đúng khuôn mark-decoration/regex-theo-dòng của `editor-redesign` D1/D2

Nghiêng: `*x*`/`_x_` (thử sau khi đã loại trừ khớp `**`/`__` của quy tắc đậm, để không nuốt nhầm cặp đậm thành hai cặp nghiêng lồng nhau). Gạch ngang: `~~x~~`. Trích dẫn: dòng bắt đầu bằng `>` theo sau khoảng trắng — tô vạch dọc + thụt lề cho phần còn lại của dòng, dấu `>` và khoảng trắng mờ đi, không ẩn. Danh sách: dòng bắt đầu bằng `-`/`*`/`+` hoặc `<số>.` theo sau khoảng trắng — tô dấu đầu dòng mờ hơn, không vẽ lại thành bullet thật (không chèn phần tử, giữ đúng ký tự đã gõ). Trích dẫn và danh sách vẫn chỉ `Decoration.mark` — ẩn hẳn dấu đầu dòng sẽ mất luôn dấu hiệu "đây là danh sách/trích dẫn" vì không có gì thay thế, nên giữ nguyên mờ-nhưng-hiện. Không parser Markdown đầy đủ — mỗi dòng thử khớp tuần tự một tập regex giống `HEADING_RE`/`BOLD_RE` hiện có.

Phương án khác: dùng một parser Markdown thật (remark/markdown-it) để xử lý đồng thời nhiều cú pháp lồng nhau (ví dụ *nghiêng trong* **đậm**). Bị loại vì quá tốn cho văn xuôi dịch (lồng cú pháp sâu hiếm gặp) và phải tự ánh xạ lại offset ký tự sang vị trí CodeMirror — đúng lý do `editor-redesign` D2 đã loại.

*(Cập nhật 2026-10-02, theo yêu cầu trực tiếp của người dùng sau khi thử bản đầu: đậm/nghiêng/gạch ngang đổi sang ẩn hẳn dấu khi con trỏ rời khỏi đúng vùng đó — xem D1b bên dưới, thay cho phần "không `Decoration.replace`" đã viết ở trên cho ba cú pháp này.)*

### D1b. Đậm/nghiêng/gạch ngang ẩn hẳn dấu khi con trỏ rời khỏi span — dùng lại đúng khuôn an toàn IME của D2 (ảnh)

Người dùng thử bản Live Preview đầu (chỉ mờ dấu, không ẩn) rồi yêu cầu trực tiếp: ẩn hẳn `**`/`*`/`_`/`~~` khi rời con trỏ khỏi đoạn đó, giống Live Preview thật của Obsidian — đúng kiểu decoration mà `source-editor` D7 và bản đầu của D1 ở trên đã từ chối cho văn bản gõ tay. Thay vì giữ nguyên từ chối, áp dụng lại đúng lý lẽ đã dùng cho widget ảnh ở D2: an toàn không phải vì "văn bản hay ảnh" mà vì **decoration chỉ ẩn cho một span đã hoàn chỉnh (đủ cặp mở/đóng) và con trỏ/selection không chạm vào span đó** (`selectionTouches`, dùng chung với `imageEmbedDecorations`). Cụ thể:

- Span chưa đủ cặp (mới gõ `**` mở, chưa gõ `**` đóng) không khớp regex → không có gì để ẩn; người dùng gõ bình thường, thấy đúng ký tự đang gõ, không khác hôm nay.
- Con trỏ đang ở bất kỳ đâu trong khoảng `[start, end]` của span (kể cả đúng biên) → dấu hiện mờ như bản đầu, không ẩn. Đang gõ chữ bên trong `**...**` luôn thỏa điều kiện này vì con trỏ đang ở giữa span.
- Chỉ khi con trỏ **rời hẳn** khỏi span (gõ tiếp sang ký tự khác, bấm phím mũi tên, click đi chỗ khác) thì lần dựng lại decoration kế tiếp mới ẩn cặp dấu.
- Trong lúc IME đang compose (`update.view.composing`), toàn bộ plugin bỏ qua việc dựng lại như trước — không đổi gì ở đây, nên hành vi ẩn/hiện không bao giờ xảy ra giữa lúc một ký tự đang được ghép.

Tiêu đề, trích dẫn, danh sách **không** đổi theo hướng này (xem D1): ẩn dấu đầu dòng làm mất luôn dấu hiệu là tiêu đề/danh sách/trích dẫn mà không có gì thay thế, khác với `**`/`*` nơi phần chữ bên trong tự nó đã đủ thấy "đây là một từ được đánh dấu" kể cả khi dấu ẩn.

**Rủi ro IME vẫn thật và chưa được xác nhận bằng tay**: lý lẽ trên là suy luận từ cùng cơ chế đã dùng an toàn cho ảnh, không phải đã đo trên máy thật với Telex/VNI thật ở ca cụ thể "gõ xong `**chữ**` rồi gõ dấu cách để ra khỏi span". Đây là khác biệt thật so với ảnh: ảnh được chèn qua paste, còn đậm/nghiêng được gõ ký tự trực tiếp qua IME ngay sát vị trí chuyển tiếp ẩn/hiện. Coi là **chưa xong** cho tới khi có người gõ tay thật xác nhận ca này không mất chữ — thêm vào bảng ca IME ở `tasks.md`.

Phương án khác: giữ nguyên mark-only (không ẩn) như bản đầu. An toàn tuyệt đối, đúng hệt lựa chọn đã chốt trước đó, nhưng người dùng đã thử và nói rõ không muốn — không chọn vì đây là yêu cầu trực tiếp, có đường triển khai an toàn hợp lý để thử.

### D2. Widget ảnh an toàn IME vì khác bản chất với widget văn bản

Ảnh bắt buộc phải là widget (`Decoration.replace` phủ cú pháp `![[id|rộng]]` bằng một `<img>` thật) vì không thể "tô màu" để hiện bitmap — đây là điểm duy nhất change này lệch khỏi quy tắc "chỉ mark decoration". Lý do widget này không lặp lại lỗi IME đã gặp:
- Widget chỉ áp dụng cho một dòng cú pháp **đã hoàn chỉnh** (khớp trọn `![[` ... `]]`), không áp dụng khi người dùng đang gõ dở dòng đó — khác hẳn ca lỗi cũ (decoration dựng lại giữa lúc đang compose một ký tự IME).
- Ảnh được **chèn qua paste/drop**, không gõ qua IME — không có chuỗi composing nào cần bảo toàn tại vị trí đó.
- Khi con trỏ/selection chạm vào vùng `![[id|rộng]]` (ví dụ người dùng bấm vào giữa để sửa số rộng hoặc xoá), widget nhường chỗ cho văn bản thô y hệt cách `segmentDecorations` đã xử lý vùng đang được sửa — giữ nguyên nguyên tắc "không phần tử sát con trỏ khi đang nhập", chỉ khác đối tượng (ảnh thay vì chữ).

Phương án khác: hiện ảnh ở một panel xem trước riêng, cú pháp `![[id]]` vẫn hiện dạng chữ thô trong pane. An toàn IME tuyệt đối nhưng không còn là "thấy ảnh ngay trong lúc viết" — mất đúng giá trị mà người dùng đang hỏi (so với Obsidian), nên không chọn.

### D3. Lưu ảnh dạng blob trong tệp dữ liệu tác phẩm, qua IPC kiểu mới

Thêm kênh `images.put(workId, bytes, mime) → imageId`, `images.get(workId, imageId) → bytes`, `images.delete(workId, imageId)` theo đúng khuôn các kênh `chapters.*` đã có (chỉ main process đọc/ghi tệp, renderer chỉ gọi API có kiểu). `work-storage` cần một khu vực lưu blob mới trong tệp dữ liệu — đổi phiên bản schema và nâng cấp theo đúng quy tắc "Nâng cấp schema an toàn" đã có (nâng cấp nguyên tử, tệp phiên bản mới hơn thì ứng dụng cũ từ chối mở).

Phương án khác: lưu ảnh thành tệp rời cạnh tệp dữ liệu tác phẩm (gần giống thư mục đính kèm của Obsidian). Bị loại vì trái thẳng yêu cầu hiện có của `work-storage` ("dữ liệu của một tác phẩm SHALL nằm trong đúng một tệp riêng") — đổi yêu cầu đó ảnh hưởng toàn bộ cơ chế sao lưu/khôi phục (`work-backup`) ngoài phạm vi change này.

### D4. Cú pháp nhúng dùng ID nội bộ, không dùng tên file

`![[<uuid>]]` hoặc có hậu tố rộng `![[<uuid>|300]]`. Obsidian dùng tên file vì ảnh là tệp thật trong vault có thể trùng tên; Mira không có khái niệm tên file cho ảnh (ảnh là blob có ID), nên dùng ID tránh nhầm lẫn và tránh và đụng độ khi hai ảnh khác nhau vô tình cùng tên lúc dán.

### D5. Resize bằng kéo góc, chỉ đổi chiều rộng, giữ tỉ lệ

Kéo góc dưới-phải ghi lại số nguyên px vào hậu tố `|rộng`; chiều cao luôn tính theo tỉ lệ gốc của ảnh. Không hỗ trợ `|rộng x cao` (đổi tỉ lệ) như Obsidian vì thêm một chiều điều khiển không cần thiết cho ảnh minh hoạ trong một chương truyện.

### D6. Nén ảnh phía renderer trước khi gửi IPC

Trước khi gọi `images.put`, renderer resize ảnh về cạnh dài nhất tối đa 2000px và encode lại (giữ định dạng gốc nếu nằm trong danh sách chấp nhận, ngược lại encode sang PNG/JPEG) trước khi gửi bytes qua IPC — tránh lưu nguyên ảnh gốc cỡ chục MB từ máy ảnh/điện thoại vào tệp dữ liệu.

### D7. Thu hẹp định dạng ảnh chấp nhận so với Obsidian

Chỉ nhận `.png .jpg .jpeg .gif .webp`. Bỏ `.svg` (có thể chứa script, rủi ro nếu render trực tiếp trong renderer) và `.avif .bmp` (ít gặp trong luồng dán từ clipboard/trình duyệt, không đáng thêm độ phức tạp kiểm tra).

### D8. Phím tắt Ctrl+B cho đậm — khớp vào `keymap` của CodeMirror, không thêm thư viện phím tắt

Người dùng báo lỗi: bấm Ctrl+B trong pane bản dịch lại đóng/mở thanh bên thay vì in đậm, và yêu cầu "nghiên cứu xem đặt phím tắt như nào, nếu cần thiết thì cài thư viện". Đã khảo sát nguyên nhân và các lựa chọn trước khi sửa.

**Nguyên nhân:** `AppShell.tsx` gắn `window.addEventListener('keydown', ...)` toàn cục cho Ctrl+B, không kiểm tra focus đang ở đâu, nên luôn chạy bất kể con trỏ đang trong CodeMirror hay không. Trong khi đó `TextEditor` chưa hề có binding Ctrl+B nào — không phải do Ctrl+B "ưu tiên sai", mà do chưa có ai nhận phím này ở tầng editor để tranh phần với tầng ứng dụng.

**Nghiên cứu:** đây là vấn đề *phạm vi phím tắt* (scoping), không phải thiếu công cụ bắt phím. Trình duyệt vốn đã có cơ chế chuẩn cho đúng việc này: `keydown` nổi bọt (bubble) từ phần tử đang có focus lên `window`; phần tử cụ thể hơn (ở đây là editor) luôn nhận sự kiện *trước* trình xử lý toàn cục gắn trên `window`. Nếu trình xử lý cụ thể gọi `event.preventDefault()`, trình xử lý toàn cục chỉ cần tự kiểm `event.defaultPrevented` trước khi hành động là tự nhường đúng cách — không cần thư viện quản lý phím tắt nào để làm việc này, vì bản chất là một lớp phần tử có phím tắt *riêng* nằm trong một lớp khác có phím tắt *chung*, và nền DOM đã giải quyết thứ tự ưu tiên đó sẵn. CodeMirror 6 cũng theo đúng mô hình này: `keymap.of([...])` là một extension gắn sự kiện trên gốc DOM của editor; `run` trả `true` thì CodeMirror tự gọi `preventDefault()` cho sự kiện gốc.

**Quyết định:** thêm `keymap.of([{ key: 'Mod-b', run: toggleBold }, { key: 'Mod-i', run: toggleItalic }])` vào `TextEditor` (chỉ khi `livePreview` bật, tức pane bản dịch) — `toggleBold`/`toggleItalic` (`formatCommands.ts`, đổi tên từ `boldCommand.ts` khi thêm Ctrl+I để không còn lệch tên file) đều dựng từ cùng một hàm `wrapToggleEdit(params)` tham số hoá theo `delim` (`'**'` hay `'*'`) — `Command` thuần của CodeMirror, không phải thư viện ngoài. Khi `delim` là `'*'`, hàm tự kiểm trước xem con trỏ có đang nằm trong một đoạn `**đậm**` không; có thì coi như "không tìm thấy nghiêng để gỡ" và bọc thêm một cặp `*` mới thay vì đọc nhầm một dấu `*` của cặp `**` thành dấu nghiêng (sẽ làm hỏng cặp đậm) — nested bold+italic vẫn là non-goal, nhưng tách đúng giữa "không xử lý lồng" và "làm hỏng dữ liệu đã có" là ranh giới cần giữ. Sửa ba trình xử lý toàn cục đang có (`AppShell` Ctrl+B, `ChapterWorkspace` Ctrl+S và Ctrl+K) để kiểm `event.defaultPrevented` trước khi hành động, theo đúng quy ước "handler cụ thể hơn nhận trước, handler chung chỉ chạy nếu phím chưa ai nhận". Nhân tiện sửa `AppShell` chỉ kiểm `event.ctrlKey` (thiếu `event.metaKey`), không nhất quán với hai trình xử lý kia — nay dùng chung `event.ctrlKey || event.metaKey`.

**Phương án khác đã cân nhắc:**
- *Cài một thư viện quản lý phím tắt* (`tinykeys`, `react-hotkeys-hook`, `hotkeys-js`, `mousetrap`...). Bị loại: những thư viện này giải quyết tốt bài toán "nhiều phím tắt rải khắp app, cần một nơi khai báo tập trung", nhưng **không tự giải quyết xung đột với CodeMirror** — CodeMirror có `keymap` riêng của chính nó, một thư viện phím tắt ngoài vẫn phải tự biết tránh né hoặc tích hợp với `keymap` đó, tức là vẫn quay lại đúng cơ chế `defaultPrevented`/DOM-scoping đã có sẵn. Thêm một dependency mới chỉ để bọc lại thứ nền tảng web đã làm đúng là không đáng, và ba trình xử lý hiện có không nhiều tới mức cần một framework quản lý.
- *Gọi `stopPropagation()` ở `toggleBold`/CodeMirror thay vì dựa vào `defaultPrevented`*. CodeMirror không expose cách chèn `stopPropagation()` vào `run` của một `keymap` binding theo hướng sạch; `preventDefault()` + kiểm `defaultPrevented` ở tầng ngoài là cách idiomatic hơn và không cần chỉnh gì phía CodeMirror.

### Cấu trúc mã (dự kiến, chốt ở `tasks.md`)

```text
src/renderer/src/features/editor/
  livePreviewDecorations.ts   thêm regex/mark cho nghiêng, gạch ngang, trích dẫn, danh sách
  imageEmbedDecorations.ts    mới — widget ảnh, đọc bytes qua window.mira.images.get
src/renderer/src/features/chapter/
  ChapterWorkspace.tsx         nối paste/drop ảnh tới TextEditor bên dịch
main (ipc)
  images.put / images.get / images.delete
```

## Risks / Trade-offs

- **[Blob ảnh làm tệp dữ liệu tác phẩm phình to, mở/sao lưu chậm dần]** → giới hạn kích thước mỗi ảnh và tổng số ảnh mỗi tác phẩm (xem spec `image-embed`); nén phía renderer (D6) trước khi lưu.
- **[SVG/định dạng lạ có thể mang script hoặc payload độc hại]** → chỉ nhận raster an toàn (D7), từ chối phần còn lại kèm lý do rõ ràng, không âm thầm bỏ qua.
- **[Widget ảnh chèn ngay sau khi vừa gõ xong một đoạn bên cạnh có thể phá luồng gõ]** → cần bảng ca IME riêng cho change này (giống việc 2.4 của `editor-redesign`): dán ảnh rồi gõ tiếp ngay, gõ Telex/VNI ngay trước/sau một `![[id]]` đã có.
- **[Segment/liên kết neo theo vị trí ký tự, cú pháp `![[id|rộng]]` làm lệch offset so với bản gốc không có ảnh]** → cú pháp nhúng vẫn chỉ là một chuỗi ký tự bình thường trong văn bản dịch, không khác gì một từ dài; `content-model`/segment mapping không cần đổi vì vẫn tính theo UTF-16 của chuỗi đã có ảnh.
- **[Nâng cấp schema `work-storage` để thêm khu vực blob có thể lỗi giữa chừng trên tệp cũ]** → theo đúng quy tắc "Nâng cấp schema an toàn" đã có: nâng cấp nguyên tử, lỗi giữa chừng giữ nguyên phiên bản cũ và báo lỗi, không để tệp ở trạng thái nửa vời.
- **[Ẩn dấu `**`/`*`/`_`/`~~` (D1b) đúng lúc con trỏ vừa rời span, ngay sau khi gõ xong bằng Telex/VNI, có thể lặp lại ca lỗi IME cũ]** → thiết kế chặn hai điều kiện (span phải hoàn chỉnh, con trỏ phải thật sự rời) để tránh đúng lỗi cũ (decoration dựng lại giữa lúc compose), nhưng đây vẫn là **rủi ro chưa đo bằng tay thật**, khác hẳn các decoration khác trong file này (tất cả đều đã verify hoặc không gõ qua IME). Chặn: coi D1b là chưa xong tới khi có ca IME thật xác nhận "gõ xong `**chữ**` rồi gõ dấu cách/ký tự khác ngay sau" không mất hay sai ký tự.

## Migration Plan

Tệp dữ liệu tác phẩm cũ (chưa có khu vực blob) nâng cấp nguyên tử lên phiên bản schema mới khi mở lần đầu sau khi cài bản có change này, theo đúng cơ chế `work-storage` đã có; tác phẩm không có ảnh nào vẫn mở bình thường, khu vực blob rỗng. Không có cờ tính năng. Hoàn tác: revert code; tệp đã nâng cấp schema vẫn đọc được bằng bản cũ hơn chỉ nếu bản đó biết bỏ qua khu vực mới — nếu không, coi như giới hạn đã biết của cơ chế nâng cấp schema hiện có (bản cũ hơn từ chối mở tệp phiên bản cao hơn), không phải vấn đề riêng của change này.

## Open Questions

1. **Sao chép một đoạn có `![[id]]` sang chương/tác phẩm khác**: ảnh có nên đi theo (copy blob) hay chỉ copy cú pháp và vỡ link? Chưa cần quyết ở bước propose này vì không chặn tasks đầu tiên (paste/drop trong cùng một chương); ghi nhận cho backlog.
2. **Dọn ảnh mồ côi** (không còn `![[id]]` nào trỏ tới sau khi người dùng xoá dòng chứa ảnh): để sau, không chặn specs/tasks của change này — ảnh mồ côi chỉ chiếm thêm dung lượng, không gây sai dữ liệu.
