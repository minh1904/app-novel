## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có từ `source-editor`/`translation-editor`/`sentence-mode`:

- **`TextEditor`** (`src/renderer/src/features/editor/TextEditor.tsx`): một CodeMirror 6 dùng chung cho cả hai bên, nhận `extensions` dựng một lần lúc mount (component có comment "văn bản đọc một lần, màn remount bằng key để mở văn bản khác" — props như `lang`, `label` không đổi giữa các lần render).
- **`segmentDecorations`**: mẫu mark-decoration đã có cho tô nền segment, dùng `ViewPlugin` + `RangeSetBuilder`, chỉ tính trong `view.visibleRanges`, có khóa khi IME đang gõ (`update.view.composing`). `source-editor` D7 cấm chèn phần tử (widget) sát con trỏ vì phá IME; nguyên tắc này áp cho mọi decoration mới, không riêng segment. *(Cập nhật 2026-10-02: cột số dòng ở lề — ban đầu cũng của `segmentDecorations` — đã bỏ theo yêu cầu người dùng, xem `source-editor` D7.)*
- **`ChapterWorkspace`**: khung hai pane (`grid grid-cols-2`) trong một cột flex, header có hàng nút (Toàn văn/Từng câu, Thay bản gốc, Tập trung, Lưu, Về tác phẩm). `AppShell` có một ô `sidebar` nhận JSX bất kỳ, hiện tại `App.tsx` luôn truyền `LibrarySidebar` không phân biệt màn.
- **`useChapters`** (`features/work/`): hook đã dùng ở `ChaptersArea` của `work-detail-screen`, tự tải danh sách chương theo `workId` qua `window.mira.chapters.list`, có `load`/`chapters`/`reload` và các hành động CRUD.
- **Quy ước minh họa** (`work-detail-screen`): một tính năng chưa triển khai hiện với nhãn "Sắp có", dữ liệu mẫu cố định, không đọc/ghi gì, có mục `id` khớp trong `delivery/backlog.md` và `mockFeatures.ts` (kiểm bằng test).

## Goals / Non-Goals

**Goals:**
- Live Preview nhẹ, an toàn IME, chỉ cho hai cú pháp phổ biến nhất (tiêu đề, đậm).
- Panel "Hỏi AI" chiếm chỗ thật, đúng quy ước minh họa đã có, không cần provider hay IPC mới.
- Sidebar chuyển sang danh sách chương dùng lại dữ liệu/hook đã có, không thêm đường tải dữ liệu mới.

**Non-Goals:** parser Markdown đầy đủ (link, danh sách, nghiêng, lồng nhiều dòng); provider AI thật; "Hỏi AI" ở mode Từng câu; đổi cấu trúc điều hướng cấp tác phẩm; nhớ trạng thái mở/đóng panel hay độ rộng cột giữa các lần mở chương.

## Decisions

### D1. Live Preview chỉ dùng mark decoration, không widget, không replace

`livePreviewDecorations` (`src/renderer/src/features/editor/livePreviewDecorations.ts`) theo đúng khuôn `segmentDecorations`: `ViewPlugin` giữ một `DecorationSet` dựng lại khi `docChanged`/`viewportChanged`, giữ nguyên khi đang compose IME (`update.changes` map thay vì build lại). Tiêu đề: `Decoration.mark` phủ phần tiền tố (`#`/`##`/`###` + khoảng trắng) bằng class mờ, và phủ phần chữ còn lại bằng class cỡ lớn/đậm theo cấp. Đậm: `Decoration.mark` phủ từng cặp `**` bằng class mờ và phần chữ giữa bằng class đậm. Không ký tự nào bị ẩn hay thay thế — đây là khác biệt rõ với Live Preview đầy đủ của Obsidian (ẩn hẳn `#`/`**` khi con trỏ không ở dòng đó), đổi lại để không vi phạm quy tắc "không phần tử sát con trỏ" đã chốt ở `source-editor`.

Phương án khác: dùng `Decoration.replace` hoặc widget để ẩn ký tự cú pháp giống Obsidian thật. Đây đúng là loại decoration mà `source-editor` D7 đã loại vì có ca thật làm mất ký tự gõ đầu của IME; không thử lại ở đây vì rủi ro giống hệt, trong khi Live Preview không phải yêu cầu cốt lõi của bản đầu.

### D2. Quét theo dòng bằng regex trong `visibleRanges`, không parser Markdown

