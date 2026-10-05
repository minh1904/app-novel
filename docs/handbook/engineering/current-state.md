# Hiện trạng triển khai

Cập nhật: **2026-10-05** · Trạng thái: quan sát repository và working tree, không phải cam kết tính năng. Cập nhật trang này khi code thay đổi, không dùng roadmap làm bằng chứng đã hoàn thành.

**Module Đề xuất đang triển khai:** Working tree đã thêm schema tác phẩm v7, phiên/lượt chat bền,
đề xuất và checkpoint, thao tác duyệt qua transaction, cùng đường dịch chương theo từng dòng không
trống vào hàng chờ. Composer có hành động Gửi, Tạo đề xuất, Áp dụng thẳng theo lượt; hộp dịch mặc
định Duyệt trước và có lựa chọn Áp dụng thẳng. Đây chưa phải Module 5 hoàn tất: diff trong editor,
đặt vị trí trên bản dịch có chữ, Markdown chat, picker ngữ cảnh và nghiệm thu Electron còn mở. Danh
sách task và tiêu chí nằm ở [OpenSpec](../../../openspec/changes/proposals/tasks.md). Các mục bên
dưới phần lớn mô tả baseline đã commit trước Module 5; không dùng chúng phủ nhận trạng thái working
tree vừa nêu.

**Tab theo tác phẩm đã có trong working tree (2026-10-05):** titlebar mở nhiều truyện, mỗi truyện
một tab và nhớ chương/khu vực; Main lưu phiên tab trong `library.db`, kiểm tra ID khi khôi phục;
editor dirty của tab ẩn vẫn sống, guard đóng tab/thoát xét bản sửa tương ứng. Phiên chat tách theo
truyện và danh sách chương bỏ phản hồi đến muộn. Xem
[module Phiên làm việc](../../modules/workspace/README.md). Module 7 Tác vụ vẫn chưa có JobRunner
bền, batch translation, usage/cost cap hoặc màn Tác vụ thật.

**Hệ thiết kế theo Obsidian đã áp trong working tree (2026-10-05):** token ba tầng (thang trung tính
→ semantic → kích thước component) trong `tokens.css`; thanh trên cùng 40 px cùng màu sidebar,
hover là lớp phủ trong suốt, mục đang mở tô accent 15 %, chữ UI 12/13/15/20/26 px, control 30 px,
bán kính 4/6/12 px, shadow cho menu, dialog chỉ viền. `tokens.test.ts` chặn cỡ chữ, line-height,
radius, shadow tùy ý và `var(--…)` không có trong `tokens.css`. Màn chương có status bar
(`ChapterStatusBar`): số chữ/ký tự bản dịch khi gõ, trạng thái lưu gộp, số đề xuất AI chờ duyệt. Đã chụp bản build sáng/tối (thư
viện, chương, Cài đặt) trên Windows 11; xem [module Hệ thiết kế](../../modules/design-system/README.md).

**Repo hiện tại là bản MVP để thử nghiệm.** Mọi thứ dưới đây chạy được nhưng chưa phải bản hoàn chỉnh; từ [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md) từng module được làm lại hoàn chỉnh theo [kiến trúc AI-first](ai-first-architecture.md) và [lộ trình](../delivery/roadmap.md). Cột **Số phận** cho biết phần đó được *giữ*, *viết lại* hay *gỡ* khi làm lại; tên trong ngoặc là module ở [lộ trình](../delivery/roadmap.md). (Trước lần đổi thứ tự ngày 2026-10-03, trang này ghi module bằng số; bảng đối chiếu số cũ nằm cuối lộ trình.)

Trang này được viết lại ngày 2026-10-03 để thêm cột Số phận và gỡ các ghi chú "cập nhật ngày…" chồng lên nhau. Nội dung kỹ thuật lấy từ các lần đối chiếu code 2026-09-29 đến 2026-10-03 và từ bản cũ của trang này; **không kiểm tra lại từng dòng**. Working tree lúc viết có sửa dở ở `markdownSyntax`, `formatCommands`, `livePreviewDecorations` của editor; trang mô tả bản đã commit.

## Tóm tắt

| Phần | Trạng thái MVP | Số phận |
| --- | --- | --- |
| Desktop: Electron, IPC có kiểu | Chạy | **Giữ**; mở rộng kênh theo từng module |
| UI shell | Chạy | Giữ |
| Tab theo tác phẩm | Chạy trong working tree; lưu/khôi phục vị trí, bảo vệ editor dirty | **Đã triển khai**; xem [module Phiên làm việc](../../modules/workspace/README.md) |
| Thư viện, tác phẩm, chi tiết tác phẩm | Chạy trên kho thật | Giữ |
| Danh sách chương | Chạy, đo tới 5.000 chương | Giữ |
| Nội dung chương: văn bản, revision, segment, liên kết | Chạy | **Viết lại (Gỡ Từng câu)**: bỏ segment, liên kết, nguồn gốc theo câu; thêm dấu AI. Đề xuất và snapshot thêm ở (Đề xuất) |
| Nhập bản gốc | Chạy | **Viết lại phần chia segment (Gỡ Từng câu)**; giải mã và chuẩn hóa giữ; định nghĩa đoạn đã kiểm chứng (V14 đạt ở Bộ đo) |
| Mode Từng câu | Đã dựng, **đã ẩn** khỏi giao diện | **Gỡ (Gỡ Từng câu)**, bị hủy ở ADR-005 |
| Editor Toàn văn hai pane | Chạy | Giữ; bỏ ánh xạ segment khi gỡ (Gỡ Từng câu) |
| Soạn thảo và ánh xạ segment | Chạy | **Viết lại (Gỡ Từng câu)** thành dấu AI |
| Hỏi AI (chat) | Chạy; có một bằng chứng gọi Gemini thật trong Electron (xem mục Provider), task kiểm chứng chưa đóng | Giữ; kiểm chứng song song (lộ trình), gỡ `targetIds` ở (Gỡ Từng câu) |
| Dịch chương bằng AI | Chạy, vòng lặp lô ở renderer; đã nối Lõi dịch | **Đã hoàn thành Lõi dịch (2026-10-04)**; còn lại Đề xuất và Tác vụ bền trong main |
| Provider và kết nối AI | Chạy: transport + gateway, một adapter `openai-compatible` cung cấp `complete()`, nhiều khóa; model là **mục** có cài đặt riêng | Giữ phần kết nối; lõi dịch đã tách sang `services/ai/translate/`; đơn vị đổi từ segment sang đoạn ở (Đề xuất) |
| Bộ đo chất lượng dịch | Hạ tầng offline đã có; T1/T3 là lớp tùy chọn, T1 chưa hiệu chuẩn live | **Giữ** analyzer thuần; module QA tự sở hữu severity/UX. Xem [module Bộ đo](../../modules/measurement/README.md) |
| Sao lưu và khôi phục | Chạy | Giữ; migration theo các bảng mới |
| Lưu và phục hồi (SQLite) | Chạy; working tree đã có `.mira` v7 cho phiên/đề xuất, `library.db` v4/v5 | Giữ |
| Minh họa “Sắp có” | Có | Giữ tới khi có màn thật; mock của Từng câu gỡ cùng mode (Gỡ Từng câu) |
| Thuật ngữ (glossary) | Chạy trên kho thật: CRUD, alias, import Names.txt, so khớp CJK/Latin, tiêm Tầng C prompt, UI GlossaryScreen | **Đã hoàn thành Module 3 (2026-10-04)** |
| Xưng hô (addressing) | Chạy trên kho thật: CRUD nhân vật, dyad có chiều, hiệu lực chương, tiêm Tầng B prompt, kiểm tra đại từ, UI AddressingScreen | **Đã hoàn thành Module 4 (2026-10-04)** |
| Xuất bản dịch (Export) | Chạy trên kho thật: 4 định dạng chuẩn ebook novel (TXT, MD, Word DOCX, PDF native printToPDF), đơn chương và gộp/tách tác phẩm | **Đã hoàn thành Module 6 (2026-10-05)** |
| Build và kiểm tra | 1620+ test | Giữ |
| Cấu trúc mã nguồn | Bốn tầng, lint ép | Giữ |

