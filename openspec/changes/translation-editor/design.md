## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có từ `source-editor` và ràng buộc cách làm:

- **Editor và phiên lưu:** `SourceEditor` (một khung CodeMirror kèm thanh trạng thái và nút Lưu), `EditorSession` (lưu, hàng đợi, xung đột, gán ID), ánh xạ segment, `leaveGuard` (một "guard" đăng ký cho cả màn). Mỗi `EditorSession` giữ **một** văn bản của **một** bên với revision riêng; kho đã có `text:get`/`text:save` cho cả `source` và `target` và revision riêng từng bên.
- **Màn chương** (`ChapterScreen`) là một cột giữa trang (`max-w-[960px]`, trang cuộn), đã có trạng thái chưa có bản gốc, hộp thoại nhập và "Thay bản gốc". `useChapterScreen` mới nạp bản gốc.
- **Khung ứng dụng** (`AppShell`): thanh bên ẩn/hiện bằng nút và Ctrl+B (`sidebarOpen` ở `App.tsx`); vùng nội dung là `main` cuộn dọc.
- **Quyết định sản phẩm** ([decisions](../../../docs/handbook/product/decisions.md)): Toàn văn là hai văn bản dài gốc/dịch có thể lệch số dòng, không số nối hay đường nối; bản gốc chỉ đọc trong luồng dịch thường, sửa bản gốc là thao tác riêng; Reading view riêng chứ chưa Live Preview. Nghiên cứu ([segment-editors](../../../docs/handbook/research/segment-editors.md)) cho thấy các CAT app dựng toàn văn từ segment; Mira đi hướng ngược lại (văn bản là gốc, segment là chỉ mục bên trong) nên không vẽ liên kết cho tới khi có căn chỉnh.
- Bản dịch hiện chỉ do người dùng gõ hoặc dán (chưa có job AI), nên chưa có liên kết giữa segment gốc và segment dịch.

## Goals / Non-Goals

**Goals:**
- Một màn Toàn văn dùng được ngay để viết, dán và soát bản dịch cạnh bản gốc, trên nền editor đã kiểm chứng.
- Dùng lại một trình soạn thảo cho cả hai bên, không nhân đôi mã lưu, xung đột, chặn rời.
- Bản gốc được bảo vệ mặc định mà vẫn sửa được lỗi khi cần.
- Không thêm kênh IPC, schema hay dependency.

**Non-Goals:** mode Từng câu; job dịch; liên kết/căn chỉnh và tô sáng tương ứng giữa hai bên; cuộn đồng bộ; Markdown trong Reading view; tự lưu định kỳ.

## Decisions

### D1. Một trình soạn thảo cho cả hai bên: `TextEditor`

`SourceEditor` đổi thành `TextEditor` và bớt phần giao diện bao quanh: không còn thanh trạng thái và nút Lưu bên trong (workspace vẽ tiêu đề từng pane và một nút Lưu chung), chỉ giữ thân editor và hai banner xung đột/lỗi (đặt ngay dưới tiêu đề pane, vì chúng nói về đúng bên đó). Component nhận thêm:

- `readOnly` — đổi được lúc đang chạy (D2);
- `onStatusChange(status)` — để pane vẽ trạng thái và workspace cộng dồn "có thay đổi chưa lưu";
- `emptyHint` — gợi ý khi văn bản trống (D5);
- `handleRef` có thêm `getText()` cho Reading view.

Phím Ctrl+S **không còn nằm trong editor**: hai editor mỗi cái nghe phím sẽ lưu hai lần. Workspace nghe một lần và gọi lưu cho cả hai.

Phương án khác: hai component khác nhau cho gốc và dịch. Nhân đôi đúng phần khó nhất (lưu, xung đột, IME) và hai bản sẽ lệch nhau theo thời gian.

### D2. Khóa bản gốc bằng `readOnly` của CodeMirror, không bằng `editable: false`