Mỗi dòng trong vùng hiển thị được thử khớp một lần với `HEADING_RE` (`^(#{1,3})(\s+)(?=\S)`); khớp thì cả dòng là tiêu đề, không qua bước 2. Không khớp thì quét `BOLD_RE` (`\*\*([^*\n]+)\*\*`) trên dòng đó. Biến `covered` (theo đúng mẫu của `segmentDecorations.build`) đảm bảo các decoration được thêm vào `RangeSetBuilder` theo thứ tự tăng dần vị trí, kể cả khi `visibleRanges` chồng lấn.

Phương án khác: dùng một thư viện parser Markdown (remark, markdown-it) chạy trên cả văn bản. Quá tốn cho hai cú pháp, phải tự ánh xạ lại vị trí ký tự sang offset của CodeMirror, và kéo theo các cú pháp khác (danh sách, link) chưa có trong phạm vi change này.

### D3. Panel "Hỏi AI" là cột thật của lưới hai pane trong `ChapterWorkspace`, không phải cột thứ ba của `AppShell`

`aiOpen` là state cục bộ của `ChapterWorkspace`; khi bật, `className` của khung hai pane đổi từ `grid-cols-2` sang `grid-cols-[1fr_1fr_320px]` và `AiPanel` được render làm con thứ ba — không dùng `position: fixed`/overlay. Việc này giữ thay đổi gọn trong một màn, không phải sửa `AppShell`/`App.tsx` để thêm một ô cột thứ ba dùng chung cho mọi màn (ô đó chỉ cần cho mode Toàn văn của màn chương).

Phương án khác: nâng `aiOpen` lên `App.tsx`, thêm ô `aiPanel` vào `AppShell` cạnh `sidebar`. Đúng hơn về mặt "giống thanh bên" ở quy mô toàn app, nhưng kéo theo đổi chữ ký của `AppShell` và cách mọi màn khác dùng nó, trong khi chỉ một màn cần. Có thể làm sau nếu panel AI lan sang màn khác.

### D4. Sidebar chọn theo loại màn trong `App.tsx`, dùng lại `useChapters`

Theo đúng mẫu `title`/`content` đã có trong hàm render của `App.tsx`: thêm biến `sidebar` khởi tạo bằng `LibrarySidebar` trước `switch`, gán lại bằng `ChapterNavSidebar` trong nhánh `case 'chapter'`. `ChapterNavSidebar` gọi `useChapters(workId, onWorkChanged)` y hệt cách `ChaptersArea` đang dùng, nên không có đường tải dữ liệu mới và danh sách tự đồng bộ khi một chương được thêm/xóa/đổi tên ở màn khác.

Phương án khác: truyền danh sách chương đã tải sẵn từ `App.tsx` xuống. `App.tsx` hiện chỉ giữ `WorkSummary[]` (không có chương), nên vẫn phải gọi `chapters.list`; dùng lại hook có sẵn đỡ phải tự viết lại load/error/reload.

### D5. Nội dung "Hỏi AI" theo đúng khuôn minh họa đã có

`AiPanel` dùng `SOON_LABEL` và nút `disabled` cho mọi hành động (Dịch lại, Viết tự nhiên hơn, Tra từ, Ghi chú, Áp dụng, Chèn vào bản dịch, Sao chép, Gửi), giống `ImportTxtMockDialog`. Thêm `aiPanel` vào `MOCK_FEATURES` (`id: 'ai-chat-panel'`, khớp `backlog.md`) để bài test `mockFeatures.test.ts` giữ được tính nhất quán minh họa ↔ backlog.

### D6. Nhãn xem trước Ngữ cảnh là `<span>` tĩnh, không phải nút hay tab

Ba nhãn "Thuật ngữ"/"Xưng hô"/"Văn phong" trong hàng mode dùng chính `SOON_LABEL` và cùng kiểu badge đã có ở `WorkAreaHost` (`bg-selected`, `rounded-[5px]`), nhưng đặt trong `<span>` thường, không phải `TabsTab`/`Button`: không có đích để điều hướng tới mà không vi phạm quy tắc "mở màn chi tiết từ chương luôn bắt đầu ở Chương" đã chốt ở `work-area-navigation`, và không mở hộp thoại minh họa riêng để tránh một minh họa thứ hai cho cùng một khái niệm Ngữ cảnh. Dùng lại `MOCK_FEATURES.contextArea`/`SOON_LABEL` nên không cần thêm mục `mockFeatures` hay dòng backlog mới cho ba nhãn này.