## Chi tiết theo phần

### Desktop và IPC

- Electron main/preload, sandbox, context isolation. Bridge có kiểu (`DesktopApi`) cho tác phẩm, ảnh bìa, chương, văn bản, ảnh nhúng, kết nối AI, dịch chương và chat; schema `valibot`, kết quả bọc `Result`, lỗi trả dạng dữ liệu; chỉ nhận yêu cầu từ khung chính.
- Khóa API đi vào một lần, không có kênh nào đọc ra. Kênh **main → renderer đầu tiên** của kho là `ai:chat:chunk` (chat).
- Bằng chứng: [main](../../../src/main/index.ts), [preload](../../../src/preload/index.ts), [IPC](../../../src/main/ipc), [types](../../../src/shared/contracts/desktop-api.ts).
- Chưa có: kênh cho đề xuất và tác vụ (Đề xuất, Tác vụ); `services`/`infra` ở `utilityProcess`.

### UI shell, thư viện, tác phẩm

- Sidebar, light/dark, ẩn sidebar, điều hướng trong bộ nhớ (chưa có router), nút bánh răng mở Cài đặt (có ở mọi màn). Khi mở một chương, sidebar đổi thành danh sách chương của tác phẩm đó (`ChapterNavSidebar`). Theme lấy theo hệ thống lúc khởi tạo, chưa lưu lựa chọn. Truyện đang mở có tab trong titlebar; trạng thái phiên tab lưu ở Main/SQLite. Xem [module Phiên làm việc](../../modules/workspace/README.md).
- **Thanh trên cùng là thanh tiêu đề của cửa sổ** (Windows và Linux: `titleBarStyle: 'hidden'` kèm window controls overlay): một thanh 40px chạy hết bề ngang, chứa nút thanh bên, tên Mira, breadcrumb, icon của màn đang mở, Cài đặt và sáng/tối; ba nút thu nhỏ/phóng to/đóng do hệ điều hành vẽ chồng ở góc phải, màu đổi theo theme qua kênh `app:chrome-theme` (`setChromeTheme`). Mỗi màn đặt icon của riêng nó lên thanh bằng `TopBarActions` (Hỏi AI, Tập trung, Lưu, menu chương, nút quay lại) thay vì một hàng header thứ hai. Màu ba nút là bản sao tay của hai token CSS; `titleBar.test.ts` fail khi chúng lệch nhau. macOS giữ khung hệ điều hành. **Mới kiểm trên Windows 11 bằng bản build** (chụp màn hình sáng/tối, thư viện, chương, chương chưa có bản gốc, Cài đặt); chưa thử Linux, chưa thử kéo thả và nhấp đúp để phóng to bằng tay. Bằng chứng: [AppShell](../../../src/renderer/src/app/AppShell.tsx), [TopBarActions](../../../src/renderer/src/app/TopBarActions.tsx), [titleBar](../../../src/main/electron/titleBar.ts).
- Thư viện đọc từ kho thật: tạo (tên, ngôn ngữ nguồn, tên gốc, tác giả, thể loại/bối cảnh, mô tả, ảnh bìa), đổi tên, tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa, tìm không dấu, báo tệp không mở được. Chưa có xóa tác phẩm.
- Chi tiết tác phẩm: đầu trang (bìa, tên, tác giả, mô tả thu gọn, trạng thái, số chương; “Tiếp tục”/“Thêm chương”; sửa thông tin nguyên tử) và khung khu vực `WorkAreaHost`: Chương là thật; Ngữ cảnh, Nguồn, Tác vụ là minh họa “Sắp có”.
- Bằng chứng: [App](../../../src/renderer/src/App.tsx), [AppShell](../../../src/renderer/src/app/AppShell.tsx), [LibraryScreen](../../../src/renderer/src/features/library/LibraryScreen.tsx), [useLibrary](../../../src/renderer/src/features/library/useLibrary.ts), [WorkForm](../../../src/renderer/src/features/work/WorkForm.tsx), [WorkDetailScreen](../../../src/renderer/src/features/work/WorkDetailScreen.tsx), [WorkAreaHost](../../../src/renderer/src/features/work/WorkAreaHost.tsx), [workAreas](../../../src/renderer/src/features/work/workAreas.tsx), [ChapterNavSidebar](../../../src/renderer/src/features/chapter/ChapterNavSidebar.tsx).

### Danh sách chương

- Thêm, đổi tên tại chỗ (F2), chuyển vị trí (lên/xuống/đầu/cuối/tới số), xóa có xác nhận, tìm không dấu và nhảy tới số, phân trang 50/100. Kho giữ vị trí liền mạch trong một transaction; `chapters:*` qua IPC.
- Đo trong Electron: mọi thao tác dưới 120 ms ở 2.000 và 5.000 chương.
- Bằng chứng: [chapterFile](../../../src/main/infra/storage/chapterFile.ts), [ChaptersArea](../../../src/renderer/src/features/work/ChaptersArea.tsx), [chapterList](../../../src/renderer/src/features/work/chapterList.ts).
- Chưa có: thùng rác, nhóm theo tập ([backlog](../delivery/backlog.md)).

### Nội dung chương (kho văn bản) — viết lại ở (Gỡ Từng câu)