`EditorState.readOnly` chặn gõ, xóa, dán, kéo thả và IME mà vẫn cho focus, di chuyển con trỏ, chọn và sao chép bằng bàn phím và chuột; `EditorView.editable.of(false)` bỏ cả `contenteditable` nên mất con trỏ và đọc bằng bàn phím kém hơn. Trạng thái nằm trong một `Compartment`, đổi bằng `view.dispatch({ effects: compartment.reconfigure(...) })` lúc người dùng bấm nút, không dựng lại editor nên không mất hoàn tác, con trỏ hay vị trí cuộn. `aria-readonly` cùng nằm trong compartment.

Khóa lại khi còn thay đổi chưa lưu chỉ đổi compartment: văn bản, lịch sử và trạng thái chưa lưu còn nguyên. Hoàn tác khi khóa: không hoạt động (readOnly chặn), đúng với "khóa".

Phương án khác: dựng editor khác (nhẹ hơn) cho chế độ khóa. Thêm một đường mã và mất vị trí khi mở khóa.

### D3. Hai phiên lưu, một trạng thái cộng dồn ở workspace

`ChapterWorkspace` giữ hai `handle` (nguồn và dịch) và hai `status`. "Có thay đổi" = một trong hai `dirty`. "Lưu" = chạy `save()` của **từng pane đang dirty song song** (`Promise.all`; mỗi bên có kho và revision riêng nên không phụ thuộc nhau) và trả kết quả tổng: thành công khi không bên nào `failed`. Lỗi và xung đột hiện trong banner của đúng pane (đã có từ `source-editor`). Guard chặn rời đăng ký **một** guard cho cả màn với `isDirty` = hoặc, `save` = lưu cả hai và đúng khi cả hai không `failed`, `discard` = bỏ thay đổi cả hai bên.

`useChapterScreen` nạp thêm bản dịch (`text:get(..., 'target')`) song song với bản gốc và cung cấp `noteTargetSaved(record)`: cập nhật `target`, cờ `hasTarget` của chương và làm mới tác phẩm để danh sách chương và thư viện theo kịp.

### D4. Bố cục: khung cao bằng vùng làm việc, hai pane tự cuộn

Khi chương có bản gốc, màn không còn là cột giữa cuộn cả trang mà là khung `h-full` gồm hàng đầu (tiêu đề, mode, hành động) và hai pane `grid grid-cols-2` mỗi pane `min-h-0` với thân editor chiếm hết chiều cao còn lại và `.cm-scroller` cuộn riêng (`&` có `height: 100%`). Hai pane **không** đồng bộ cuộn và không ép chiều cao hàng (quyết định "Bố cục"). Trạng thái chưa có bản gốc và hộp thoại nhập giữ nguyên bố cục cũ.

Ở 940 px với thanh bên mở, mỗi pane khoảng 330 px: đọc được nhưng chật; chế độ tập trung (D9) mở rộng. Không xếp dọc ở cửa sổ hẹp: quyết định sản phẩm là hai pane cạnh nhau.

Phương án khác: để trang cuộn và editor cao theo nội dung (như `source-editor`). Hai pane lệch độ dài sẽ kéo nhau và không đọc song song được.

### D5. Gợi ý khi trống là lớp phủ ngoài editor, không phải widget trong editor

`placeholder()` của CodeMirror là widget đặt trong dòng đầu, đúng loại "phần tử sát con trỏ" mà `source-editor` D7 cấm vì dễ gây lỗi IME, và bản dịch trống là chỗ người dùng gõ tiếng Việt đầu tiên. Thay vào đó `TextEditor` theo dõi `doc.length === 0` qua `updateListener` và vẽ một phần tử `<p>` đặt tuyệt đối đè lên vùng văn bản (`pointer-events: none`), nằm **ngoài** DOM của CodeMirror. Nó được nối với ô soạn thảo bằng `aria-describedby` để trình đọc màn hình đọc được, và biến mất khi có chữ.