Phương án khác: biến mỗi nhãn thành nút mở một hộp thoại minh họa riêng (giống `ImportTxtMockDialog`). Tạo ra ba minh họa trùng nội dung với `MockAreaPanel` đã có cho khu vực Ngữ cảnh, nhiều việc hơn mà không thêm giá trị.

### Cấu trúc mã

```text
src/renderer/src/features/editor/
  livePreviewDecorations.ts   mark decoration cho #, ##, ###, **đậm**
src/renderer/src/features/chapter/
  AiPanel.tsx                 panel minh họa, cột thứ ba của ChapterWorkspace
  ChapterNavSidebar.tsx       danh sách chương, thay LibrarySidebar khi đang mở chương
  ChapterWorkspace.tsx        state aiOpen, nút/phím tắt, cột thứ ba, prop livePreview
src/renderer/src/
  App.tsx                     biến sidebar chọn theo loại màn
```

### Kiểm chứng

Đo hiệu năng dạng số không phải trọng tâm của change này: decoration chỉ quét các dòng trong `visibleRanges` bằng hai regex đơn giản, không thêm kênh IPC hay vòng lặp dữ liệu lớn (cùng độ phức tạp với `segmentDecorations` đã đo đạt mục tiêu ở `source-editor`). Đã lái thử bản build thật (Electron 44.4.5, `pnpm build` rồi mở qua Playwright `_electron`) với một tác phẩm và hai chương tạo qua `window.mira`: xác nhận bằng ảnh chụp màn hình — sidebar đổi đúng thành danh sách chương khi mở Chương 1, panel "Hỏi AI" mở thành cột thật (hai pane co lại, không đè nội dung) và đóng lại bằng Esc, gõ `# Tieu de to` rồi `**chu dam**` vào pane bản dịch hiện đúng định dạng mô tả ở spec ngay khi gõ. `pnpm typecheck`, `pnpm lint` (không phát sinh lỗi mới, chỉ còn cảnh báo CRLF có sẵn toàn repo), `pnpm build` và `pnpm vitest run` (513/514, một ca đo hiệu năng không liên quan trong `rows.test.ts` chập chờn theo máy) đều qua.

## Risks / Trade-offs

- **[Regex đậm/tiêu đề khớp nhầm trong văn bản không phải Markdown]** → Phạm vi cố tình hẹp (chỉ dòng bắt đầu bằng 1–3 `#` cộng khoảng trắng, chỉ cặp `**…**` không chứa `*` hay xuống dòng bên trong); văn bản dịch thật ít khi tình cờ khớp, và vì không ẩn ký tự nên người dùng luôn thấy rõ vì sao một đoạn được tô đậm.
- **[Cột thứ ba làm hai pane quá hẹp ở cửa sổ 940 px]** → Panel rộng cố định 320px; ở cửa sổ hẹp hai pane còn lại vẫn xuống dòng bình thường (không cuộn ngang) nhưng sẽ chật hơn so với khi tắt panel — chấp nhận vì đây là thao tác tạm thời, đóng lại ngay khi không cần.
- **[Người dùng tưởng "Hỏi AI" là tính năng thật vì chiếm chỗ như một panel thật]** → Nhãn "Sắp có" ở đầu panel, mọi nút hành động `disabled`, và một dòng chữ cuối panel nói rõ đây là dữ liệu mẫu — theo đúng mức cảnh báo đã dùng cho các minh họa khác.
- **[Sidebar đổi đột ngột có thể làm người dùng mất phương hướng lúc mới chuyển màn]** → Không có gì thay đổi về animation/state ngoài quy ước; đây là hành vi đã được xác nhận qua wireframe trước khi dựng.

## Migration Plan

Không đổi schema, IPC hay dữ liệu đã lưu. Không có cờ tính năng. Hoàn tác: revert commit; không có dữ liệu cần dọn vì `AiPanel` không ghi gì và `ChapterNavSidebar` chỉ đọc qua `useChapters` đã có.

## Open Questions

1. **Có nhớ trạng thái mở/đóng panel "Hỏi AI" và độ rộng cột giữa các lần mở chương không**: để sau, cùng câu hỏi tương tự đã mở ở `translation-editor` (nhớ mode, độ rộng pane).
2. **Panel "Hỏi AI" có nên xuất hiện ở mode Từng câu không, hình dạng nào**: chưa cần tới khi có provider thật; ghi nhận trong backlog, không chặn change này.