- Văn bản gốc/dịch theo bên, có revision và `expectedRev` (xung đột trả `conflict`). **Segment có ID ổn định** với vùng theo UTF-16, ghi cùng văn bản trong một transaction; giới hạn 2.000.000 đơn vị/văn bản và 50.000 segment/bên. Liên kết n:m và nguồn gốc ở mức repository. IPC `text:get`/`text:save`.
- Bằng chứng: [textFile](../../../src/main/infra/storage/textFile.ts), [textRules](../../../src/main/infra/storage/textRules.ts), [linkFile](../../../src/main/infra/storage/linkFile.ts), [text](../../../src/shared/contracts/text.ts).
- **Sẽ bỏ** (ADR-005): `segment`, `link`, `link_member`, `provenance`, trigger giữa chúng, và `segments` trong `text:save`. Thay bằng `ai_mark`, `proposal`, `text_snapshot`, `job`, `job_item`, thêm dần qua các module Đề xuất, Tác vụ và Gỡ Từng câu (ADR-005 gọi chung là "schema v6"; số version thật chốt lúc làm vì bảng ngữ cảnh của module Thuật ngữ nay đi trước).

### Nhập bản gốc — chia segment viết lại ở (Gỡ Từng câu)

- Màn chương (`ChapterScreen`) hiện bản gốc, phông theo ngôn ngữ nguồn. Hộp thoại nhập: dán hoặc chọn/kéo tệp `.txt`/`.md` (tối đa 8 MB), xem trước, lưu.
- Giải mã theo BOM, UTF-8 nghiêm ngặt, rồi đoán theo ngôn ngữ nguồn (GB18030, Big5, Shift_JIS, EUC-JP, Windows-1252); đổi bảng mã tay được. Chuẩn hóa tám việc: bỏ BOM; đổi CRLF/CR/U+2028/U+2029 thành LF; bỏ ký tự điều khiển; cắt khoảng trắng dư cuối dòng; gộp dấu cách/tab liên tiếp giữa dòng; cắt khoảng trắng hai đầu; không đổi NFC/NFD; giữ U+3000, thụt đầu dòng và dấu câu.
- Chia câu bằng `Intl.Segmenter` kèm sửa dấu mở thoại và gộp sau từ viết tắt. Thay bản gốc giữ bản dịch, liên kết cũ đánh dấu cần kiểm tra.
- Đo ở Electron thật: 300.000 ký tự xem trước 140 ms, lưu 2,1 giây; chương 5.000 segment mở 83 ms.
- Bằng chứng: [rawText](../../../src/shared/algorithms/rawText.ts), [segmenter](../../../src/shared/algorithms/segmenter.ts), [rawImport](../../../src/shared/algorithms/rawImport.ts), [ChapterScreen](../../../src/renderer/src/features/chapter/ChapterScreen.tsx), [ImportDialog](../../../src/renderer/src/features/chapter/ImportDialog.tsx).
- Chưa có: phân biệt Big5/GB18030 khi cả hai đọc sạch (`encoding-detect-cjk`); nhập nhiều chương từ một tệp vẫn là minh họa.
- **Số phận:** giải mã, chuẩn hóa và giới hạn giữ. Phần chia segment và liên kết bỏ; nhập raw chỉ chuẩn hóa và lưu; `segmenter.ts` giữ lại để cắt lô gửi AI. Đoạn đổi sang “mỗi dòng không trống” (Q3).

### Mode Từng câu — đã ẩn, gỡ ở (Gỡ Từng câu)

- Đã dựng ngày 2026-10-01: mỗi segment bản gốc là một hàng, ô bản dịch `<textarea>`, trạng thái hàng suy từ liên kết (Chưa dịch / AI đã dịch / Đã soát / Cần kiểm tra), bốn kênh `links:list`, `rows:save`, `rows:review`, `rows:autopair`, “Ghép theo thứ tự” (ước đoán theo thứ tự xuất hiện), thanh lọc và panel gợi ý **minh họa**.
- **Đã ẩn khỏi giao diện** bằng `SENTENCE_MODE_ENABLED = false` ở `ChapterWorkspace.tsx`. Comment ở đó từng ghi “chờ `segment-auto-align`”, nay change đó đã bị hủy.
- Số đo MVP (mode đã bỏ, giữ làm lịch sử): 5.000 hàng, bản dịch 625.000 ký tự: mở 180–199 ms, đổi trang 111–114 ms, ghi một hàng 135–143 ms.
- Mã còn trong repo: [SentenceMode](../../../src/renderer/src/features/chapter/SentenceMode.tsx), [SentenceModeMocks](../../../src/renderer/src/features/chapter/SentenceModeMocks.tsx), [useSentenceRows](../../../src/renderer/src/features/chapter/useSentenceRows.ts), [sentenceRows](../../../src/main/infra/storage/sentenceRows.ts), [rows](../../../src/shared/contracts/rows.ts), [links](../../../src/shared/contracts/links.ts).
- **Sống tới (Gỡ Từng câu)** vì đường dịch MVP còn ghi theo hàng; xem ngoại lệ ở P6 của kiến trúc.

### Editor Toàn văn