### D6. Reading view đọc một ảnh chụp của văn bản, và editor vẫn sống ở dưới

Chuyển "Soạn thảo"/"Đọc" **không** huỷ editor: editor ở lại trong DOM (ẩn bằng thuộc tính `hidden` của khung chứa) để giữ nguyên văn bản chưa lưu, lịch sử hoàn tác, con trỏ và phiên lưu. Khi bấm "Đọc", workspace lấy `handle.getText()` một lần làm nội dung cho `ReadingView`. Trong lúc đọc không có gì sửa văn bản (editor ẩn) nên ảnh chụp luôn đúng; thoát đọc không cần đồng bộ ngược.

`ReadingView` là component thuần: mỗi dòng không trống là một đoạn `<p lang>` với `white-space: pre-wrap`; một hay nhiều dòng trống liền nhau thành một khoảng cách; cỡ chữ 15 px, giãn dòng 1,9, cuộn riêng, `tabindex=0` để cuộn bằng bàn phím, `role="region"` với tên "Bản dịch của chương (đọc)". Không phân tích Markdown (Non-Goal); bản dịch có `#` hay `*` hiện nguyên.

Phương án khác: dựng Reading view từ segment. Segment bỏ khoảng trắng đầu dòng và dòng trống, làm mất ngắt đoạn; dùng văn bản thô đơn giản và đúng.

### D7. Dùng lại ánh xạ và chia lại segment cho bản dịch

Bản dịch dùng `segment(text, 'vi')`, `applyEdits`, `resegment` và `EditorSession` y như bản gốc với `lang = 'vi'`. Bản dịch rỗng khởi tạo với revision 0 và không segment; gõ chữ đầu tạo segment mới (không ID) khi chia lại, lưu lần đầu gửi `expectedRev = 0` và kho tạo hàng văn bản. Các ca không có gì đặc biệt cho bản dịch ở tầng dữ liệu.

### D8. Chọn mode bằng `Tabs` có `Từng câu` bị tắt

Điều khiển chọn mode dùng `Tabs` sẵn có với hai tab: "Toàn văn" (đang chọn) và "Từng câu" `disabled`, kèm nhãn "Sắp có" theo quy ước của backlog (mỗi nhãn "Sắp có" phải có mục ở `delivery/backlog.md`: thêm `sentence-mode`). Không có panel cho tab thứ hai.

### D9. Chế độ tập trung dùng lại thanh bên

"Tập trung" gọi chính `onToggleSidebar` của `App.tsx` (cùng trạng thái với Ctrl+B), và nhãn đổi theo `sidebarOpen`. Không thêm trạng thái mới nên không có hai nguồn sự thật; ẩn thanh bên không dựng lại màn nên editor giữ nguyên chữ, con trỏ và chưa lưu.

### D10. Cấu trúc mã

```text
src/renderer/src/features/editor/
  TextEditor.tsx        (đổi tên từ SourceEditor.tsx; readOnly, onStatusChange, emptyHint, getText)
  ReadingView.tsx       đoạn văn đọc liền mạch
src/renderer/src/features/chapter/
  ChapterWorkspace.tsx  hàng đầu, hai pane, nút Lưu chung, Ctrl+S, guard
  EditorPane.tsx        tiêu đề pane, trạng thái, nút khóa hoặc Soạn thảo/Đọc, banner
  useChapterScreen.ts   nạp thêm bản dịch, noteTargetSaved
```

### Số đo trong Electron thật

Đo ngày 2026-10-01 trên bản build (`out/`), dữ liệu tạm qua `MIRA_DATA_DIR`, Electron 44.4.5, Windows 11. Chương thử có hai bên đều 5.000 segment: bản gốc 205.999 ký tự (tiếng Trung), bản dịch 420.999 ký tự (tiếng Việt, dài hơn ngân sách của spec để chặt hơn).