- Chương có bản gốc mở thành hai pane cạnh nhau, mỗi pane cuộn riêng, không số nối hay đường nối. Bản gốc **khóa mặc định** (chỉ đọc, vẫn chọn và sao chép được); “Sửa bản gốc” mở khóa, “Khóa lại” khóa lại mà giữ chữ chưa lưu. Bản dịch sửa bằng cùng trình soạn thảo, có gợi ý khi trống (lớp phủ ngoài editor). Giao diện Reading view **không còn trong mã**: `ReadingView.tsx` bị xóa ở commit `81bbd2f` (cùng commit thêm dịch chương bằng AI), `readingParagraphs.ts` còn lại nhưng chỉ test dùng. Chưa có quyết định ghi lại về việc bỏ hay làm lại. Xem [câu hỏi mở](../product/open-questions.md).
- **Live Preview** ở pane bản dịch: tiêu đề `#`–`###`, trích dẫn, danh sách là mark decoration (mờ, luôn hiện). Đậm, nghiêng, gạch ngang **ẩn hẳn** cặp dấu `**`/`*`/`_`/`~~` khi con trỏ không chạm vào span đã gõ xong, hiện lại mờ khi bấm vào sửa (`Decoration.replace` rỗng với `selectionTouches`). Từ 2026-10-03 việc nhận diện dùng **cây cú pháp Markdown của CodeMirror** (`markdownSyntax.ts`, gói `@codemirror/lang-markdown`) thay cho regex từng dòng, nên `*` trong code span, dấu đã escape, `snake_case_name` và `_` trong URL không còn bị nhận nhầm rồi ẩn mất. Parser bỏ `IndentedCode`, `SetextHeading`, `LinkReference` và `HTMLBlock` (đoạn thụt lề, `---` ngắt cảnh, `[Tên]: lời thoại` không bị đọc thành code, tiêu đề hay định nghĩa liên kết) và không gắn keymap của lang-markdown, nên Enter vẫn chỉ xuống dòng. Đậm/nghiêng/gạch ngang trong tiêu đề, danh sách và trích dẫn cũng ẩn dấu, `__đậm__` cũng ẩn, còn `>_<` hay `>chữ` không phải trích dẫn. **Rủi ro IME của phần ẩn dấu chưa được đo bằng tay** (D1b của change `editor-rich-text-images`).
- **Ảnh:** dán hoặc kéo-thả PNG/JPEG/GIF/WebP chèn `![[id]]`, hiện thành ảnh bằng widget (`imageEmbedDecorations`), kéo góc đổi cỡ. Lưu dạng blob trong `.mira` (bảng `image`, schema v5) qua `images.put/get/delete`; renderer co về tối đa 2000 px và 8 MB, main nhận diện định dạng theo byte thật; tối đa 200 ảnh/tác phẩm. Không hỗ trợ ảnh từ URL ngoài.
- **Phím:** Ctrl+B bật/tắt `**đậm**`, Ctrl+I bật/tắt `*nghiêng*` (keymap CodeMirror, `formatCommands.ts`); không có phím gạch ngang. Gỡ định dạng chọn lại đúng cả chữ vừa gỡ (trước 2026-10-03 vùng chọn lệch đúng bằng độ dài dấu); `_nghiêng_` cũng gỡ được, và một span kéo qua nhiều dòng không bị gỡ từ dòng khác. Ba trình xử lý phím toàn cục (`AppShell` Ctrl+B, `ChapterWorkspace` Ctrl+S/Ctrl+K) lùi khi `event.defaultPrevented` đã là `true`.
- **Lưu:** nút “Lưu” và Ctrl+S lưu cả hai bên song song, trạng thái và xung đột theo từng pane; chặn rời xét cả hai bên. Nút “Tập trung” ẩn thanh bên. Hàng chọn mode có ba nhãn tĩnh “Thuật ngữ”/“Xưng hô”/“Văn phong” kèm “Sắp có”.
- Đo (cả hai bên 5.000 segment): mở 123–141 ms, xử lý mỗi phím p95 3,7 ms, lưu cả hai 214 ms không đứng giao diện.
- Đo cây cú pháp (trong Node, không phải Electron; chương 300.000 ký tự, 2.471 đoạn): phân tích lần đầu ≈ 49 ms; mỗi ký tự gõ thêm ≈ 2,3 ms trung bình, tệ nhất 4,8 ms; lập kế hoạch Live Preview cho một màn hình ≈ 0,3 ms. Chưa đo trong Electron.
- Bằng chứng: [ChapterWorkspace](../../../src/renderer/src/features/chapter/ChapterWorkspace.tsx), [EditorPane](../../../src/renderer/src/features/chapter/EditorPane.tsx), [TextEditor](../../../src/renderer/src/features/editor/TextEditor.tsx), [livePreviewDecorations](../../../src/renderer/src/features/editor/livePreviewDecorations.ts), [imageEmbedDecorations](../../../src/renderer/src/features/editor/imageEmbedDecorations.ts), [imageEmbed](../../../src/renderer/src/features/editor/imageEmbed.ts), [formatCommands](../../../src/renderer/src/features/editor/formatCommands.ts), [markdownSyntax](../../../src/renderer/src/features/editor/markdownSyntax.ts), [test của bộ quét](../../../src/renderer/src/features/editor/markdownSyntax.test.ts).
- Chưa có: Reading view; bảng ca IME cho các phần mới ([imeCases.md](../../../src/renderer/src/features/editor/imeCases.md)); chạy `ViewPlugin` và `Decoration.replace` trên `EditorView` thật (môi trường test không có DOM, nên chỉ phần thuần `scanMarkdown`, `planLivePreview`, `toggleWrapChanges` có test).

### Soạn thảo và ánh xạ segment — viết lại ở (Gỡ Từng câu)

- Mỗi chỉnh sửa dịch chuyển vùng segment qua hàm thuần `applyEdits` ([segmentMap](../../../src/shared/algorithms/segmentMap.ts)): segment không bị đụng tới giữ ID và nguyên văn; vùng đã sửa được chia lại bằng `segment()` khi người dùng dừng gõ 800 ms hoặc khi lưu, **không bao giờ lúc đang soạn bằng bộ gõ**. Hoàn tác/làm lại một lịch sử khôi phục cả ID. Lưu qua `text:save` với `expectedRev`; xung đột báo lỗi và giữ chữ đang sửa; chặn rời khi chưa lưu. Nền xen kẽ và gạch dưới chấm cho segment đã sửa, không chèn phần tử vào dòng; không có cột số dòng.
- Đo (chương 5.000 segment, 206.000 ký tự): mở 95 ms, xử lý mỗi phím p95 1,7 ms, lưu 179 ms không đứng giao diện.
- Bằng chứng: [segmentMap](../../../src/shared/algorithms/segmentMap.ts), [editor](../../../src/renderer/src/features/editor), [editorFlow.test](../../../src/main/ipc/editorFlow.test.ts).
- Chưa có: tự lưu định kỳ (`autosave`).
- **Số phận:** cơ chế dịch vùng khi gõ giữ lại nhưng đổi thành `RangeSet` của **dấu AI** (không chia lại câu, không ID ổn định, không liên kết); IME rule “không chia lại lúc đang soạn” vẫn áp dụng.

### Hỏi AI (chat) — giữ, kiểm chứng song song

- Panel `AiPanel` làm cột thứ ba cạnh hai pane (Ctrl+K hoặc nút “Hỏi AI”). **Gọi nhà cung cấp thật** (change `ai-chat`): chữ chảy về qua `ai:chat:chunk`; hủy giữa dòng; hai lượt chồng nhau không trộn chữ.
- Hai chế độ: **Hỏi** (chỉ đọc) và **Sửa** (trả một khối thay thế trong hàng rào ```). Đề xuất của Sửa vào pane bản dịch bằng `@codemirror/merge`: người dùng nhận/bỏ **từng chỗ** ngay trong pane; một lần áp dụng là một transaction nên `Ctrl+Z` hoàn tác cả lượt; không ghi thẳng xuống kho. Đề xuất đã cũ **bị từ chối**, không đoán vị trí (neo theo nội dung, ba bậc). Pane bản dịch **rỗng** thì bản dịch vào thẳng.
- Phạm vi một lượt: bôi chọn → vùng bôi chọn; không bôi chọn → đoạn chứa con trỏ; cả chương phải bấm chip “Cả chương”.
- Ngữ cảnh Mira **lắp sẵn bằng luật** ở renderer (đoạn đang sửa, bản gốc cùng chỉ số, mấy đoạn liền trước/sau) từ bản đang mở trong editor, nên thấy cả chữ chưa lưu. Panel liệt kê đúng các khối đã gửi dưới nhãn “đã gửi kèm”.
- Chat đọc được chương khác của cùng tác phẩm bằng hai công cụ **chỉ đọc** (`list_chapters`, `read_chapter`); phạm vi khóa trong một tác phẩm bằng cấu trúc; trần 3 vòng tool. Luật: **tool được đọc và được trỏ; chỉ người dùng mới được ghi.**
- Hội thoại **chỉ sống trong phiên**. Model chọn bằng `ModelSelectionMenu` (kết nối → mục model → mức suy luận), dùng chung với hộp thoại dịch; cài đặt của mục được đọc **một lần ở đầu lượt** nên mọi vòng đọc công cụ của lượt gửi cùng một cấu hình. Mỗi lượt hiện token thật và tiền (thiếu giá thì “chưa biết giá”).
- Bằng chứng: [AiPanel](../../../src/renderer/src/features/chapter/AiPanel.tsx), [AiTurn](../../../src/renderer/src/features/chapter/AiTurn.tsx), [useAiChat](../../../src/renderer/src/features/chapter/useAiChat.ts), [chatService](../../../src/main/services/ai/chatService.ts), [chatTools](../../../src/main/services/ai/chatTools.ts), [chatReview](../../../src/renderer/src/features/editor/chatReview.ts), [aiChat](../../../src/shared/contracts/aiChat.ts).
- **Bằng chứng chạy thật mới có một:** ảnh chụp của chủ sản phẩm (Electron, 2026-10-03) cho thấy hai lượt chat với `usage` thật (xem mục Provider). Task 1.x, 10.2, 10.3, 12.5 của change `ai-chat` (fixture SSE thật, lái tay có hệ thống, đo tỷ lệ `Ctrl+Z`) **vẫn chưa đóng**; change đã bị gỡ khỏi `openspec/changes/` ngày 2026-10-03 nên các task này nay theo dõi ở mục "Việc song song" của [lộ trình](../delivery/roadmap.md). Hành vi của `acceptChunk`/`rejectChunk` là giả định lấy từ tài liệu thư viện, vì test chạy không có DOM.
- Chưa có: trần chi phí cho chế độ hỏi; tool đọc ngữ cảnh truyện (cần `context-core`).
- Gỡ ở (Gỡ Từng câu): `targetIds` trong `chatRange.ts` và `aiChat.ts` (chỉ được tạo ra, chat không đọc).

### Dịch chương bằng AI — viết lại ở (Lõi dịch, Đề xuất, Tác vụ)

- Menu “…” trên màn chương có “Dịch bằng AI”; mở hộp thoại đi qua `registry.confirmLeave()` trước (AI ghi thẳng vào kho nên chữ chưa lưu phải xử lý xong). Hộp thoại nói trước: mục model + mức suy luận (menu `ModelSelectionMenu`; chọn mức là ghi vào cài đặt của mục), số câu, số lô, token và chi phí **ước lượng** kèm ngày của bảng giá (thiếu giá thì “chưa biết giá”); chương đã có bản dịch phải xác nhận thêm một bước. Chạy xong hiện lượng dùng **thật** nhà cung cấp báo.
- **Cấu hình không trộn giữa các lô:** kế hoạch mang `settingsKey` (SHA-256 của tên model thật và các tham số ảnh hưởng nội dung hay cách chia lô); mỗi lô gửi lại nó, và nếu mục bị sửa giữa chừng thì lô đó **không được gửi** (`conflict`), hộp thoại lập kế hoạch lại và "Dịch lại phần lỗi" chạy tiếp với khóa mới. Sửa riêng đồng thời hay RPM không gây xung đột. Cỡ lô lấy từ giới hạn token đầu vào của mục.
- **Vòng lặp lô ở renderer** (`useAiTranslate`), mỗi lô là một lời gọi `ai:translate:batch` và được ghi ngay; Hủy chỉ là “không gửi lô tiếp”; đóng hộp thoại cũng dừng. Kết quả ghi theo segment ID qua `saveRow` với nguồn `ai` (hàng hiện là “AI đã dịch”). **Không ghi đè hàng người dùng đã viết hay đã soát**; những câu đó quay về hộp thoại dạng hai bản cạnh nhau (“Dùng bản AI” / “Giữ bản của tôi”). Lô lỗi được liệt kê kèm lý do và có “Dịch lại phần lỗi”.
- Bằng chứng: [AiTranslateDialog](../../../src/renderer/src/features/chapter/AiTranslateDialog.tsx), [useAiTranslate](../../../src/renderer/src/features/chapter/useAiTranslate.ts), [chapterTranslation](../../../src/main/services/ai/chapterTranslation.ts), [aiTranslate](../../../src/shared/contracts/aiTranslate.ts), [test](../../../src/main/ipc/aiTranslateHandlers.test.ts).
- **Chưa gọi nhà cung cấp thật lần nào**, chưa xem bằng mắt trong Electron thật (task 5.1–5.4 của `ai-connection`). `usage` thật chưa lưu lại; chưa có tác vụ nhiều chương; ngữ cảnh thuật ngữ đã được nối vào prompt (Tầng C) từ Module 3.
- **Số phận:** prompt, chia lô và ánh xạ ID viết lại ở (Lõi dịch); đường ghi thay bằng đề xuất (Đề xuất) và `JobRunner` trong main (Tác vụ). `reconcile`, chia lô, thử lại, `classifyError`, `keyPool` giữ lại; luật “không ghi đè hàng người đã viết” (`isProtectedRow`) được thay bằng luật đề xuất.

### Provider và kết nối AI

- Hợp đồng `TranslationProvider` theo segment ID, lỗi có phân loại (`retryable`, `retryAfterMs`), hàm thuần `reconcile`, provider giả lập offline có các chế độ lỗi.
- **Ba tầng** (change `ai-gateway`, 2026-10-03; xem [nghiên cứu lõi AI](../research/ai-core-architecture.md)):
  - **Transport** `OpenAiChatTransport`: một lượt gọi (thường hoặc stream) tới `/chat/completions` bằng `fetch` trần, không SDK nhà cung cấp. Nhận khóa từ ngoài, **chỉ gửi tham số mà người gọi đặt**; trả nội dung, `finish_reason`, `usage` chuẩn hóa và trạng thái HTTP; thời hạn tổng/đầu/im lặng với hủy được ưu tiên hơn hết hạn; lỗi có kiểu (`timeout`, `quota` mới) mang trạng thái, thời gian chờ, phạm vi hạn mức và một đoạn thân đã **che khóa**.
  - **Gateway** (`infra/providers/gateway/`): một chủ thử lại duy nhất (mạng/timeout/5xx, tối đa 2 lần, chờ có xáo trộn, hủy được), **đổi khóa ngay không chờ** với lỗi riêng của khóa (429, hết tín dụng, khóa sai), chỉ trước byte đầu của stream; trần đồng thời **mỗi mục model** (mặc định 4, hàng FIFO, người dùng đặt được và đổi được khi đang chạy) cùng giãn nhịp RPM theo mục (`RatePacer`, đặt chỗ theo thời gian, hủy được); bộ lập lịch khóa vẫn theo kết nối; bộ lập lịch khóa an toàn khi gọi song song (bộ đếm lượt: lỗi cùng đợt chỉ tính một lần, `ok` đến muộn không gỡ đóng băng, một lượt thăm dò duy nhất sau hạn). `GatewayRegistry` do `ConnectionService` giữ, mỗi kết nối một phần trạng thái.
  - **Mặt tiền** `OpenAiCompatibleProvider` (`translate`, `chat`, `listModels` giữ chữ ký) vẫn cầm **mã dịch MVP**: prompt, chia lô ở ranh giới segment, JSON có ID, `reconcile`, hỏi lại theo nội dung (tối đa 3 lần/lô, bộ đếm **riêng** với thử lại hạ tầng); một lô thiếu vài câu sau khi thử lại vẫn trả phần đã có. Phần này sẽ được viết lại ở module Lõi dịch, không thuộc change `ai-gateway`.
- **`usage` một kiểu** (chưa gồm cache; cache đọc/ghi, reasoning tách riêng) và chi phí dùng giá cache khi có. Với Gemini, token thinking **nằm ngoài `completion_tokens`** và chỉ lộ qua `total_tokens`; phần chênh được cộng vào đầu ra (đo thật: 21 vào, 13 + 91 ra).
- `classifyError` đọc lỗi ba lớp suy giảm êm (thân kiểu Google, **kể cả thân bọc mảng** → kiểu OpenAI → quét chuỗi thô → chỉ mã HTTP). Khóa Gemini sai trả **HTTP 400**, được nhận là `auth`. `keyPool` chọn khóa `fill-first` và quyết hai mức đóng băng (theo phút dùng đúng `retryDelay`, theo ngày tới mốc reset; hết tín dụng đóng băng tới mốc reset theo ngày). Bảng model/giá là snapshot models.dev (MIT) vendored trong repo, làm mới bằng `node scripts/refresh-model-catalog.mjs`; ước lượng chi phí dùng hệ số phỏng đoán chưa đo, đặt một chỗ.
- **Mạng của app dùng `net.fetch` của Electron** (tiêm từ `electron/netFetch.ts` qua `createServices`), nên theo proxy hệ thống; `fetch` của Node thì không. Đã đo trong Electron 44.4.5 bằng `pnpm smoke:net`: stream đến từng mảnh, hủy giữa dòng dừng ngay, địa chỉ máy nội bộ nối thẳng, `net.fetch` qua proxy còn `fetch` Node thì không. **Chưa thử** proxy hệ thống thật của Windows (PAC/WPAD/xác thực).
- Địa chỉ kết nối được chuẩn hóa lúc lưu và lúc gửi (bỏ `/` cuối và `/chat/completions` dán thừa).
- Màn **Cài đặt** (`SettingsScreen`, phương án F): mỗi kết nối một `Panel` với tên, URL, danh sách khóa có trạng thái riêng, “Kiểm tra kết nối”, danh sách **mục model** (xem bên dưới). Bảy preset điền sẵn URL. Khóa lưu bằng `safeStorage` (async, không khả dụng thì từ chối lưu); kết nối ở phạm vi ứng dụng nên không đi theo tệp `.mira`.
- Bằng chứng: [transport](../../../src/main/infra/providers/openAiChatTransport.ts), [gateway](../../../src/main/infra/providers/gateway/gateway.ts), [keyScheduler](../../../src/main/infra/providers/gateway/keyScheduler.ts), [openAiCompatible](../../../src/main/infra/providers/openAiCompatible.ts), [usage](../../../src/main/infra/providers/usage.ts), [classifyError](../../../src/main/infra/providers/classifyError.ts), [keyPool](../../../src/main/infra/providers/keyPool.ts), [redact](../../../src/main/infra/providers/redact.ts), [compat](../../../src/main/infra/providers/compat.ts), [netFetch](../../../src/main/electron/netFetch.ts), [bản ghi Gemini thật](../../../src/main/infra/providers/__fixtures__/live) và [test phát lại](../../../src/main/infra/providers/geminiFixtures.test.ts), [types](../../../src/main/infra/providers/types.ts), [reconcile](../../../src/main/infra/providers/reconcile.ts), [mockProvider](../../../src/main/infra/providers/mockProvider.ts), [modelCatalog](../../../src/main/infra/providers/modelCatalog.ts), [costEstimate](../../../src/main/services/ai/costEstimate.ts), [connectionService](../../../src/main/services/ai/connectionService.ts), [SettingsScreen](../../../src/renderer/src/features/settings/SettingsScreen.tsx), [useConnections](../../../src/renderer/src/features/settings/useConnections.ts).
- **Đã gọi Gemini thật đúng một lần** (2026-10-03, `gemini-2.5-flash`, 9 kịch bản, mỗi kịch bản một mẫu): hình dạng phản hồi, stream, `usage`, lỗi khóa sai và `GET /models` đã có bản ghi. **Chưa có:** thân 429 thật (cần `--burst`), văn bản hết tín dụng, hủy giữa dòng với nhà cung cấp thật, `cached_tokens`, model Gemini 3.x. Hằng số `quota` vẫn là giả định. Màn Cài đặt chưa xem bằng mắt trong Electron thật (task 5.4 của `ai-connection`); chưa có `Ctrl+,`.
- **Mục model và cài đặt** (change `ai-model-settings`, theo cấu trúc của LinguaGacha; xem [ghi chú đối chiếu](../experience/ai-connection-settings.md#cài-đặt-model--đối-chiếu-linguagacha-2026-10-03)):
  - Model là một **mục** có id riêng, nhân bản được (`library.db` v5; mục cũ giữ tên model làm tên hiển thị, model mặc định cũ thành mục mặc định). Hai mục cùng model thật có cài đặt riêng. Menu "…" của mục: đặt mặc định, **Cơ bản** (tên hiển thị, tên model thật với Nhập / Lấy / Kiểm tra, mức suy luận), **Tác vụ** (token vào mỗi lô, token ra, đồng thời, RPM; 0 hoặc trống là mặc định), **Nâng cao** (nhiệt độ, `top_p`, header thêm, `extra_body`, mỗi cái một công tắc giữ giá trị khi tắt), chuyển lên/xuống, sao chép, xóa. Mỗi ô lưu ngay khi đổi xong; số ngoài giới hạn hiện lý do bên ô và **không** bị kẹp. Hộp thoại chọn model có ô lọc, tự lấy danh sách lần đầu.
  - **Chỉ gửi tham số đã bật**: mục chưa đặt gì gửi y như trước. Mức suy luận chỉ gồm các mức model hỗ trợ theo `reasoning_options` của models.dev (Gemini 2.5 Flash: Tắt/Thấp/Vừa/Cao; 2.5 Pro: không có Tắt; model lạ: chỉ "Mặc định"); "Mặc định" là không gửi gì, "Tắt" gửi `reasoning_effort: "none"`. `extra_body` không ghi đè được `model`, `messages`, `stream`, `stream_options`, `tools`; header thêm không ghi đè được header xác thực, `host`, `accept`, `content-type`, `content-length`. Nhà cung cấp từ chối một tham số thì lỗi mang lời gốc; Mira **không** tự bỏ tham số rồi gọi lại. Nút Kiểm tra gửi một yêu cầu nhỏ bằng cài đặt đã lưu.
  - Bằng chứng: [modelSettings](../../../src/shared/contracts/modelSettings.ts), [generation](../../../src/main/infra/providers/generation.ts), [modelCapability](../../../src/main/infra/providers/modelCapability.ts), [ratePacer](../../../src/main/infra/providers/gateway/ratePacer.ts), [connections](../../../src/main/infra/storage/connections.ts), [librarySchema](../../../src/main/infra/storage/librarySchema.ts), [ModelEntries](../../../src/renderer/src/features/models/ModelEntries.tsx), [ModelSelectionMenu](../../../src/renderer/src/features/models/ModelSelectionMenu.tsx).
  - **Đã xem bằng mắt** ở chế độ trình duyệt với `window.mira` giả (2026-10-03, sáng và tối, bàn phím: mở menu, Enter, mũi tên, Esc, trả focus): danh sách mục, ba hộp thoại, chọn model, menu chọn mức, hộp thoại dịch kể cả xung đột cấu hình rồi lập kế hoạch lại. **Đã đối chiếu `reasoning_options` với Gemini thật** (2026-10-03, `gemini-3.5-flash` và `gemini-3.1-pro-preview`; 2.5 Pro không còn cho người dùng mới nên không đo được): 3.1 Pro khớp; 3.5 Flash nhận cả `none` mà catalog không có, đã sửa bằng bảng `MODEL_CAPABILITY_OVERRIDES` (có test giữ bảng khớp các bản ghi). **Trong Electron thật mới có bằng chứng cho đường chat** (ảnh chủ sản phẩm, 2026-10-03: mục "gemini-2.5-flash · Cao", hai lượt có `usage` thật); dịch chương, Kiểm tra và các hộp thoại cài đặt chưa xem trong Electron thật. Chưa chạy đường đầy đủ kết nối → mục → gateway → Gemini (task 6.4; `liveGemini.test.ts` đã viết, chỉ chạy khi `MIRA_LIVE=1` và có khóa). Không có test DOM: hành vi hộp thoại không nằm trong bộ test.
- **Mặc định gửi đi vẫn không có tham số nào** cho một mục chưa đặt gì: dịch chương và chat **không** gửi `reasoning_effort` hay `max_tokens` cho tới khi người dùng đặt. Với Gemini 2.5 Flash, cùng một câu ngắn tốn 125 token ở mặc định (thinking) và 33 với `reasoning_effort: "none"`; đặt trần token nhỏ khi thinking bật có thể ra câu cụt. Chọn tắt thinking hay không là quyết định chất lượng so với tiền của lớp prompt.

### Sao lưu và khôi phục

- “Sao lưu…” ở menu tác phẩm và hộp xóa chương: `VACUUM INTO` vào `.part`, kiểm tra, đổi tên. “Mở tác phẩm có sẵn” khôi phục thành tác phẩm mới (sao chép vào `.tmp`, kiểm tra `application_id`, toàn vẹn, khóa ngoại, phiên bản; nâng cấp; đổi tên là điểm cam kết). Hộp thoại mở ở main, renderer không truyền đường dẫn. Đo: 236 MB xuất ~2 s, khôi phục ~1 s.
- Bằng chứng: [backupFile](../../../src/main/infra/storage/backupFile.ts), [library](../../../src/main/services/library/library.ts), [libraryHandlers](../../../src/main/ipc/libraryHandlers.ts).
- Chưa có: sao lưu cả thư viện, sao lưu định kỳ, tiến trình cho tệp rất lớn.

### Thuật ngữ (glossary) — Đã hoàn thành (Module 3)

- Đã hoàn thành lát 1 của `context-core` (Module 3 theo lộ trình ngày 2026-10-04).
- **Lưu trữ SQLite (schema v6):** Bảng `context_entry` (id, work_id, kind='term', source, target, forbidden, status, from_chapter_id, to_chapter_id, notes) và bảng `context_alias` (dạng viết khác của thuật ngữ). Hỗ trợ CRUD, lọc theo trạng thái duyệt và truy vấn hiệu lực theo khoảng chương (`getEffectiveEntriesForChapterRange`). Đã đóng băng snapshot fixture v6.
- **Thuật toán thuần:**
  - `namesParser.ts`: Đọc và phân tích định dạng `Names.txt` (`Từ_gốc=Từ_dịch`), bỏ qua comment `#`, `//`, báo cáo chi tiết các dòng bị bỏ qua.
  - `contextMatching.ts`: So khớp thuật ngữ trong văn bản nguồn (longest-match cho CJK, ranh giới từ `\b` cho Latin/EN, chặn từ quá ngắn, khớp qua alias).
  - `glossaryCompliance.ts`: Kiểm tra tuân thủ thuật ngữ trên bản dịch, cảnh báo thiếu bản dịch đích hoặc xuất hiện thuật ngữ bị cấm (`forbidden`).
- **Tích hợp Lõi dịch & Quyền riêng tư:**
  - Chỉ các thuật ngữ đã duyệt (`status = 'approved'`) và có hiệu lực với chương mới được đưa vào Tầng C (`formatGlossaryLayerC`) của prompt builder.
  - Mỗi bản dịch tính toán `contextHash` (SHA-256) của payload ngữ cảnh thực gửi.
  - Cam kết tuyệt đối: các mục chưa duyệt (`pending`, `rejected`) không bao giờ được gửi ra ngoài thiết bị tới nhà cung cấp AI.
- **Giao diện & IPC:** Màn hình `GlossaryScreen` thật thay thế cho khu vực minh họa trong tab Ngữ cảnh (`ContextAreaMock`), kèm hộp thoại thêm/sửa, xác nhận xóa, và modal nhập tệp `Names.txt`. Kênh IPC `glossary:*` được expose an toàn qua `window.mira.glossary`.
- Bằng chứng: [workSchema](../../../src/main/infra/storage/workSchema.ts), [contextEntries](../../../src/main/infra/storage/contextEntries.ts), [namesParser](../../../src/shared/algorithms/namesParser.ts), [contextMatching](../../../src/shared/algorithms/contextMatching.ts), [glossaryCompliance](../../../src/shared/algorithms/glossaryCompliance.ts), [glossaryService](../../../src/main/services/context/glossaryService.ts), [glossaryHandlers](../../../src/main/ipc/handlers/glossary.ts), [GlossaryScreen](../../../src/renderer/src/features/glossary/GlossaryScreen.tsx).

### Lưu và phục hồi

- `node:sqlite` trong main: `library.db` (chỉ mục dựng lại được; **version 4**, có ba bảng `ai_connection`/`ai_key`/`ai_model`) và một tệp `.mira` mỗi tác phẩm (**schema v6**: v4 thêm `chapter_text.size` và index phủ để danh sách chương biết chương nào có nội dung mà không đọc văn bản; v5 thêm bảng `image`; v6 thêm bảng `context_entry` và `context_alias`). WAL, `synchronous=FULL`, migration theo `user_version`; nâng cấp tại chỗ đã kiểm chứng trong Electron thật. Snapshot đóng băng schema ở [`__fixtures__`](../../../src/main/infra/storage/__fixtures__) (`library` v1–v4, `work` v1–v6).
- Test kill tiến trình đang ghi: không mất thay đổi đã xác nhận, không tệp dở. Chưa thử mất điện đột ngột.
- Bằng chứng: [storage](../../../src/main/infra/storage), [LibraryStore](../../../src/main/services/library/library.ts), [crash test](../../../src/main/services/library/crash.test.ts), [ADR-003](../decisions/0003-technology-stack.md).
- Chưa có: autosave, lịch sử có giao diện. Bảng xưng hô thêm tiếp ở module Xưng hô ([lộ trình](../delivery/roadmap.md)).

### Minh họa “Sắp có”

- “Nhập từ .txt” và hai khu vực Nguồn/Tác vụ là minh họa: không đọc tệp, không gọi IPC, không ghi dữ liệu (khu vực Ngữ cảnh: tab Thuật ngữ đã là màn thật từ Module 3, các tab khác còn là minh họa). Test bảo đảm mỗi mục có một hàng trong [backlog](../delivery/backlog.md) (`mockFeatures.test.ts`, `workAreas.test.ts`).
- Mock của mode Từng câu (`SentenceModeMocks`: thanh lọc, panel gợi ý) vẫn nằm trong danh sách này tới khi mode bị gỡ ở (Gỡ Từng câu).
- Bằng chứng: [mockFeatures](../../../src/renderer/src/features/work/mockFeatures.ts), [ImportTxtMockDialog](../../../src/renderer/src/features/work/ImportTxtMockDialog.tsx).

### Thiết kế

Token, font local, component Base UI ([tokens](../../../src/renderer/src/styles/tokens.css), [components](../../../src/renderer/src/components)). Màn preview design system đã gỡ ngày 2026-09-29. Chưa có nghiệm thu editor dài, IME và accessibility cho các phần mới.

### Build và kiểm tra

- electron-vite; `node:sqlite` và `valibot` là external; bản `--dir` (asar) mở được và tạo dữ liệu.
- **1620 test** Vitest (đo 2026-10-04, sau Module 4 Xưng hô) chạy bằng `node scripts/check.mjs` (typecheck hai project, test hai pha, lint, và build với `--build`); một bước không có bằng chứng đã chạy là thất bại. `pnpm test/lint/typecheck` toàn cục có thể in cảnh báo rồi thoát mã 0 mà không chạy gì; xem `AGENTS.md`.
- `scripts/smoke-sqlite.mjs` kiểm tra `node:sqlite` trong Electron thật.
- **Bộ đo chất lượng dịch:** analyzer thuần ở `src/shared/algorithms/`; runner thử nghiệm ở
  `scripts/bench/`. Compare mặc định chỉ báo metric; `legacy-e6` là policy lịch sử tùy chọn. Cách
  dùng, contract và giới hạn nằm ở [module Bộ đo](../../modules/measurement/README.md).
- Bằng chứng build: [electron-builder.yml](../../../electron-builder.yml),
  [smoke script](../../../scripts/smoke-sqlite.mjs), [check.mjs](../../../scripts/check.mjs).
- Chưa có: bản NSIS trên máy thử lỗi giải nén `winCodeSign` do thiếu quyền tạo symlink (bật Developer Mode); bản có ký, updater, kiểm thử máy sạch.

### Cấu trúc mã nguồn

- `main` chia bốn tầng `infra` < `services` < `ipc` < `electron`, `shared` chia `contracts` / `algorithms`; mọi ranh giới do `no-restricted-imports` ép (chỉ `electron/` và `index.ts` import `electron`). Handler IPC mỗi khu vực một tệp, khai kiểu theo tiền tố kênh nên quên một handler là lỗi biên dịch. `createServices` dựng các service AI từ một library và một `SecretCrypto` được tiêm, không cần Electron. `LibraryStore` (354 dòng) chỉ còn nghiệp vụ một tác phẩm; tệp tác phẩm và `library.db` do `WorkFiles` giữ.
- Bằng chứng: [WorkFiles](../../../src/main/infra/storage/workFiles.ts), [eslint.config.mjs](../../../eslint.config.mjs), [createServices](../../../src/main/services/createServices.ts), [handlers](../../../src/main/ipc/handlers), [kiến trúc](architecture.md#cấu-trúc-mã-nguồn-và-luật-ranh-giới).
- Chưa có: `services`/`infra` ở `utilityProcess`; luật chỉ so khớp chuỗi nên đường dẫn bí danh có thể lách.

## Điểm vào cho lần phát triển tiếp

Đọc [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md), [kiến trúc AI-first](ai-first-architecture.md) và [lộ trình](../delivery/roadmap.md). Việc kế tiếp theo lộ trình đổi ngày 2026-10-03 (chất lượng dịch trước luồng ghi): thu fixture văn bản thật ZH/JA/EN và dựng **Bộ đo** (cũng chốt định nghĩa đoạn), rồi **Lõi dịch**, **Thuật ngữ**, **Xưng hô**; sau đó mới tới **Đề xuất**. Kiểm chứng chat chạy song song, không chặn. Ràng buộc giữ nguyên: đường dịch MVP còn ghi theo hàng nên phải có đường đề xuất trước khi gỡ segment (Gỡ Từng câu).

Khi một module làm xong: cập nhật dòng tương ứng ở trên bằng bằng chứng file/API, luồng đã chạy, trường hợp lỗi và giới hạn. Chỉ ghi “đã triển khai” cho đúng phạm vi; build thành công không chứng minh dữ liệu an toàn.

---

[Mục lục handbook](../README.md)