| Phép đo | Ngân sách (spec) | Kết quả |
| --- | --- | --- |
| Mở: bấm chương tới khi cả hai editor có mặt và nhận phím | ≤ 700 ms | 123–141 ms |
| Gõ giữa bản dịch: xử lý mỗi phím (`execCommand` đồng bộ tới khi DOM cập nhật), 300 phím | p95 ≤ 16 ms | p50 1,3 ms, p95 3,7 ms, lớn nhất 6,8 ms |
| Gõ giữa bản gốc (đã mở khóa), 300 phím | p95 ≤ 16 ms | p50 1,2 ms, p95 3,7 ms, lớn nhất 10 ms |
| Lưu cả hai bên (Ctrl+S → cả hai báo "Đã lưu") | giao diện đứng ≤ 200 ms | 214 ms cả vòng, không có tác vụ dài (giao diện không đứng) |

Kiểm tra khác trong Electron thật (đều đạt): pane gốc khóa mặc định (gõ bị chặn, `aria-readonly`), mở khóa rồi khóa lại giữ chữ và trạng thái chưa lưu, gợi ý bản dịch trống biến mất khi có chữ, lưu bản dịch lần đầu rồi chương báo `hasTarget` và tiêu đề hiện số segment của cả hai bên, Ctrl+S lưu cả hai bên, chỉ sửa một bên thì bên kia không bị ghi, Reading view hiện đúng chữ chưa lưu rồi quay lại soạn thảo hoàn tác vẫn dùng được, xung đột bản dịch chỉ hiện ở pane dịch trong khi bản gốc vẫn lưu, hộp chặn rời, nút "Tập trung" ẩn thanh bên mà giữ chữ chưa lưu, 940 px không cuộn ngang ở nền sáng và tối.

## Risks / Trade-offs

- **[Hai editor CodeMirror cùng lúc làm chậm hoặc nhiễu IME]** → Mỗi editor chỉ dựng viewport; đo mở và gõ khi cả hai bên 5.000 segment; chạy lại bảng ca IME riêng cho pane dịch, kể cả ca chuyển pane và ca bản dịch trống.
- **[Pane khóa: hoàn tác vô tác dụng, người dùng tưởng hỏng]** → Dòng trạng thái "Đã khóa, chỉ đọc" nhìn thấy được và nút "Sửa bản gốc" ngay bên cạnh.
- **[Sửa bản gốc làm lệch bản dịch mà chưa có liên kết để đánh dấu]** → Dòng nhắc khi mở khóa nói rõ đây là sửa lỗi chính tả hay sót chữ; việc đánh dấu liên kết khi nội dung segment đổi nằm ở `edited-segment-link-review` (đã ghi trong backlog).
- **[Chật ở 940 px khi thanh bên mở]** → Chế độ tập trung và cho hàng đầu xuống dòng; không xếp dọc vì ngược quyết định hai pane.
- **[Reading view không hiện Markdown]** → Chấp nhận trong change này (cú pháp hỗ trợ chưa đặc tả, ghi `reading-view-markdown` vào backlog); văn bản không bị đổi.
- **[Một bên lưu thành công, bên kia lỗi]** → Mỗi bên có transaction riêng nên trạng thái không nhất quán xuyên hai bên là có thể; giao diện nói rõ bên nào đã lưu, bên nào chưa, và guard chỉ cho tiếp tục khi cả hai thành công.

## Migration Plan

Không đổi schema, IPC hay dữ liệu. Hoàn tác: revert commit; bản dịch đã lưu vẫn hợp lệ (bảng có sẵn). `SourceEditor` đổi tên: các import trong `ChapterScreen` và test cập nhật cùng lúc.

## Open Questions

1. **Tỷ lệ rộng hai pane** (50/50) và có cho kéo chia: chốt khi thử với chương thật; không đổi spec.
2. **Có nhớ trạng thái "Đọc"/"Soạn thảo" và độ rộng pane giữa các lần mở**: để sau, cùng việc nhớ mode (câu hỏi mở ở `first-run.md`).
