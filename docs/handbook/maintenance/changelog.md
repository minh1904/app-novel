# Nhật ký handbook

## 2026-10-06 — Hạn chế mày/tao trong quan hệ thầy trò

- Chốt giáo viên hiện đại "thầy/cô – em", giáo viên cộc có thể "thầy/cô – cậu"; mày/tao chỉ theo
  ngoại lệ đã duyệt. Giữ độ gắt bằng từ ngữ, không làm nhẹ tình tiết; Unya – Akira chốt "cô – cậu" /
  "em – cô", thay lựa chọn còn mở ngày 05/10.
- Áp luật cho dịch và chat `v1`/`v2`, thêm ghi chú cặp vào `v1` và ba ví dụ tự soạn cho `ja-modern`.
  Cập nhật [quyết định xưng hô](../../modules/context/vietnamese-addressing.md) và
  [hệ thống prompt](../../modules/context/prompt-system.md). Chưa đo lại chất lượng bằng model.

## 2026-10-05 — Xưng hô tiếng Việt theo bối cảnh

- Chủ sản phẩm chốt: đổi cặp theo mốc truyện; quan hệ quyết định cặp, đại từ gốc quyết định mức thô;
  không "tôi – bạn" trong thoại; cho đổi giữa cảnh; ngôi ba và giọng vùng miền theo bối cảnh và tính
  cách; phân loại theo bối cảnh chứ không theo thể loại.
- Thêm [Xưng hô tiếng Việt](../../modules/context/vietnamese-addressing.md): nghiên cứu ngôn ngữ học,
  cộng đồng dịch, công cụ AI và kho gốc; năm bộ mặc định; số đo trên n5955en.
- Prompt `v2` thêm thẻ nhân vật, luật xưng hô chung, bảng mặc định theo bối cảnh và chốt dấu thoại
  tiếng Nhật. Mira Lab nạp nhân vật và cặp xưng hô từ tệp, có biến thể thinking và `--batch-tokens`.
- Khảo sát bản dịch fan (docln, Sonako, bản edit truyện Trung) và cặp "cô – mày"; chốt tạm mặc định cổ
  trang, fantasy, học đường và thêm bộ `ja-court`. "cô – mày" và hậu tố trong fantasy còn chờ chốt.

## 2026-10-05 — Nghiên cứu và dựng lại hệ thống prompt

- Thêm [hệ thống prompt](../../modules/context/prompt-system.md): hiện trạng, đối chiếu LinguaGacha,
  GalTransl, AiNiee, Sakura, NovelCrafter, Sudowrite và hướng dẫn nhà cung cấp; thiết kế `v2`.
- Một bộ dựng request cho dịch; lượt hỏi lại ID thiếu mang cùng glossary và xưng hô (sửa lỗi, áp cả
  `v1`); trace đề xuất ghi phiên bản prompt; Bộ đo ghi hash của prompt đã gửi thật.
- `v2` (system cố định, ngữ cảnh trong user có thẻ, đoạn trước, profile ngôn ngữ × thể loại, chat đặt
  ngữ cảnh cuối) bật bằng `MIRA_PROMPT_VERSION`/`MIRA_BENCH_PROMPT_VERSION`; mặc định vẫn `v1` tới
  khi đo.
- Chat tự đọc glossary và xưng hô đã duyệt của truyện từ kho (khớp theo chương), gửi kèm, ghi vào lượt
  và hiện trong mục “Đã gửi kèm”; áp cả `v1`.

## 2026-10-05 — Composer chat viết thẳng vào editor

- Chủ sản phẩm chốt: gửi trong composer mặc định là Tạo đề xuất và đề xuất mở ngay tại editor; bỏ
  khối xem nguồn gửi kèm và nút thêm nguồn từ chương khác. Cập nhật
  [quyết định Module Đề xuất](../../modules/proposals/decisions.md) (mục 7–8), luồng duyệt và hiện trạng.

## 2026-10-05 — Status bar cho editor chương

- Chủ sản phẩm chốt năm câu hỏi của bản phân tích Obsidian; thêm status bar dưới màn chương (số chữ,
  trạng thái lưu, đề xuất AI chờ). Cập nhật [module Hệ thiết kế](../../modules/design-system/README.md).

## 2026-10-05 — Làm lại hệ thiết kế theo phân tích Obsidian

- Token ba tầng, khung một màu, hover lớp phủ, thang chữ/radius/shadow có tên; các màn chuyển sang
  token và `tokens.test.ts` chặn giá trị tùy ý. Cập nhật [module Hệ thiết kế](../../modules/design-system/README.md),
  hiện trạng và quyết định.

## 2026-10-05 — Phân tích design system Obsidian

- Thêm [phân tích và so sánh](../../modules/design-system/obsidian-comparison.md): giá trị đo từ
  `app.css` Obsidian 1.13.7, độ lệch của token và component Mira, đề xuất làm lại chờ chốt.

## 2026-10-05 — Hệ thiết kế giao diện theo hướng Obsidian

- Đối chiếu tài liệu token chính thức của Obsidian; tách quan sát nguồn khỏi ánh xạ semantic của
  Mira tại [module Hệ thiết kế](../../modules/design-system/README.md).
- Chuyển hai theme sang thang màu trung tính, accent tím và nhịp 4 px; cập nhật component dùng chung,
  thanh tab, màn tác phẩm và cỡ chữ editor. Hồ sơ palette Solar Docs được đánh dấu superseded.

## 2026-10-05 — Triển khai tab theo tác phẩm (`work-tabs`)

- Mỗi truyện có một tab trong titlebar; lưu và khôi phục phiên tab qua Main/SQLite, xử lý tab hoặc
  chương đã mất, chuyển tab giữ bản sửa chưa lưu, guard theo tab và phiên AI theo tác phẩm.
- Bổ sung [module Phiên làm việc](../../modules/workspace/README.md). JobRunner và khu vực Tác vụ
  thật vẫn thuộc Module 7.

## 2026-10-05 — Chốt hướng tab theo tác phẩm

- Chủ sản phẩm đồng ý mở mỗi truyện trong một tab riêng, giữ vị trí và bản sửa khi chuyển tab; đóng tab không điều khiển tác vụ nền.
- Tạo change [`work-tabs`](../../../openspec/changes/work-tabs/proposal.md) để đặc tả riêng trước Module 7.

## 2026-10-05 — Triển khai Module 6: Xuất định dạng tiểu thuyết (`export-novel-formats`)

- Hoàn thành Module 6 (Xuất) theo lộ trình phát triển, mở rộng theo yêu cầu người dùng:
  - **4 định dạng chuẩn Novel Ebook**: TXT (UTF-8 thuần), Markdown (`.md`), Microsoft Word (`.docx`), và PDF (`.pdf`).
  - **Cấu trúc chuẩn Ebook Novel**: Trang thông tin đầu tác phẩm (Tên truyện, Tác giả, Lời giới thiệu), ngắt trang bắt buộc giữa các chương (với DOCX và PDF), thụt lề đầu dòng đoạn văn (`1.8em` / `0.5 inch`) hoặc cách đoạn thanh lịch.
  - **Dịch vụ xuất Main Process**: `ExportService` đọc trực tiếp từ `LibraryStore`, điều phối qua 4 formatter chuyên biệt (`txtFormatter`, `markdownFormatter`, `docxFormatter`, `pdfFormatter`).
  - **PDF Native**: Sử dụng `webContents.printToPDF` của Electron in từ HTML template với CSS Paged Media `@page` (khổ A5/A4, lề chuẩn sách, typography tiếng Việt sắc nét, chân trang đánh số trang tự động). Không phụ thuộc binary ngoài.
  - **Word DOCX**: Sử dụng thư viện `docx` tạo tệp Office OpenXML chuẩn với Heading styles và ngắt trang.
  - **Giao diện người dùng**: Hộp thoại `ExportDialog` dùng chung cho cả xuất 1 chương (trong `ChapterWorkspace`) và xuất toàn tác phẩm (gộp 1 tệp hoặc tách thư mục tệp riêng lẻ trong `WorkDetailScreen`).
  - **Kiểm chứng toàn vẹn (Round-trip Fidelity)**: Kiểm chứng 100% không mất chữ, không mất ký tự hay dấu câu khi xuất TXT/MD rồi nhập lại qua bộ giải mã.

## 2026-10-05 — Mode Áp dụng thẳng

- Chủ sản phẩm bổ sung mode Áp dụng thẳng cho chat và lượt dịch. Cập nhật
  [quyết định Module Đề xuất](../../modules/proposals/decisions.md) và OpenSpec `proposals`:
  mọi kết quả có hồ sơ đề xuất; mode này tự Accept qua cùng kiểm tra xung đột, phần không an toàn
  ở lại hàng chờ.

## 2026-10-04 — Module Đề xuất và phiên AI

- Chủ sản phẩm chốt [quyết định mới](../../modules/proposals/decisions.md): mọi kết quả AI thay chữ
  đều chờ duyệt, kể cả pane trống; Accept all theo chương và hành động riêng cho lượt dịch; lịch sử
  phiên theo tác phẩm, mở lại để tiếp tục. Quyết định này thay ngoại lệ pane trống và Q5 của ADR-005.
- Tổng hợp luồng, phiên, dữ liệu, bằng chứng và câu hỏi kỹ thuật tại
  [docs/modules/proposals](../../modules/proposals/README.md). Roadmap và mục 5.1 của kiến trúc cũ
  được rút thành liên kết; ADR-005 giữ nguyên như hồ sơ lịch sử có ghi phần bị thay.
- Đối chiếu mã panel với tài liệu VS Code, Notion và Antigravity trong
  [nghiên cứu panel AI](../../modules/proposals/chat-panel-research.md); ghi nhận vấn đề hiển thị
  text thuần và cách chọn ngữ cảnh, cùng đề xuất UX chưa chốt.

## Triển khai Module 4: Xưng hô (`characters-and-addressing`) — 2026-10-04

- Hoàn thành lát 2 của `context-core` theo lộ trình (Module 4: Xưng hô):
  - **Mô hình Dữ liệu & Tầng Lưu trữ**: Tận dụng schema tác phẩm v6 (`context_entry`, `context_alias`), lưu trữ các mục nhân vật (`kind = 'character'`: tên gốc, tên dịch, giới tính, vai vế, ghi chú và các bí danh `aliases`) và các quan hệ xưng hô đối thoại có chiều độc lập (`kind = 'dyad'`: `characterA -> characterB`, từ tự xưng `speaker_pronoun`, từ gọi đối phương `recipient_pronoun`, độ trang trọng/sắc thái, phạm vi chương bắt đầu `from_chapter_id` và kết thúc `to_chapter_id`, trạng thái duyệt). Cài đặt `addressingEntries.ts` với đầy đủ CRUD và truy vấn `getEffectiveDyadsForChapter`.
  - **Tích hợp Lõi dịch & Bảo vệ Quyền riêng tư**:
    - Cài đặt `formatAddressingLayerB` trong `src/main/services/ai/translate/promptBuilder.ts`, tiêm ma trận xưng hô của chương vào Tầng B của system prompt (`[Quy ước xưng hô & đối thoại trong chương]`).
    - Nối `getEffectiveAddressing` từ `LibraryStore` vào luồng dịch chương `ChapterTranslator` (`chapterTranslation.ts`).
    - Cam kết quyền riêng tư nghiêm ngặt: Các nhân vật và cặp xưng hô chưa duyệt (`pending`, `rejected`) tuyệt đối không bao giờ được đưa vào prompt gửi ra ngoài.
  - **Thuật toán Kiểm tra Tuân thủ Thuần**: Cài đặt `addressingCompliance.ts` trích xuất các câu thoại đối thoại (ngoặc kép, gạch đầu dòng) và phát hiện các đại từ ngoài ma trận hoặc sự không nhất quán giữa các đại từ tự xưng/gọi đối phương theo các quy ước xưng hô đang hoạt động.
  - **Dịch vụ & Kênh IPC**: Cài đặt `AddressingService` tại `src/main/services/context/addressingService.ts`, các kênh IPC `addressing:characters:*`, `addressing:dyads:*`, `addressing:checkCompliance` và preload bridge `window.mira.addressing`.
  - **Giao diện Người dùng (Addressing Screen)**:
    - `AddressingScreen.tsx`, `AddressingDialogs.tsx`, `useAddressing.ts`: Quản lý danh sách nhân vật, lưới quan hệ xưng hô hai chiều, bộ lọc theo chương, bộ lọc trạng thái (`all`, `approved`, `pending`, `rejected`), duyệt nhanh tại chỗ, tạo/sửa/xóa nhân vật và cặp quan hệ.
    - Thay thế khu vực minh họa mockup tab "Xưng hô" trong `ContextAreaMock.tsx` bằng `AddressingScreen` thật kết nối SQLite qua IPC.
- Kết quả kiểm tra toàn diện: 1620 test Vitest đạt (116 test files, tăng 24 test), `tsc` (node, web, scripts) đạt, `eslint` 0 lỗi, electron-vite build 3 bundle thành công.

## Triển khai Module 3: Thuật ngữ (`glossary`) — 2026-10-04

- Hoàn thành lát 1 của `context-core` theo lộ trình (Module 3: Thuật ngữ):
  - **Schema SQLite v6 và Tầng Lưu trữ**: Nâng cấp schema tác phẩm (`workSchema.ts`) lên v6, bổ sung bảng `context_entry` (thuật ngữ, dạng ghi, cấm dùng, hiệu lực từ/đến chương, trạng thái duyệt) và `context_alias` (các dạng viết khác). Cài đặt `contextEntries.ts` với đầy đủ CRUD, truy vấn hiệu lực theo khoảng chương và cập nhật snapshot fixture v6.
  - **Thuật toán Phân tích & So khớp**:
    - `namesParser.ts`: Đọc và phân tích định dạng `Names.txt` (`Từ_gốc=Từ_dịch`), bỏ qua comment `#`, `//`, báo cáo chi tiết các dòng bỏ qua.
    - `contextMatching.ts`: So khớp thuật ngữ trong văn bản nguồn với chiến lược longest-match cho CJK, ranh giới từ `\b` cho Latin/EN, chặn từ quá ngắn, khớp qua alias.
    - `glossaryCompliance.ts`: Kiểm tra tuân thủ thuật ngữ trên bản dịch, cảnh báo thiếu bản dịch đích hoặc xuất hiện thuật ngữ bị cấm (`forbidden`).
  - **Tích hợp Lõi dịch & Bảo vệ Quyền riêng tư**:
    - Tiêm các thuật ngữ đã duyệt (`approved`) vào Tầng C (`formatGlossaryLayerC`) trong `promptBuilder.ts`.
    - Tính toán `contextHash` (SHA-256) ghi nhận chính xác ngữ cảnh đưa vào prompt.
    - Cam kết quyền riêng tư: Các thuật ngữ chưa duyệt (`pending`, `rejected`) tuyệt đối không bao giờ được gửi tới nhà cung cấp AI.
  - **Dịch vụ & Kênh IPC**: `GlossaryService` tại `src/main/services/context/glossaryService.ts`, các kênh IPC `glossary:*` (`list`, `get`, `create`, `update`, `delete`, `importNames`, `checkCompliance`) và preload bridge `window.mira.glossary`.
  - **Giao diện Người dùng (Glossary Screen)**:
    - `GlossaryScreen.tsx`, `GlossaryDialogs.tsx`, `useGlossary.ts`: Tìm kiếm, bộ lọc trạng thái (`all`, `approved`, `pending`, `rejected`), duyệt nhanh, tạo mới, chỉnh sửa, xóa và modal nhập tệp `Names.txt`.
    - Thay thế khu vực minh họa trong `ContextAreaMock.tsx` bằng `GlossaryScreen` thật nối kho SQLite qua IPC.
- Kết quả kiểm tra toàn diện: 1596 test Vitest đạt (114 test files, tăng 73 test), `tsc` (node, web, scripts) đạt, `eslint` 0 lỗi, electron-vite build 3 bundle thành công.

## Triển khai Module 2: Lõi dịch (`translation-core`) — 2026-10-04

- Triển khai toàn bộ các mốc L0–L6 của Lõi dịch theo đúng OpenSpec và roadmap:
  - **Mốc L0 · Làm sạch đường đo và runner dịch**: Cập nhật `scripts/bench/translate.run.ts` khớp API hiện hành (`LibraryStore.create`, `ChapterTranslator.plan/runBatch` nhận object); bổ sung typecheck độc lập cho scripts trong `scripts/check.mjs` (`tsconfig.scripts.json`); bổ sung test offline mock runner `translateRunnerMock.test.ts` xác thực qua bộ kiểm tra T0 (`alignParagraphs`, `checkStructure`, `checkResidualSourceChars`).
  - **Mốc L1 · Tách một đường dịch**: Xây dựng module lõi `src/main/services/ai/translate/` với `types.ts`, `promptBuilder.ts`, `translationCore.ts`; triển khai bộ parser khoan dung `src/shared/algorithms/lenientParser.ts` (xử lý markdown fence, trailing comma, alias thuộc tính, key dạng id); triển khai đối soát ánh xạ ID tạm `[n]` về ID gốc `src/shared/algorithms/translateReconcile.ts`; nối `ChapterTranslator` với lõi dịch qua adapter và bảo toàn các dòng đã bảo vệ/đã soát của người dùng.
  - **Mốc L2 · Bảo toàn đoạn và lô**: Xây dựng `src/shared/algorithms/translatePlanner.ts` chia lô theo trần token và trần đơn vị, hỗ trợ cắt đoạn dài thành các mảnh tạm và ráp nối lại đúng ID gốc; triển khai vòng sửa lỗi (repair loop) đúng 1 lần cho các ID bị thiếu hoặc phản hồi lỗi trong `translationCore.ts`; phân định rõ ranh giới lỗi hạ tầng (gateway retry/cooldown) và lỗi nội dung (lõi dịch sửa lỗi).
  - **Mốc L3–L6 · Prompt, tham số và nghiệm thu**: Prompt builder có version `translate-v1` và hash SHA-256; hỗ trợ các tầng ngữ cảnh (A tác phẩm, B chương, C theo lô) và chỉ dẫn ngôn ngữ riêng (JA giữ hậu tố kính ngữ -san/-kun/-chan..., ZH dịch chuẩn Hán Việt, EN tự nhiên); ghi nhận tham số thực gửi và bảo vệ bí mật API key trong runner.
- Kết quả kiểm tra toàn diện: 1551 test Vitest đạt (105 test files), `tsc` (node, web, scripts) đạt, `eslint` 0 lỗi.

## Chi tiết hóa roadmap Lõi dịch — 2026-10-04

- Cập nhật [lộ trình](../delivery/roadmap.md#2-lõi-dịch) thành bảy mốc L0–L6: hợp đồng và
  baseline, tách đường dịch, bảo toàn đoạn/lô, prompt, tham số, sửa mục lỗi, nối app.
- Cổng chất lượng dùng T0 và người chấm mù; T1 chỉ là tín hiệu phụ trong khi chưa hiệu chuẩn.
  Ghi rõ adapter segment hiện tại và phép đo theo đoạn trước khi module Đề xuất đổi đường ghi.
- Mốc L0 yêu cầu sửa runner dịch của Bộ đo theo API hiện hành và kiểm bằng mock trước khi lấy
  baseline mới; output B1/B2a/B3 giữ vai trò bằng chứng lịch sử.
- Đây là kế hoạch đề xuất; chưa tạo change Lõi dịch hoặc thay mã ứng dụng.

## Hoàn tất hạ tầng offline của Bộ đo — 2026-10-04

- Chuẩn hóa fixture, analyzer T0, runner/replay/compare và trang T3; 1523 test Vitest đạt.
- Compare mặc định chỉ báo metric; policy `legacy-e6` chỉ dùng tái hiện kết quả cũ.
- V14 giữ định nghĩa đoạn ADR-005. T1 vẫn ghi “chưa hiệu chuẩn” cho tới khi có A/A live ngoài họ
  model dịch và đối chiếu người.
- Tài liệu chuẩn: [module Bộ đo](../../modules/measurement/README.md) và
  [kết quả lịch sử](../../modules/measurement/results.md).

## Chốt mặc định kính ngữ Nhật theo lựa chọn người dịch — 2026-10-04

- Chủ sản phẩm chốt bốn chế độ cấp tác phẩm: giữ hậu tố Nhật, Việt hóa, lai theo quy tắc và tùy
  chỉnh; khi chưa có yêu cầu, mặc định giữ hậu tố. Cập nhật [quyết định hiện hành](../product/decisions.md)
  và thu hẹp câu hỏi mở.
- Phân loại tám trường hợp trong [nghiên cứu Nhật → Việt](../research/ja-vi-translation.md), gồm hậu
  tố gắn tên, chức danh đứng độc lập, thân tộc, kính ngữ trong động từ, chuyển cách gọi, thiếu dữ
  kiện, người thứ ba và chơi chữ. “Thống nhất” là thống nhất chiến lược, không xóa biến đổi có nghĩa.
- Ghi nhận thảo luận cộng đồng do chủ sản phẩm cung cấp là quan sát chưa xác minh, không phải khảo
  sát đại diện hay mẫu dịch người. Chưa triển khai UI, schema, prompt hoặc checker.

## Khôi phục và đối chiếu tài liệu dịch thuật tháng 6 — 2026-10-04

- Fetch và pull `--ff-only`: không có cập nhật mới. Tìm commit thêm tài liệu `9244b07` ngày
  11/06/2026 và commit xóa khi tổ chức lại `45eb7e9` ngày 23/09/2026. Không reset hoặc đổi nhánh.
- Khôi phục tám tệp vào [bản lưu lịch sử](../research/archive/2026-06-11/README.md), không ghi đè
  quyết định hiện hành. Ghi nguồn và không coi các ví dụ cũ là bản dịch người đã xác minh.
- Thêm [đối chiếu và nghiên cứu mở rộng](../research/translation-research-lineage.md): phân biệt
  quan hệ nguồn, cách gọi tại cảnh và lựa chọn bản Việt; giới hạn suy người nghe, tri thức theo mốc,
  provenance corpus và bảy phép thử đề xuất. Bổ sung S41, chưa chạy benchmark hoặc đổi app.

## Thẩm định repo dịch Việt Nam — 2026-10-04

- Thêm [khảo sát repo](../research/vietnamese-translation-repos.md), ghi tệp/commit đã đọc,
  phân biệt nguồn người dịch và công cụ AI; không lấy output hay “golden samples” chưa rõ tác giả
  làm chuẩn văn phong. Ghi nhận Prima Doll có cặp JP/VN và credit, CLANNAD có cặp Việt/Anh trong
  phần script đã đọc, Higurashi có người dịch Nhật và thân chương Việt đọc được.
- Sửa mức chắc chắn của nghiên cứu trước: chưa đọc thân chương Hako hoặc mẫu toàn văn sách phát
  hành; nhãn trang không đủ chứng nhận xuất xứ. Chưa xác minh mô tả miền TALPCo.
- Đề xuất kiểm xưng hô có chiều, lời kể/thoại, ngoại lệ theo cảnh và báo động nhầm. Bổ sung S40.
  Chỉ thay tài liệu; chưa triển khai, chạy benchmark, chốt preset hay sao chép corpus.

## Nghiên cứu chuyên cặp Nhật → Việt — 2026-10-04

- Thêm [Dịch truyện Nhật → Việt](../research/ja-vi-translation.md), tách quan sát có nguồn khỏi
  đề xuất rubric/fixture và khỏi quyết định sản phẩm.
- Theo chỉ đạo của chủ sản phẩm, khóa nguồn học ở **bản dịch người**: bản phát hành có ghi dịch giả/
  hiệu đính và fan-trans thuộc mục Truyện dịch, ưu tiên bản trực tiếp từ tiếng Nhật. Loại bản AI,
  máy dịch/convert, output công cụ, nguồn không rõ và bản dịch vòng qua tiếng Anh khỏi corpus học.
  B1/B2a chỉ dùng làm bằng chứng lỗi cần tránh, không dùng làm mẫu văn phong.
- Kết luận đợt đầu: xưng hô là dữ liệu quan hệ; lược chủ thể và ngôn ngữ vai là hai rủi ro nghĩa lớn;
  kính ngữ, dấu thoại và thứ tự tên chưa có một chuẩn cộng đồng duy nhất; tên katakana cần glossary
  theo tác phẩm thay vì chọn lại ở từng lượt gọi.
- Đề xuất mở rộng fixture Nhật theo bảy lát cắt và tách lỗi đúng nghĩa khỏi lựa chọn biên tập. Chưa
  đổi prompt, code, spec hay preset; chưa chọn mặc định giữ/Việt hóa kính ngữ.
- Bổ sung nguồn S39. Chỉ đọc nguồn công khai; không tải hoặc lưu chương truyện có bản quyền.

## Thí nghiệm prompt B2a và luật "trượt vị trí" của bộ chấm — 2026-10-03

- **Đổi gì:**
  - Thêm mục B2a ở [chất lượng dịch](../research/translation-quality.md#b2a--quy-ước-tiếng-việt-trong-system-prompt-2026-10-03).
  - Bộ chấm `scripts/bench/score.ts` coi một lần là **trượt vị trí** khi số đoạn bằng nhau nhưng hơn 15% đoạn lệch độ dài; B1 và B2a đều đã được chấm lại theo luật này.
  - Đánh dấu xong việc 2 ở lộ trình.
- **Kết quả:** 5 chương tiếng Nhật × 3 lần, system prompt có quy ước tiếng Việt.
  - Sửa được: thoại “…” ở 15/15 lần (B1: 「」 hoặc lẫn kiểu ở 8/15 lần), 母様 chỉ còn "mẹ", 伯父上 thành "bác" (đúng vai vế).
  - Không sửa được: tên Irene/Irène lẫn nhau ở mọi chương; おば様 vẫn không ra "mợ".
  - Xấu đi: sót 14 câu (B1: 0); ghép được từng đoạn 7/15 (B1: 11/15); token ra +37%, thời gian ×1,6.
  - Nguyên nhân sót câu: model gộp câu khi được bảo "viết tự nhiên", mà app gửi theo đơn vị câu.
- **Hệ quả:** không giữ B2a nguyên trạng (E6). Lõi dịch phải đổi đơn vị sang đoạn trước khi thêm chỉ dẫn văn phong; tên và quan hệ phải đi qua glossary và ma trận xưng hô.

## Dựng lại motion reel Mira — 2026-10-04

- Theo yêu cầu làm lại sau phản hồi video 60 giây chưa hấp dẫn: tạo reel 15 giây bản 2, 1080p60, chữ và chuyển động đồ họa, nhạc mới; tham khảo nhịp video Revid người dùng gửi. Tài sản reel cũ không còn nằm trong repo.
- Không dùng footage/âm thanh nguồn. Đã kiểm khung hình và giải mã đủ 900 khung; bản mới chưa được chủ sản phẩm nghiệm thu. Không thay mã ứng dụng.

## Fixture, công cụ đo tạm và baseline đầu tiên — 2026-10-03

- **Đổi gì:**
  - Thêm [`fixtures/`](../../../fixtures/README.md). Phần công khai gồm 孔乙己 và 西遊記 hồi 2 (lấy từ Wikisource, phạm vi công cộng) và một đoạn fantasy của WMT24++ có bản tham chiếu tiếng Việt (Apache-2.0). Phần riêng tư ở `fixtures/private/` (bị ignore) gồm 5 chương Nhật do chủ sản phẩm gửi.
  - Thêm công cụ tạm [`scripts/bench/`](../../../scripts/bench/): dịch fixture qua đúng đường MVP của app rồi chấm bằng kiểm tất định; chấm lại được; thay được system prompt.
  - Thêm mục "Kết quả đo của Mira" ở [chất lượng dịch](../research/translation-quality.md). Cập nhật lộ trình (module Bộ đo đang làm), hiện trạng và câu hỏi mở về fixture.
  - Commit `4ff6fd5` (fixture) và `d7954e6` (công cụ).
- **Kết quả B1:** Gemini 2.5 Flash, prompt 5 câu, 8 chương × 3 lần.
  - Cấu trúc khá ổn: số đoạn khớp 20/24, sót 2 câu, 2 lô JSON hỏng (gửi lại được).
  - Lỗi chính là **thiếu nhất quán**: ít nhất 4 kiểu trình bày thoại; tên nhân vật chính trôi từ "Irene" sang "Irène"/"Irenne"; 母様 lúc "mẹ" lúc "mẫu thân"; おば様 chưa lần nào ra "mợ".
  - 567 nghìn token ra cho 209 nghìn token vào (phần lớn là thinking), khoảng 1,5 USD.
- **Lỗi thật tìm thấy trong công cụ của chính tôi:**
  - Script lấy chữ từ Wikisource bỏ mất đoạn đầu của 孔乙己, vì dòng tiêu đề trang nằm chung khối với đoạn đầu.
  - Quy tắc "1919" quá chặt, không nhận "một ngàn chín trăm mười chín".
  - Phép kiểm "sót chữ nguồn" bỏ lọt 「」, nên phải thêm phép kiểm dấu câu nguồn.

  Cả ba đã sửa. Hai cái đầu bị bộ kiểm chéo fixture và lần chạy thử bắt được.
- **Chưa làm / chưa kiểm:**
  - Chưa có giám khảo LLM và người chấm.
  - Glossary và xưng hô của fixture chưa được chủ sản phẩm duyệt.
  - Chưa có truyện mạng tiếng Trung hiện đại trong fixture.

## Đổi thứ tự lộ trình: chất lượng dịch trước luồng ghi; nghiên cứu chất lượng dịch — 2026-10-03

- **Quyết định (chủ sản phẩm, qua trao đổi):** cải thiện khả năng dịch trước khi làm kỹ luồng áp dụng đề xuất. Đo trước khi cải tiến; thuật ngữ trước xưng hô; bộ đệm prompt là phép đo, không phải tính năng riêng. Ghi ở [quyết định hiện hành](../product/decisions.md), dòng "Cách làm". Cách chia module là đề xuất, chốt từng module khi viết change.
- **Đổi gì:**
  - Viết lại [lộ trình](../delivery/roadmap.md) thành 11 module, ba giai đoạn:
    - **Chất lượng dịch:** Bộ đo → Lõi dịch → Thuật ngữ → Xưng hô.
    - **Ghi vào văn bản:** Đề xuất → Xuất → Tác vụ → Gỡ Từng câu → QA.
    - **Ngữ cảnh tự học:** Ngữ cảnh tự động → Văn phong.
  - Lộ trình có thêm: cổng thử với dịch giả, mục "việc song song", mục "bộ đệm nằm ở đâu", và bảng ánh xạ số module cũ.
  - Thêm nghiên cứu [chất lượng dịch](../research/translation-quality.md) và nguồn S36–S38.
  - [Kiến trúc AI-first](../engineering/ai-first-architecture.md) mục 10 thu về các ràng buộc kỹ thuật, để thứ tự chỉ nằm ở một chỗ.
  - [Hiện trạng](../engineering/current-state.md) và câu hỏi mở gọi module **bằng tên** thay vì số.
  - Thêm bốn câu hỏi mở (fixture, giám khảo, quy ước tiếng Việt còn tranh cãi, luồng áp dụng chưa ổn ở đâu), V16–V19 ở [kế hoạch kiểm chứng](../delivery/validation.md), và ghi chú đầu change `context-core` (tách thành Thuật ngữ và Xưng hô, đi trước Đề xuất).
- **Kết luận chính của nghiên cứu:**
  1. Chưa có metric nào được kiểm chứng cho văn học →Việt, và metric lẫn LLM-judge đều lệch khỏi người ở văn học. Vì vậy đo ba tầng: kiểm tất định, giám khảo LLM so cặp mù khác họ model dịch, và người chấm 60–80 cặp.
  2. Thinking không giúp dịch một lượt. Gemini 3 không tắt được thinking, và `max_tokens` chặn cả thinking.
  3. Tầng A khoảng 1.200–2.500 token, dưới ngưỡng cache 4.096 của Gemini 3.x, nên cache trên Gemini 3 cần tầng B.
  4. Refine chủ yếu làm văn mượt hơn, còn độ đúng nghĩa không tăng hoặc giảm. Bản đầu không có refine cả chương; thay bằng kiểm tất định rồi dịch lại đúng đoạn bị cờ.
  5. Các nguồn đồng thuận: tên gốc Trung đọc Hán-Việt, không pinyin. Chỗ còn tranh cãi ("y", kiểu thoại, kính ngữ) làm thành cài đặt.
- **Sửa cho khớp hiện trạng:** hiện trạng và câu hỏi mở từng ghi chat "chưa gọi nhà cung cấp thật lần nào", trong khi chính trang hiện trạng có bằng chứng ảnh chụp chat với `usage` thật. Đã sửa thành "một bằng chứng; task kiểm chứng chưa đóng". Các task đó chuyển về mục "việc song song" của lộ trình, vì change `ai-chat` đã bị gỡ khỏi `openspec/changes/`.
- **Chưa làm / chưa kiểm:**
  - Chưa chạy model, metric hay thí nghiệm nào; chưa có fixture.
  - Ba agent đọc web phần lớn qua công cụ tóm tắt; chỉ các hàng † đã đối chiếu số trên văn bản thô.
  - Tên model đời mới và giá chỉ đọc qua trang giá, và giá đổi nhanh.
  - Không đổi ADR, code hay spec chính.
  - Chưa commit.

## Lưu trữ hai spec của lớp AI — 2026-10-03

- **Đổi gì:** theo yêu cầu của chủ sản phẩm ("tạm thời là hoàn thiện spec"), lưu trữ hai change bằng `openspec archive`: [`ai-gateway`](../../../openspec/changes/archive/2026-10-03-ai-gateway/) (24/25 task) và [`ai-model-settings`](../../../openspec/changes/archive/2026-10-03-ai-model-settings/) (26/27 task). Spec gộp vào `openspec/specs/`: **mới** `ai-gateway` (9 yêu cầu) và `ai-model-settings` (13 yêu cầu), **sửa** `translation-provider` (Lỗi có phân loại) và `ai-connection` (Danh sách model và model mặc định). `openspec validate --specs --strict` qua 13/13 spec.
- **Còn mở, giữ nguyên trong `tasks.md` đã lưu trữ chứ không đánh dấu xong:** task 1.2 của `ai-gateway` (thân 429 thật chưa bắt được, hằng số `quota` vẫn là giả định) và task 6.4 của `ai-model-settings` (đường đầy đủ kết nối → mục → gateway → Gemini chưa có số đo; `liveGemini.test.ts` đã viết, chỉ chạy khi `MIRA_LIVE=1`). Hai việc này cần khóa thật của chủ sản phẩm, không cần đổi spec.
- **Gỡ bỏ:** bảy change cũ chưa lưu trữ (`ai-chat`, `editor-redesign`, `editor-rich-text-images`, `screens-rhythm-d`, `source-editor`, `translation-editor`, `work-area-navigation`) bị xóa khỏi `openspec/changes/` cùng đợt commit này; nội dung vẫn còn trong lịch sử git (commit trước đợt này). Chỉ còn `context-core` là change đang mở.

## Chốt mẫu linh vật và tạo tài nguyên riêng — 2026-10-03

- Theo yêu cầu trực tiếp của chủ sản phẩm: giữ mẫu manga đen trắng đã chọn, tạo lần lượt từng thành phần. Cập nhật [brand](../product/brand.md), quyết định hiện hành và câu hỏi mở.
- Lưu [ảnh gốc và 21 tài nguyên PNG](../../../assets/mascot/README.md), kèm prompt tạo ảnh. Mẫu gốc đã chốt; ảnh tạo lại có thể khác nét và tỷ lệ, chưa tích hợp vào giao diện hoặc bản cài.
- Kiểm tra trực quan từng ảnh và đọc được kích thước của toàn bộ PNG; icon có alpha ở góc ngoài. Không thay mã ứng dụng, không chạy test/build và chưa commit.

## Cài đặt model: mục model, ba hộp thoại, giãn nhịp RPM — 2026-10-03

- **Đổi gì:** change [`ai-model-settings`](../../../openspec/changes/archive/2026-10-03-ai-model-settings/) (26/27 task) làm model thành một **mục** có id riêng, nhân bản được, theo cấu trúc LinguaGacha. `library.db` lên v5. Mỗi mục có Cơ bản (tên, model thật với Nhập / Lấy / Kiểm tra, mức suy luận theo khả năng model), Tác vụ (token vào/ra, đồng thời, RPM) và Nâng cao (nhiệt độ, `top_p`, header thêm, `extra_body`). Menu chọn "mục → mức suy luận" dùng chung cho hộp thoại dịch và ô soạn chat. Gateway giữ hàng chờ đồng thời và nhịp RPM theo từng mục. Bản dịch chốt cấu hình bằng `settingsKey`: sửa mục giữa chừng thì lô sau không gửi, lập kế hoạch lại. Cập nhật [hiện trạng](../engineering/current-state.md), [ghi chú đối chiếu giao diện](../experience/ai-connection-settings.md#cài-đặt-model--đối-chiếu-linguagacha-2026-10-03) và hàng A5 của [nghiên cứu lõi AI](../research/ai-core-architecture.md).
- **Số đo:** `node scripts/check.mjs --build` qua: 1453 test (mốc nâng từ 1103), 0 lỗi lint và 1 cảnh báo có từ trước, build 3 bundle. Mọi chỗ then chốt đã được cố tình sửa mã để kiểm tra test có đỏ không; hai khoảng hở tìm thấy bằng cách đó đã vá.
- **Lỗi thật tìm thấy:** (1) `v.record` của valibot nhận mảng nên `extra_body: [1]` lọt qua và sẽ gửi `{"0": 1}`: đã chặn mảng. (2) Hộp thoại dịch kẹt ở "Đang đọc cài đặt kết nối…" ở chế độ dev, lỗi có từ trước (cờ `live` không được bật lại khi StrictMode dựng lại hook), chỉ lộ khi xem bằng mắt: đã sửa. (3) Hộp thoại chọn model nói sai "endpoint không liệt kê model" khi chưa hỏi.
- **Quyết định tôi tự đặt, cần chủ sản phẩm soát:** mức suy luận của Gemini có bảng riêng (2.5 Flash: Tắt/Thấp/Vừa/Cao; 2.5 Pro: không có Tắt), ánh xạ ngân sách → mức chỉ áp cho model `gemini-*`; `accept` nằm trong danh sách header bị cấm; `settingsKey` là mã băm; cài đặt đi bằng bản vá (`null` là bỏ); `defaultModel` đổi tên `defaultEntryId`; mỗi ô lưu ngay, không có nút Lưu; thêm "Đặt làm mặc định", "Chuyển lên/xuống" và xác nhận xóa (LinguaGacha không có hai thứ đầu ở menu này); dữ liệu cài đặt hỏng trong kho bị bỏ riêng trường đó và lặng lẽ (kho không có chỗ ghi log).
- **Đã đo thật sau đó (cùng ngày, key của chủ sản phẩm):** `gemini-3.1-pro-preview` khớp catalog (nhận thấp/vừa/cao, từ chối `minimal` và `none`); `gemini-3.5-flash` nhận **cả `none`** mà models.dev không liệt kê (tổng 32 token so với 201 ở `low`), nên đã thêm bảng sửa tay `MODEL_CAPABILITY_OVERRIDES` với bằng chứng và test đối chiếu bản ghi; `gemini-2.5-pro` trả 404 "no longer available to new users" nên không đo được. Lớp tương thích của Gemini tự kiểm `reasoning_effort` và nêu các giá trị hợp lệ chung.
- **Bằng chứng từ app thật:** ảnh chụp của chủ sản phẩm (Electron, Mira 0.1.0) cho thấy ô soạn chat dùng mục "gemini-2.5-flash · Cao" với hai lượt có `usage` thật. Đó là đường chat; phần còn lại của giao diện mới chỉ được xem trong trình duyệt với `window.mira` giả.
- **Chưa làm / chưa kiểm:** chưa chạy đường đầy đủ kết nối → mục → gateway → Gemini với khóa thật (task 6.4: `src/main/services/ai/liveGemini.test.ts`, chỉ chạy khi `MIRA_LIVE=1` và có `GEMINI_API_KEY`). Giao diện chưa xem trong Electron thật, chỉ trong trình duyệt với `window.mira` giả; không có test DOM. Đồng thời tự động (AIMD), `speed_level`, ghi đè theo lần chạy, % ngữ cảnh: có chủ ý không làm. Chưa commit.

## Nghiên cứu hệ thống ngữ cảnh, đợt 2 — 2026-10-03

- **Đổi gì:** thêm [Hệ thống ngữ cảnh, đợt 2](../research/context-system.md) và nguồn S33–S35. Ghi chú trỏ sang trang mới ở [ngữ cảnh truyện](../research/story-context.md) và ở câu hỏi mở P1. Không đổi code, ADR, scope hay change `context-core`; quan sát cộng **đề xuất chưa chốt** K1–K9.
- **Kết luận chính:**
  1. Mira gọi qua Chat Completions, nơi bộ đệm tự động theo tiền tố, không có điểm cắt và có **ngưỡng 1.024–4.096 token**. System prompt dịch hiện cỡ trăm token nên tầng A riêng không bao giờ được cache. Thứ tự A→B→C vẫn đúng.
  2. Bằng chứng nghiêng về chọn lọc: thuật ngữ khớp theo đoạn đúng 81,4% so với 69,1% khi không có glossary. Chưa có phép đo "nhồi cả glossary".
  3. Ma trận xưng hô cần **lượt gán người nói/người nghe** mỗi chương; người nghe sai ~15%. Chưa có benchmark xưng hô tiếng Việt.
  4. Văn phong lấy từ **đề xuất đã duyệt** (BM25, 3–5 ví dụ) cộng **ghi chú văn phong rút từ chỗ sửa**. Đây là lối ra cho P1 mà không cần căn chỉnh.
  5. AI trích thuật ngữ nhiễu: một báo cáo ghi 22% mục sống qua soát tay, nên không tự duyệt.
  6. Đánh dấu xem lại theo **danh sách mục đã gửi**, không theo băm cả khối.
- **Chưa làm:** chưa gọi provider thật để đo cache (bước V1), chưa gán nhãn câu thoại, chưa đối chiếu lại các con số trên trang gốc (agent đọc qua bản tóm tắt máy). Chưa commit.

## Lớp kết nối AI: transport, gateway, lần gọi Gemini thật đầu tiên — 2026-10-03

- **Đổi gì:** change [`ai-gateway`](../../../openspec/changes/archive/2026-10-03-ai-gateway/) (24/25 task) tách phần kết nối và giao tiếp thành ba tầng: **transport** (một lượt gọi, trả nội dung, `finish_reason`, `usage`, trạng thái; lỗi có kiểu và đã che khóa), **gateway** (một chủ thử lại, đổi khóa ngay với lỗi riêng của khóa, trần đồng thời, bộ lập lịch khóa an toàn khi gọi song song) và **mặt tiền** `OpenAiCompatibleProvider` giữ nguyên chữ ký cùng mã dịch MVP. Thêm `usage` một kiểu có cache/reasoning, bản ghi `compat`, chuẩn hóa địa chỉ, và `net.fetch` của Electron cho proxy hệ thống. **Không đổi** schema, kênh IPC (thêm một trường tùy chọn `finishReason` ở chunk `done` của chat) hay prompt dịch. Mô tả hiện trạng: [current-state](../engineering/current-state.md); nghiên cứu nền và bảng A1–A7: [lõi AI](../research/ai-core-architecture.md).
- **Số đo:** `node scripts/check.mjs --build` qua — 1103 test (nền 906, mốc nâng lên 1103), 0 lỗi lint và 1 cảnh báo (trước change là 63), build 3 bundle. Trong Electron 44.4.5 thật (`pnpm smoke:net`): stream đến từng mảnh (448/853/1255 ms), hủy giữa dòng dừng ngay, địa chỉ máy nội bộ nối thẳng, `net.fetch` đi qua proxy còn `fetch` Node thì không.
- **Gọi Gemini thật lần đầu** (`gemini-2.5-flash`, 9 kịch bản, mỗi cái một mẫu, bằng `scripts/capture-provider-fixtures.mjs`; bản ghi đã che khóa ở `__fixtures__/live`). Ba điều trái với giả định trong mã: (1) **token thinking nằm ngoài `completion_tokens`** — 21 vào, 13 ra nhưng tổng 125, còn `reasoning_effort: "none"` cho tổng 33; (2) **khóa sai là HTTP 400 với thân bọc mảng**, không phải 401, nên mã cũ xếp nó `refused` và không bao giờ đánh dấu khóa sai; (3) đặt `max_tokens` nhỏ khi thinking bật ra câu cụt một token. (1) và (2) đã sửa và có test phát lại bản ghi thật, đã thử đưa lại hành vi cũ để chắc test đỏ khi phải đỏ.
- **Lỗi thật tìm thấy khi viết:** bản đầu của bộ lập lịch tính lỗi cùng đợt ở mức đóng băng cao hơn một nấc (60 s thành 120 s); test bắt được. Hai lỗi đo được từ trước (6 lỗi 429 đồng thời đóng băng một khóa 30 phút; một lượt `ok` đến muộn gỡ đóng băng) đều có test và đã sửa. Một test cũ (`aiTranslateHandlers`) khóa hành vi "kết nối không có khóa gặp 429 thì thử ba lần liền không chờ"; nay thử lại **có chờ** theo `Retry-After`.
- **Quyết định tôi tự đặt, cần chủ sản phẩm soát:** gateway ở `infra/` chứ không ở `services/` (luật tầng); bộ đếm lượt thay cho cờ `draining`; hủy báo `neutral` cho tầng khóa thay vì im lặng (hai test của `openAiChat.test.ts` sửa theo); kết nối không khóa thử lại 429 có chờ; **chưa đổi mặc định gửi đi** (không gửi `reasoning_effort`/`max_tokens`).
- **Chưa làm / chưa kiểm:** thân 429 thật (cần chạy script với `--burst`), hết tín dụng, hủy giữa dòng với nhà cung cấp thật, `cached_tokens`, Gemini 3.x; hằng số `quota` vẫn là giả định (task 1.2 còn mở). Chưa thử proxy hệ thống thật của Windows (đã thử bằng `session.setProxy`) và chưa lái giao diện chat bằng tay. **Chưa sửa ADR-004** (đề xuất ở nghiên cứu, chờ duyệt). Chưa đối chiếu bảng giá Gemini để xác nhận thinking tính như token đầu ra. Chưa commit.

## Nghiên cứu chia lô dịch truyện và ngữ cảnh giữa các lô — 2026-10-03

- **Đổi gì:** thêm [Chia lô dịch truyện và giữ mạch giữa các lô](../research/chunking-translation.md). Không đổi code, ADR hay scope; quan sát cộng **đề xuất chưa chốt** (C1–C8).
- **Kết luận chính:** (1) công cụ dịch đồng thuận khuôn "ranh giới dòng + ngân sách token nhỏ + **trần số dòng** + ID tạm"; Mira có hai phần đầu nhưng **thiếu trần số đoạn**: với `CHARS_PER_TOKEN = 2`, chương toàn đoạn 10 ký tự sẽ thành lô ~300 đoạn (phép tính từ hằng số, chưa chạy fixture). (2) LinguaGacha (đọc mã bản local): cắt tham lam theo token nguồn và số dòng (`ngưỡng/16`), không nhận biết cảnh; ngữ cảnh trước **mặc định tắt**, lấy **nguồn** và dễ rỗng; chia nhỏ khi lỗi theo hệ số 0,38/vòng; không kiểm chất lượng lúc dịch. (3) Đề xuất đáng chú ý: tính ranh giới lô **từ nguồn** để băm theo lô của `context-core` D11 ổn định; ngữ cảnh liền trước dùng **cặp nguồn + bản dịch** (xưng hô nằm ở bản dịch); tách thu nhỏ lô khỏi lỗi 429/timeout.
- **Chỗ tài liệu cũ lệch với mã hiện tại (chưa sửa):** [công cụ dịch AI](../research/ai-translation-tools.md) ghi LinguaGacha chưa tài liệu hóa chi tiết chia đoạn; [ngữ cảnh truyện](../research/story-context.md) (dựa trên wiki) nói có Auto Glossary tự thêm tên khi dịch, trong khi agent không thấy việc đó trong đường dịch của bản mã v0.125.0.
- **Chưa làm / chưa kiểm:** chưa chạy công cụ nào; phần công cụ khác và bài báo do một agent tìm web, tôi chưa mở lại từng trang và chưa đọc toàn văn bài báo; số liệu tự báo của dự án nhỏ không dùng; giấy phép LinguaGacha chưa xác nhận; chưa cập nhật [sổ nguồn](../research/sources.md); chưa commit.

## Nghiên cứu lõi AI: kiến trúc provider sau tách bốn tầng — 2026-10-03

- **Đổi gì:** thêm [Lõi AI: kiến trúc provider và cách sản phẩm khác dựng](../research/ai-core-architecture.md). Không đổi code, ADR hay scope; mọi thứ là quan sát và **đề xuất chưa chốt**.
- **Kết luận chính:** hướng ADR-004 (một đường dây OpenAI-chat bằng `fetch` trần, khóa `fill-first`, models.dev) vẫn đúng; **ranh giới lớp thì chưa**: `OpenAiCompatibleProvider` (567 dòng) vừa là transport vừa cầm prompt, chia lô, `reconcile`, thử lại và stream chat, trong khi sáu agent lập trình và LinguaGacha đều tách "một lượt model" khỏi logic tác vụ. Bảy điểm A1–A7 có số dòng; ba cái cần làm trước module 3–4: một kiểu `Usage` (có cache/reasoning, hiện ba kiểu trùng và không mã nào đọc giá `cacheRead`), bản ghi `compat` theo endpoint (hiện không gửi `max_tokens`/`reasoning_effort`/`response_format`), và bộ chọn khóa an toàn khi chạy song song.
- **Phát hiện đáng chú ý:** (1) chú thích đầu `openAiCompatible.ts` và ADR-004 (lựa chọn 4) nói SDK làm mất `error.details`; đã đọc lại mã Vercel AI SDK, nó **giữ** `responseBody`. Kết luận không dùng AI SDK vẫn đứng nhưng lý do phải đổi. (2) Anthropic ghi trên trang chính chủ rằng lớp tương thích OpenAI "not … a long-term or production-ready solution"; mã Mira đã không có preset Anthropic dù ADR-004 liệt kê. (3) `clearKeyFreeze` và `decideFreeze` sai khi gọi song song (chạy `decideFreeze`: 6 lỗi 429 liên tiếp đóng băng một khóa 30 phút); hiện chưa gây lỗi vì lô chạy tuần tự.
- **Chưa làm / chưa kiểm:** chưa gọi nhà cung cấp thật; hai báo cáo agent dựa một phần trên công cụ tóm tắt trang, chỉ các mệnh đề đổi quyết định được đọc lại; chưa viết test cho A6; chưa sửa ADR-004 (cần chủ sản phẩm duyệt lại lý do loại SDK); chưa commit.

## Live Preview và Ctrl+B/I đọc cú pháp từ cây Markdown — 2026-10-03

- **Đổi gì:** nhận diện đậm, nghiêng, gạch ngang, tiêu đề, trích dẫn và danh sách trong pane bản dịch chuyển từ biểu thức chính quy từng dòng sang cây cú pháp của `@codemirror/lang-markdown` ([`markdownSyntax.ts`](../../../src/renderer/src/features/editor/markdownSyntax.ts)). Live Preview ẩn hẳn dấu của mọi span nó nhận ra, nên nhận nhầm là làm ký tự biến mất. Đã chạy regex cũ trên năm ca và cả năm đều sai: `` `a*b*c` `` bắt `*b*` trong code span; dấu `*` đã escape bị coi là dấu đóng; `**a *b* c**` bắt sai `*a *`; `snake_case_name` thành nghiêng `_case_` và `_name_`; `_b_` trong URL. Cả năm nay có test, và parser trả đúng "không phải nhấn mạnh".
- **Hành vi đổi:** đậm/nghiêng/gạch ngang trong tiêu đề, danh sách và trích dẫn cũng ẩn dấu (trước đây các dòng đó bị bỏ qua); `__đậm__` cũng ẩn; `>_<` và `>chữ` không còn là trích dẫn (cần dấu cách sau `>`, đúng spec); tiêu đề vẫn chỉ `#` đến `###`. Một span nhấn mạnh được phép kéo qua nhiều dòng khi ẩn dấu, nhưng Ctrl+B/I vẫn không gỡ span nằm khác dòng.
- **Cấu hình parser:** gỡ `IndentedCode`, `SetextHeading`, `LinkReference`, `HTMLBlock`. Truyện dịch có đoạn thụt đầu dòng bằng dấu cách (đọc thành code thì mất định dạng cả dòng), dùng `---` ngắt cảnh ngay dưới một dòng chữ (đọc thành tiêu đề), có dòng thoại dạng `[Hệ thống]: …` và dòng bắt đầu bằng thẻ giống HTML. Không gắn keymap của lang-markdown vì mặc định nó nối tiếp danh sách khi nhấn Enter, còn editor này chỉ được xuống dòng trần; có test khóa việc đó.
- **Một lỗi cũ được sửa kèm:** sau khi gỡ đậm/nghiêng bằng Ctrl+B/I, vùng chọn mới lệch đúng bằng độ dài dấu, vì `changeByRange` cần vùng tính theo văn bản **sau** khi sửa mà bản cũ trả theo văn bản trước. Test cũ khóa đúng giá trị sai. Spec yêu cầu chọn cả chữ vừa gỡ; test mới kiểm cả văn bản lẫn vùng chọn, gồm trường hợp nhiều con trỏ.
- **Cách cài:** `corepack pnpm add` bản 8.9.0 được ghim, nên `pnpm-lock.yaml` giữ `lockfileVersion 6.0` và chỉ thêm 102 dòng; pnpm toàn cục sẽ ghi lại thành 9.0.
- **Số đo (trong Node, không phải Electron):** chương 300.000 ký tự, 2.471 đoạn: phân tích cây cú pháp lần đầu ≈ 49 ms; mỗi ký tự gõ thêm ≈ 2,3 ms trung bình, tệ nhất 4,8 ms; lập kế hoạch Live Preview cho một màn hình ≈ 0,3 ms. Test 867 → 904; lỗi lint 0, cảnh báo 63 như trước.
- **Chưa làm / chưa kiểm:** môi trường test không có DOM, nên `ViewPlugin`, `Decoration.replace` và bộ gõ **chưa chạy trên `EditorView` thật**; chỉ phần thuần (`scanMarkdown`, `planLivePreview`, `toggleWrapChanges`) có test. Bảng ca IME ở [imeCases.md](../../../src/renderer/src/features/editor/imeCases.md) vẫn phải thử tay, và nên thử sau thay đổi này vì chính các decoration này là thứ bị thử. Nghi vấn chưa kiểm: sau khi bộ gõ chốt chữ, decoration chỉ dựng lại ở lần đổi kế tiếp (hành vi có từ trước). `design.md` của `editor-redesign` và `editor-rich-text-images` vẫn mô tả cách regex; đó là bản ghi quyết định lúc đó nên không sửa.

## Thanh trên cùng gộp với thanh tiêu đề cửa sổ — 2026-10-03

- Theo ảnh Obsidian của chủ sản phẩm: bỏ thanh tiêu đề gốc của Windows, thanh trên cùng của app thành thanh tiêu đề (window controls overlay), ba nút cửa sổ nằm cùng hàng ở góc phải. Ảnh Obsidian được coi là wireframe đã chọn nên không vẽ phương án khác.
- Icon của từng màn (Hỏi AI, Tập trung, Lưu, menu chương, nút quay lại ở chương chưa có bản gốc) chuyển từ hàng header riêng lên thanh này qua `TopBarActions`; dòng tiêu đề chương gộp vào hàng 36px bên dưới, nên màn chương bớt một hàng 42px. Cỡ icon đồng bộ 16 ở thanh trên cùng, header chương và panel Hỏi AI. Nút "Lưu" nhạt khi chưa có gì để lưu, đặc khi có.
- Thêm một kênh `app:chrome-theme` (không đi qua `CHANNELS`, cùng kiểu `app:info`) để main đổi màu ba nút theo theme. Màu là bản sao tay của hai token CSS, có test đối chiếu (đã thử làm lệch một màu để chắc test đỏ). `check.mjs` nâng baseline lên 906 test.
- **Kiểm chứng:** `check.mjs --build` xanh; chạy bản build trong Electron thật và chụp màn hình ở nền tối và sáng. Phát hiện khi chụp: lớp phủ cao đúng 42px che mất viền dưới thanh ở nền sáng, nên nút cao 41px. **Chưa kiểm:** Linux, kéo cửa sổ và nhấp đúp bằng tay, màn hình có tỷ lệ hiển thị khác 100%.
- **Còn thấy, không thuộc đợt này:** màn Cài đặt vẫn dựng một thanh bên trống (`sidebar = null` nhưng cột vẫn mở); ở chương không phải chương gần nhất, breadcrumb chỉ ghi "Chương" không có số.

## Chốt ADR-005 (bỏ Từng câu, làm lại theo module) và dọn handbook — 2026-10-03

- Chủ sản phẩm chấp nhận ba mặc định Q1–Q3 và chỉ đạo: hướng kiến trúc theo [kiến trúc AI-first](../engineering/ai-first-architecture.md); repo tới nay là **bản MVP để thử nghiệm**, sắp tới **làm hoàn chỉnh từng module**; spec cũ xóa luôn; cập nhật README và dọn handbook. Ghi thành [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md) (Accepted): bỏ mode Từng câu cả dữ liệu câu (Q1), mức vùng là đủ (Q2), đơn vị là đoạn = mỗi dòng không trống (Q3, **chờ kiểm trên fixture ZH/JA/EN**, repo chưa có fixture văn bản thật). Q4–Q7 còn mở hoặc giữ giả định. ADR-002 đánh dấu **superseded một phần**; ADR-003/004 chỉ thêm ghi chú.
- **Xóa hẳn, không lưu trữ:** change `sentence-mode` (14/16 task) và `segment-auto-align` (0/15), cùng năm hàng backlog phụ thuộc segment. Lịch sử còn trong Git. **Giữ** `openspec/specs/*` (`segmentation`, `content-model`, `translation-provider`, `chapter-screen`, `raw-import`…) vì chúng mô tả mã MVP còn chạy; chúng sẽ được thay bằng delta trong change gỡ segment. Hai hàng backlog `sentence-mode-toolbar` và `sentence-mode-side-panels` **giữ lại** vì hai test (`mockFeatures.test.ts`, `workAreas.test.ts`) đòi mỗi mock có hàng ở đó; chúng gỡ cùng mã mock.
- **`context-core` được đổi từ segment sang đoạn** (chưa làm, vẫn 0/41 task): `contextHash` chuyển từ `provenance` sang `proposal`/`job_item`; đường dẫn theo cấu trúc bốn tầng mới; thêm điều kiện "làm sau module đề xuất và sau định nghĩa đoạn".
- **Viết lại:** [scope](../product/scope.md) v0.3 (hạng mục S1.4/S1.6/S2.7 gạch bỏ, thêm S1.9 duyệt đề xuất và S1.10 Hỏi/Sửa, bảng ánh xạ sang module), [lộ trình](../delivery/roadmap.md) theo module thay cho M0–M4 (kết quả MVP, trình tự, việc gần nhất), [hiện trạng](../engineering/current-state.md) (bản cũ là bảng 28 dòng, nhiều ô dài cả trang và chồng bảy lớp "Cập nhật ngày…"; bản mới có cột **Số phận** giữ/viết lại/gỡ theo module), `README.md` gốc (kiến trúc đích, cấu trúc mã nguồn, luật tầng, lộ trình module; sửa Node ≥22.12 thành ≥24 theo `package.json`; thay "pnpm test/lint" bằng `node scripts/check.mjs`). Cập nhật [quyết định hiện hành](../product/decisions.md), [câu hỏi mở](../product/open-questions.md), [kiến trúc AI-first](../engineering/ai-first-architecture.md) (trạng thái, Q1–Q7, lộ trình theo module, phần chat vừa phát hiện còn dính segment), [kiến trúc kỹ thuật](../engineering/architecture.md), mục lục handbook; thêm banner ngày 2026-10-03 vào các trang nghiên cứu và trải nghiệm bị ADR-005 thay (`alignment`, `segment-editors`, `feature-map`, `technical-feasibility`, `story-context`, `ai-chat-panel`…) mà không xóa quan sát.
- **Phát hiện khi dọn, không phải do ADR-005:** (1) **Reading view đã bị gỡ khỏi mã** từ commit `81bbd2f` (`ReadingView.tsx` xóa; `readingParagraphs.ts` còn lại chỉ test dùng), trong khi quyết định ngày 2026-09-23 và `current-state` vẫn nói có. Chưa có bản ghi về việc bỏ; đã sửa các trang cho đúng mã và thêm câu hỏi mở "Reading view còn thuộc bản đầu không?". (2) Mục "thử tay IME" trong roadmap cũ lỗi thời: ADR-003 ghi đã thử và đạt ngày 2026-10-01; còn lại là các phần mới (Live Preview ẩn dấu, ảnh, review đề xuất). (3) `decisions.md` (hai dòng: nền tảng, lưu trữ) và `architecture.md` còn nói stack "chưa chốt" dù ADR-003 đã chốt. (4) `ChapterWorkspace.tsx` và `chatContext.ts` còn comment trỏ tới `segment-auto-align`; đã sửa **chỉ comment**.
- **Dọn:** liên kết hỏng 25 → 0 trên 128 tệp `.md` (kiểm bằng script gồm cả neo): 22 liên kết trong change đã lưu trữ lỡ một cấp thư mục, 3 trang đang dùng. Mã nguồn `S27` bị trùng trong [sổ nguồn](../research/sources.md): hàng "Ngữ cảnh truyện" đánh lại thành **S31** (S27 giữ cho Bertalign, nơi `technical-feasibility.md` trích); các mục nhật ký cũ nhắc "S27" cho ngữ cảnh truyện giữ nguyên. Gỡ màn `tung-cau` khỏi wireframe (đã `node --check` và render thử 92 tổ hợp).
- **Quyết định tôi tự đặt ra, cần chủ sản phẩm soát:** `buildContext` trong `shared/` không import được `node:crypto` nên **nhận hàm băm được tiêm từ main** (D12 của `context-core`); thêm cột `context_hash` cho `proposal` (kiến trúc mục 5.3 trước chỉ có ở `job_item`); thêm hai hạng mục scope S1.9/S1.10 cho phần MVP đã có; giữ `experience/mockups/work-detail-light.png` vì `work-detail-screen.md` còn nhúng nó.
- **Chưa làm / chưa kiểm:** không chạy `node scripts/check.mjs` đầy đủ vì working tree đang có sửa dở của editor (`markdownSyntax`, `formatCommands`, `livePreviewDecorations`) không phải của đợt này; chỉ chạy hai test đọc `backlog.md` (9 test qua, sau khi sửa backlog). `current-state` giữ nguyên số đo và bằng chứng của bản cũ, không kiểm lại từng dòng. Chưa commit. `AGENTS.md` vẫn nói "legacy files in `docs/` are redirect pages" dù `docs/` hiện chỉ còn `handbook/`; không sửa vì đó là tệp chỉ dẫn của dự án.

## Cấu trúc mã nguồn theo bốn tầng, và luật ranh giới được ép bằng lint — 2026-10-03

- Change `refactor-electron-structure` (R1–R6 xong). **Không đổi hành vi**: không đổi tên kênh IPC, payload, schema SQLite, tên tệp trong thư mục dữ liệu, API của preload hay giao diện. Mô tả cấu trúc: [Cấu trúc mã nguồn và luật ranh giới](../engineering/architecture.md#cấu-trúc-mã-nguồn-và-luật-ranh-giới); nguồn khảo sát: [kiến trúc các app Electron](../research/electron-architecture.md).
- **`main` chia bốn tầng** `infra` < `services` < `ipc` < `electron`, **`shared` chia hai nhóm** `contracts` và `algorithms`. 105 tệp đổi chỗ (Git nhận ra cả 105 là đổi tên); 219 + 174 câu import được viết lại bằng một công cụ có bước chứng minh "ngoài tham chiếu không đổi gì" (`--prove`, đã thử bằng một sửa đổi cố ý để chắc nó đỏ khi phải đỏ).
- **Ranh giới do máy ép.** `no-restricted-imports` theo từng vùng; chỉ `electron/` và `index.ts` import `electron`. Mỗi luật được chứng minh bắt được bằng một tệp vi phạm tạm (11 + 14 + 4 ca) và có ca đối chứng cho phép.
- **IPC mỗi khu vực một tệp** và mạnh hơn trước về kiểu: mỗi tệp khai `AreaHandlers<tiền tố>`, nên quên một handler hay đặt nhầm kênh là lỗi biên dịch (3 lần phá cố ý, đều bị `tsc` chặn). **`createServices`** dựng các service AI từ một library và một `SecretCrypto` được tiêm, không cần Electron.
- **Một lệnh kiểm không thể qua êm:** `node scripts/check.mjs [--build]`. Trên máy này `pnpm test`, `pnpm lint`, `pnpm typecheck` in một cảnh báo rồi thoát mã 0 **mà không chạy gì** (pnpm toàn cục mới hơn bản ghim 8.9.0); một bước không có bằng chứng đã chạy là thất bại.
- **Số liệu trước và sau:** test 863 → 867 (3 của `createServices`, 1 khóa hành vi vòng đời tệp tác phẩm); lỗi lint 2 → 0; cảnh báo lint 30.576 → 63 (khoảng 30.500 cái là nhiễu CRLF do `core.autocrlf` so với `.editorconfig`, xử lý bằng `endOfLine: auto`, 63 cái còn lại là khác biệt định dạng thật có từ trước); `require` của preload vẫn chỉ `electron` (5.823 byte), phần external của `main` và kích thước bundle renderer không đổi.
- **Ba phát hiện đáng nhớ.** (1) Bộ test chạy song song chập chờn ngay trên máy rảnh (đỏ, đỏ, xanh liền ba lần); năm tệp phụ thuộc đồng hồ nên chạy ở pha tuần tự riêng. (2) Một phần chập chờn của `crash.test.ts` **không phải do tải mà do lỗi đua trong bài test**: tiến trình con xóa chương rồi mới báo `deleted`, nên `SIGKILL` đến giữa hai việc đó làm bên cha đòi một chương đã xóa hợp lệ. Chứng minh bằng thực nghiệm (thêm 60 ms thì test cũ đỏ tất định, test sửa xanh); không làm yếu bài kiểm độ bền. (3) `scripts/smoke-sqlite.mjs`, bài kiểm ADR-003 bắt chạy sau mỗi lần nâng Electron, có cú pháp TypeScript từ ngày thêm nên **chưa từng chạy được**; đã sửa, nay qua dưới Electron 44.4.5.
- **Một sự cố quy trình, ghi để không lặp.** Khi đẩy R3, một lệnh nối `check && …` rồi `;` cho `git push` chạy dù `check` đỏ. Bước đỏ là lỗi đua nói trên, không liên quan R3; từ đó mọi lần đẩy dùng một chuỗi `&&` duy nhất.
- **Đính chính thiết kế.** Bản đầu của D7 nói test "import được trong Node trần" chứng minh `services/` không dính Electron; không đúng vì `import 'electron'` trong Node trần không ném lỗi. Bằng chứng là luật lint.
- **Tài liệu:** 96 đường dẫn trong 18 tệp được viết lại theo bản ghi các lần dời; `archive/` và chữ `src/…` trong các mục nhật ký đã đóng ngày giữ nguyên (chỉ liên kết được sửa để không hỏng). Còn **24 mục dangling có từ trước** hoặc là tệp các change đang mở **dự kiến nhưng chưa tạo**; cả tám đích đều không có ở commit `0600221`. Kế hoạch của `context-core` và `segment-auto-align` vẫn dùng tên thư mục cũ (`src/main/storage`, `src/main/context`, `src/main/alignment`); cần đặt lại chỗ khi hai change đó được làm.
- **`WorkFiles` tách khỏi `LibraryStore` (R6).** `LibraryStore` 567 → 354 dòng, chỉ còn nghiệp vụ của một tác phẩm; `infra/storage/workFiles.ts` (287 dòng) giữ bố cục thư mục dữ liệu, `library.db`, tạo tệp nguyên tử, nhập, xuất và đối soát chỉ mục. Mã chuyển nguyên văn và theo cùng thứ tự (kể cả số lần gọi `now()` mà đồng hồ đếm của test phụ thuộc); so từng dòng với bản cũ cho thấy 25 dòng "biến mất" đều giải thích được. Trước khi tách, một khoảng trống được lấp bằng một test (lỗi sau khi tệp `.part` đã có thì tệp bị dọn; kiểm bằng đột biến). Hai test đọc thành viên private đã chuyển (`worksDir`, `dataDir`) được sửa để dùng thư mục dữ liệu chúng tự tạo; `tsc` không bắt được kiểu truy cập bằng ngoặc này, chỉ lúc chạy mới lỗi.
- **Công cụ dời tệp đã được xóa** ở commit `44fe5f6`. Git giữ nó: bản cuối ở `6f3a448` (`git show 6f3a448:scripts/restructure/move-modules.mjs`), còn bản ghi mọi lần dời (`applied-moves.json`) nằm ở `ead59be` và `86c6ebc`.
- **Chưa làm:** chuyển `services`/`infra` sang `utilityProcess` (cần smoke test `node:sqlite` trong `utilityProcess`, cách xử lý `safeStorage`, và số đo giao diện khựng).

## Đề xuất luồng và kiến trúc AI-first — 2026-10-03

- Chủ sản phẩm hỏi qua ba bước: có nên chuyển Tauri 2 không; ý định ban đầu là "trình gõ như Obsidian, AI đọc/sửa được" thì kiến trúc nên ra sao; và *"Mira dự định bỏ dịch từng câu, vì mục tiêu chính là làm việc với AI nhiều hơn"*. Gom kết luận vào [Luồng làm việc và kiến trúc AI-first](../engineering/ai-first-architecture.md), trạng thái **Đề xuất, chưa chốt**.
- Không đổi quyết định nào. Bỏ mode Từng câu đụng tới ADR-002 và dòng "Hai mode" trong `decisions.md`, nên trang ghi rõ cần ADR-005 và liệt kê bảy câu chờ chốt (Q1–Q7).
- **Tauri: không chuyển.** Electron 44.4.5 ghim Chromium 152.0.7977.130 (đo bằng `process.versions`), bản đã qua thử tay IME. WebView2 Evergreen không ghim được, và lỗi mất lần gõ IME đầu đã được báo cho WebView2 149+. Chuyển Tauri phải viết lại main bằng Rust.
- **Đổi khuyến nghị giữa chừng, ghi lại để không lặp:** ban đầu nghiêng về tệp `.md` làm nguồn sự thật. Đọc lý do Logseq bỏ đồ thị tệp (hai nguồn sự thật, ID phải chèn vào chữ, mất dữ liệu khi sync) và cách Notion chiếu block thành Markdown cho AI thì đổi sang **SQLite là nguồn sự thật, Markdown là cách chiếu**.
- Phát hiện cần kiểm: `paragraphsOf()` coi một đoạn là cụm dòng ngăn bởi dòng trống. Raw truyện mạng thường mỗi đoạn một dòng, không có dòng trống, nên cả chương có thể thành một đoạn (Q3).
- Không thêm nguồn vào [sổ nguồn](../research/sources.md), vì sổ đang có mã S27 trùng chưa đánh số lại. Nguồn ghi ngay trong trang kèm ngày đọc.

## Diff của AI về nằm trong pane bản dịch — đảo quyết định Q7 — 2026-10-03

- Chủ sản phẩm dùng thử rồi nói *"tương tác với editor khá kém"*. Chẩn đoán đúng, và vấn đề không phải tiểu tiết mà là **chọn sai bề mặt**: panel tự vẽ diff ở cột thứ ba, rồi chữ hạ xuống một nơi khác, và nhận thì nhận cả khối.
- Khảo sát [Cursor](https://cursor.com/docs/inline-edit/overview), [Notion](https://www.notion.com/help/suggested-edits) và [tổng kết mẫu AI UX](https://www.shapeof.ai/patterns/inline-action) cho cùng một kết luận: kết quả AI phải hiện **trong chính tài liệu** như một lớp đề xuất phủ lên chữ thật, và nhận/bỏ **từng chỗ, tại chỗ**. Nguyên tắc được phát biểu thẳng trong tài liệu mẫu: *luôn hiện kết quả inline như lớp đề xuất, không phải ghi đè, và bắt buộc có bước xác nhận*.
- **Đảo Q7** (trước chốt "panel tự dựng diff; `@codemirror/merge` là đường nâng cấp có điều kiện"). Điều kiện mở lại ghi là "đo được tỷ lệ hoàn tác cao"; thực tế đến bằng đường khác và sớm hơn — một buổi dùng thật. Chi phí thật của việc mở: **+62 kB** bundle renderer và một dependency phải sống chung với live preview, nhúng ảnh và luật IME.
- `unifiedMergeView` làm phần khó. Hai lựa chọn cấu hình đáng ghi: bật `allowInlineDiffs` vì **mặc định của thư viện sai với văn xuôi** (sửa một câu không nên hiện thành xóa-cả-khối rồi thêm-cả-khối), và tắt `gutter` vì hai pane đang phẳng, thêm gutter sẽ xô chữ sang ngang ngay khi bắt đầu duyệt.
- Review mode nằm trong một `Compartment`, **không dựng lại editor**: dựng lại sẽ vứt mất lịch sử undo — đúng thứ người dịch cần khi thấy cả đề xuất là sai.
- Tín hiệu "duyệt xong" dùng **API công khai**, không thò vào trạng thái chunk bên trong gói: nhận một chunk kéo `original` lên bằng chữ mới, bỏ một chunk kéo chữ mới về bằng `original`, nên **"hai bên bằng nhau"** phủ cả nhận-hết, bỏ-hết và mọi pha trộn.
- Ranh giới cũ giữ nguyên: pane **rỗng** ghi thẳng, pane **có chữ** vào review. Cùng câu hỏi "có gì để mất không" như D8 và D13.
- **Suýt làm hỏng repo và dừng kịp:** `npx pnpm add` kéo về pnpm 12 (và `pnpm` toàn cục là 10+), trong khi repo ghim `pnpm@8.9.0` — chạy sẽ viết lại `pnpm-lock.yaml` từ `lockfileVersion 6.0` sang 9.0, một diff lớn không liên quan gì tới tính năng. Kiểm trước khi tin "exit=0" (hai lần `exit=0` mà gói **không** hề được cài) và cài lại bằng `corepack`, vốn tôn trọng trường `packageManager`. Lockfile giữ nguyên 6.0, diff đúng **+14 dòng**.
- **862/863 test** (thêm 8), hai typecheck sạch, build qua, lint chỉ còn 2 lỗi có từ trước. Phần **không** test được và phải lái tay: `acceptChunk`/`rejectChunk` cần `EditorView` thật, mà kho này chạy test ở `environment: 'node'` không có DOM — nên "nhận một chunk kéo original lên" vẫn là **giả định về thư viện** lấy từ tài liệu, ghi rõ ngay đầu `chatReview.test.ts`.

## Chat đọc được tác phẩm, và ngữ cảnh thôi neo vào pane bản dịch — 2026-10-02

- Dùng thật phát hiện **ba lỗi cùng một gốc** trong phần ngữ cảnh vừa viết, đều làm model không thấy bản gốc. `buildChatContext` chỉ gửi khối bản gốc khi **số đoạn hai bên khớp nhau**; chương chưa dịch thì không khớp, nên "dịch chương này" tới model kèm đúng một dòng rác trong pane bản dịch — và model trả lời "hãy cung cấp nội dung chương 1", hoàn toàn đúng. Thêm nữa, ngữ cảnh chỉ được dựng **khi có range**, nên chưa đặt con trỏ là gửi rỗng trơn; và pane bản dịch rỗng thì vẫn hỏi "đoạn đang sửa" trong một pane không có đoạn nào.
- Sửa: **bản gốc của chương luôn đi kèm** (cắt ở 20.000 ký tự và *nói rõ đã cắt*), dựng cả khi không có range, và bản dịch rỗng thì phạm vi tự thành cả chương với chip khóa lại kèm lý do. Luật khớp-số-đoạn còn lại chỉ quyết định **một khối tiện ích** (ghép đúng đoạn gốc), không còn quyết định việc model có thấy chương hay không. Prompt cũng nói thẳng: *"Dùng thẳng các khối đó — không đòi người dùng dán lại nội dung."*
- **Tool chỉ đọc — đảo quyết định Q3, và nói rõ vì sao được phép đảo.** Q3 chốt "không tool call" với hai căn cứ: dữ liệu để tra chưa tồn tại, và tool call phá tính tái hiện. Căn cứ đầu **đúng với thuật ngữ** (`context-core` chưa làm) nhưng **sai với chương** — chương có đủ trong kho từ đầu. Căn cứ sau nói về `contextHash` của job dịch theo lô, thứ chat chưa bao giờ ghi. Và ADR-004 cấm "Agent" theo nghĩa AI tự chạy nhiều bước **ghi** lên dữ liệu người dùng; đọc không nằm trong đó. Ranh giới mới thành một câu: **tool được đọc và được trỏ; chỉ người dùng mới được ghi.**
- Hai công cụ, không hơn: `list_chapters` và `read_chapter(chapter, side)`. **Phạm vi khóa bằng cấu trúc, không bằng kiểm tra lúc chạy** — `workId` buộc vào lúc dựng công cụ và không phải tham số, nên với sang tác phẩm khác là điều model **không nói ra được**. Có test khẳng định đúng điều đó.
- Vòng lặp tool nằm ở `chatService`, **không** ở provider (provider không được biết `LibraryStore` là gì). Trần 3 vòng, và vòng cuối **không mời công cụ nữa** — đó là thứ làm vòng lặp chắc chắn dừng, chứ không phải một lời hứa về hành vi của model. Hóa đơn **cộng dồn qua các vòng**: một lượt có tool là nhiều lời gọi, ghi đè sẽ giấu mất phần lớn chi phí.
- Mảnh `tool_calls` về **rải rác qua nhiều khung stream** (tên tới một lần, tham số nối dần theo `index`); gom sai thì model lúc nào cũng "tham số hỏng". Có test dựng đúng ca bị cắt đó.
- **Ghi thẳng khi không có gì để mất** (D13): pane bản dịch rỗng thì bản dịch vào thẳng, vì không có chữ nào bị ghi đè và `Ctrl+Z` vẫn hoàn tác; pane đã có chữ thì vẫn diff + Áp dụng. Cùng ranh giới mà `applyProposal` dùng cho neo rỗng, nên không có luật thứ hai phải nhớ.
- **843/845 test** (thêm 28), hai typecheck sạch, build qua, lint chỉ còn 2 lỗi có từ trước ở `rawText.ts`. Hai test đỏ là `rows.test.ts` (assertion đo thời gian) và `crash.test.ts` (giết tiến trình) — cả hai nằm ngoài change này, `git diff HEAD` rỗng, và qua 16/16 khi chạy riêng.
- Ba lần trong đợt này test đỏ hóa ra là **harness của tôi sai chứ không phải mã sai**: `controller.error()` xóa hàng đợi stream; ReadableStream pull sẵn một chunk nên một delta vẫn được giao sau `abort()`; và collector coi mọi chunk không phải `delta` là kết thúc, nên dừng chờ ngay ở chunk `tool`. Ghi lại vì cả ba đều là loại nhầm dễ lặp lại.
- **Vẫn chưa làm:** tool trỏ tab/điều hướng, đọc Thuật ngữ · Xưng hô (chờ `context-core`), và toàn bộ phần lái tay trong Electron.

### Lần chạm thật thứ ba: lỗi nằm trong **prompt**, không nằm trong mã

- Ngữ cảnh đã chạy đúng (panel ghi "đã gửi kèm 1 khối", 2.125 token vào), nhưng hỏi "dịch chương 1" vẫn nhận *"tôi không thể dịch toàn bộ chương"*. Model **tuân đúng lệnh đã nhận**: prompt chế độ Hỏi viết *"Chỉ trả lời và giải thích. Không viết lại bản dịch trừ khi người dùng hỏi thẳng cách viết lại một câu cụ thể."*
- Đó là lẫn **"không được ghi"** với **"không được giúp"**. Khác biệt giữa Hỏi và Sửa nằm ở chỗ câu trả lời có **áp dụng được** hay không, không nằm ở chỗ model được phép làm gì cho người đọc. Prompt Hỏi viết lại: cứ dịch ra trong câu trả lời, chỉ đừng nói rằng đã sửa hay đã lưu gì.
- Thêm một mặc định: chương **chưa có bản dịch** thì chế độ khởi đầu là **Sửa**, vì ở một pane trống không có gì để "hỏi về" — việc cần làm là tạo bản dịch, và Sửa là chế độ mà câu trả lời vào được pane. Người dùng tự chọn chế độ thì lựa chọn đó thắng và thôi đi theo chương.
- **Vì sao không test nào bắt được:** chưa có một test nào đọc prompt. Thêm `chatPrompt.test.ts` (10 test) kiểm cả nội dung lệnh lẫn cách lắp message — trong đó một test khẳng định đúng chuỗi cũ không được quay lại. Một lệnh sai có thể sống lâu bằng khoảng thời gian không ai đọc lại nó.
- Đây là lần thứ ba liên tiếp một buổi dùng thật tìm ra thứ mà 850 test không tìm ra: lần một là `listModels` không gửi khóa, lần hai là ngữ cảnh neo sai vào pane bản dịch, lần ba là prompt. Cả ba đều nằm ở **ranh giới giữa Mira và nhà cung cấp** — đúng vùng mà `ai-provider-live-verification` nói là chưa được kiểm chứng.

## Panel Hỏi AI gọi provider thật và sửa được bản dịch — 2026-10-02

- Làm **36/43 task** của change `ai-chat`. **817/817 test qua** (59 tệp, thêm 109 test), `typecheck:node` và `typecheck:web` **sạch hoàn toàn**, `electron-vite build` qua, `eslint` chỉ còn **2 lỗi có từ trước** ở `src/shared/rawText.ts`.
- **Kênh main → renderer đầu tiên của kho.** Trước đây mọi thứ đi `invoke`; chat cần đẩy chữ về nên có thêm `ai:chat:chunk`. Phát hiện lúc triển khai: kênh sự kiện **phải tách khỏi `CHANNELS`** — `library.ts` lặp qua mọi giá trị của nó để gọi `ipcMain.handle`, và map handler khai `Record<Channel, …>` nên quên một kênh là lỗi biên dịch, một bảo đảm đang có giá trị thật. Giờ có `EVENT_CHANNELS` riêng với kiểu riêng.
- **Ba luật bất biến của một lượt**, và chúng là nội dung test chứ không phải lời hứa trong comment: một `requestId` nhận **đúng một** `done` **hoặc** `error`; không bao giờ cả hai; không `delta` nào sau khi lượt đã kết thúc. Hai lượt chồng nhau có test riêng ở cả main và renderer — đó là ca mà `requestId` tồn tại để xử lý, và nếu sai thì chữ của hai câu trả lời trộn vào nhau.
- **Hủy không báo gì cho tầng khóa.** `report` chỉ nhận `'ok' | ClassifiedError`, nên sau một lần hủy thì nói `ok` là nói dối về một lần dùng chưa xong, còn báo lỗi sẽ **đóng băng một khóa hoàn toàn lành**. Không báo là đúng nghĩa "lần dùng này không kết luận được gì". Kèm theo: `chat()` kiểm `signal.aborted` **ngay trong vòng lặp** chứ không chỉ dựa vào việc thân stream tự lỗi — test lộ ra rằng để việc hủy phụ thuộc hành vi của `fetch` nghĩa là một endpoint cư xử khác sẽ làm nút Hủy mất tác dụng.
- **"Sửa" ghi vào editor, không ghi xuống kho** — đúng quyết định Q2, và lý do giờ có bằng chứng trong mã: `saveText()` xóa mọi segment không mang theo `id`, trigger `segment_delete_flags_links` lật **toàn bộ căn chỉnh của chương** sang `needs_review`, và `provenance` có `ON DELETE CASCADE`. Đường editor giữ được cả ba, cộng `Ctrl+Z`. Đánh đổi đã nhận: sửa qua chat vào kho **như chữ người dùng**, không mang nguồn gốc `ai`.
- **Chống ghi đè chữ người dùng, bằng nội dung chứ không bằng vị trí.** Panel không nhận được `ChangeSet` của editor nên offset nó giữ lúc hỏi là vô nghĩa sau khi người dùng gõ phía trên. Ba bậc: chữ ở `[from,to]` còn khớp → thay; đã trôi nhưng còn **đúng một lần** trong tài liệu → thay ở đó; còn lại → **từ chối** kèm lý do. Ca "chữ đó giờ xuất hiện hai lần" là ca mà một `indexOf` hồn nhiên sẽ ghi sai chỗ, và nó có test riêng. Đây là chỗ duy nhất trong change có thể làm **mất chữ của người dùng**, nên nó được chọn cách thận trọng nhất.
- **Ngữ cảnh dựng ở renderer, không ở main** — phản trực giác nhưng main chỉ thấy bản **đã lưu**, trong khi người dịch vừa sửa mấy câu và đang hỏi về chính mấy câu đó. Có một test tồn tại chỉ để giữ điều này ("thấy chữ chưa lưu"). Bản gốc ghép theo **chỉ số đoạn** và chỉ khi hai bên cùng số đoạn — luật cố tình ngờ nghệch, vì căn chỉnh thật là change `segment-auto-align` chưa có, và lựa chọn ở đây là giữa một luật ngờ nghệch đúng trong ca thường gặp và một phỏng đoán thông minh sai một cách tự tin.
- **Khối "đã dùng công cụ" đổi thành "đã gửi kèm"** — không có tool call nào. Mira chọn ngữ cảnh bằng luật; nói model đi tra là mô tả sai cơ chế. `aiChatSample.ts` **đã xóa** (năm nhóm model bịa với giá mẫu đi theo nó).
- **Ba chỗ sửa ngoài phạm vi, vì chúng chặn cổng kiểm:** hai lỗi `react-hooks/refs` do chính tôi gây ra (đọc ref trong lúc render — `targetEditor.current` truyền thẳng xuống panel, và `sessionRef.current = session`) đã sửa đúng cách bằng adapter ổn định và một effect; và **ba lỗi `typecheck:web` có từ trước** (`SearchField` thiếu `Omit<…, 'size'>`; `useAiTranslate` đọc `spent` trong chính phép gán của nó nên bị suy ra `never`) đã sửa — trước đó `typecheck:web` **chưa bao giờ sạch**.
- **Không thêm một dependency nào**, kể cả `@codemirror/merge` (Q7 để lại làm đường nâng cấp có điều kiện) và kể cả `jsdom`/`@testing-library/react`. Kho này **không có khả năng test component** (`vitest.config.ts` chỉ nhận `.ts`, `environment: 'node'`), nên mọi luật đáng kiểm được đẩy xuống module thuần và test cạn: `chatRange.ts` 15 test (gồm undo thật của CodeMirror chạy headless), `chatTurns.ts` 26, `chatContext.ts` 16, `lineDiff.ts` 10 (có tính chất "không mất dòng nào"), `chatStream.ts` 13 (nửa event, nhiều event một chunk, UTF-8 bị cắt). Phần lắp JSX **chưa có test** và được nghiệm thu bằng lái tay.
- **Bảy task còn mở, và chúng là phần kiểm chứng:** 1.1–1.4 cần một lượt gọi thật bằng khóa Gemini (khóa nằm trong `safeStorage`, không đọc ra được, nên việc này phải do chủ sản phẩm chạy), 10.2 lái tay trong Electron, 10.3 hai số đo quyết định có mở `@codemirror/merge` hay không. **Chưa gọi nhà cung cấp thật lần nào, chưa ai nhìn thấy panel chạy.** Mọi hình dạng chunk và lỗi trong test là giả định rút từ tài liệu; hình dạng 429 dùng lại đúng giả định mà `classifyError` đã dựng trên đó, nên nó thừa hưởng cùng một điều chưa kiểm chứ không thêm phỏng đoán mới.
- Một test **chập chờn** gặp trong lúc chạy: `src/shared/rows.test.ts` khẳng định `buildRows` 5.000 hàng dưới 50 ms, đo được 98 ms khi máy đang chạy build song song; qua 3/3 khi chạy riêng. Tệp đó không thuộc change này — ghi lại để không ai mất thời gian lần lại.

### Lần chạm thật đầu tiên bắt ngay một lỗi — `listModels` không gửi khóa

Chủ sản phẩm mở màn Cài đặt: kết nối Gemini báo **"Đang chạy"**, khóa báo **"Dùng được"**, nhưng mục Model nói *"Nối được nhưng endpoint này không liệt kê model"*. Lần ra:

- `listModels()` gọi `this.send('models', { method: 'GET' }, signal)` — **không truyền `secret`**, nên request đi ra **không có header `Authorization`**. Nguồn khóa không hề được hỏi tới.
- Thử chính endpoint đó không kèm khóa cho thấy vì sao triệu chứng không phải là lỗi xác thực: `GET https://generativelanguage.googleapis.com/v1beta/openai/models` trả **404 `"Requested entity was not found."`**. 404 → `kindForStatus` cho `refused` → không phải `auth`, không phải `network` → rơi đúng vào nhánh "endpoint không liệt kê model". **Một lỗi xác thực đội lốt một endpoint thiếu tính năng**, và vì thế kết nối vẫn hiện ra là khỏe mạnh.
- Sửa: lấy khóa qua `acquireKey()` rồi gửi kèm, và **báo kết quả cho tầng khóa như mọi lời gọi khác** — an toàn vì `decideFreeze` chỉ đánh dấu hỏng với `auth` và chỉ đóng băng với `rate_limited`, còn `refused` (endpoint thật sự không có `/models`) để khóa yên.
- **Vì sao bộ test không bắt được:** cả bốn test `listModels` chỉ khẳng định **giá trị trả về**, không test nào khẳng định **request gửi đi**. Đã thêm bốn test lấp đúng lỗ đó, và test chính được kiểm ngược — bỏ fix ra thì nó đỏ, lắp lại thì xanh.
- Đây là bằng chứng cho điều `ai-provider-live-verification` đã cảnh báo: một tầng chưa từng gọi nhà cung cấp thật có thể xanh hết test mà vẫn hỏng ở chỗ không test nào nhìn tới. Lần chạm thật **đầu tiên** đã tìm ra một lỗi như vậy.

## Nghiên cứu phương thức cho panel Hỏi AI chạy thật — 2026-10-02

- Khóa Gemini đã nối được, chủ sản phẩm yêu cầu panel "Hỏi AI" **chat thật, sửa được bản dịch, dịch được truyện**. Thêm [một trang nghiên cứu phương thức](../research/ai-chat-panel.md) trước khi viết change, theo [quy trình](handbook-guide.md) mục 3 (tách quan sát khỏi suy luận).
- **Quan sát đáng chú ý nhất là một thứ thiếu:** repo **không có một dòng kênh main → renderer nào** — `grep webContents.send` trong `src/main/` ra rỗng, `channels.ts` chỉ có kênh `invoke`. Đó là lý do job dịch được thiết kế thành "renderer điều phối từng lô", và cũng là chi phí thật của việc muốn chat có streaming. Ngược lại, kho kết nối, xoay khóa (`keyPool`), phân loại lỗi (`classifyError`), catalog giá và đường ghi một hàng nguyên tử (`saveRow` + `originFor`) đều dùng lại được **nguyên vẹn**.
- **Lớp tương thích OpenAI của Gemini đủ cho chat**: streaming, function calling, `response_format`, `reasoning_effort`, và `usage` ở chunk cuối. Không cần API gốc, không cần SDK nhà cung cấp — giữ đúng [ADR-004](../decisions/0004-ai-provider-layer.md). Tài liệu Google tự ghi lớp này **còn beta**.
- **Chỉ ra một chỗ panel minh họa đang hứa thứ đắt hơn cần thiết:** ba "bước tool" trong `aiChatSample.ts` ngụ ý một vòng lặp tool call, nhưng dữ liệu để tra (thuật ngữ, xưng hô, văn phong) nằm ở change `context-core` **chưa triển khai task nào**, và tool call phá tính tái hiện mà `contextHash` của [nghiên cứu ngữ cảnh](../research/story-context.md) cần. Đường giữa giữ nguyên giao diện đã vẽ: **lắp sẵn ngữ cảnh bằng luật, hiện ra dạng "đã gửi kèm"** thay vì "đã dùng công cụ".
- **Một điều kiện tiên quyết bị bỏ sót tới giờ:** `contextLabel` của panel là chữ cứng (`headingTitle(chapter) + ' · Đoạn văn 2'`) và chip "segment 88" là hằng số — panel **chưa biết con trỏ đang ở đâu**. Không có segment thật thì cả chế độ "Sửa" lẫn ngữ cảnh "mấy câu liền trước" đều không tồn tại.
- **Sáu quyết định Q1–Q6 chủ sản phẩm chốt ngay trong ngày:** streaming **làm ngay** (chọn `webContents.send` + `requestId`, không `MessageChannelMain`); "Sửa" **được tác động cả pane bản dịch**, không giới hạn một segment; ngữ cảnh **lắp sẵn bằng luật**, không tool call; hội thoại **giữ trong bộ nhớ phiên**; chat **không** thay job dịch chương; model **theo kết nối**.
- **Quyết định Q2 làm lộ một phát hiện đổi đường ghi.** Ghi cả pane xuống kho qua `text.save` có ba cái giá đọc được thẳng trong schema: `saveText()` xóa mọi segment không mang theo `id`; trigger `segment_delete_flags_links` lật **toàn bộ căn chỉnh của chương** sang `needs_review`; và `provenance` có `ON DELETE CASCADE` nên segment dựng lại **mất nguồn gốc**. Đường đúng là **ghi vào editor**: dispatch một transaction CodeMirror vào pane đang mở, để `applyEdits` trong `segmentMap.ts` map segment qua `ChangeSet` — đoạn không bị sửa **giữ nguyên `id`**, nên liên kết và nguồn gốc của chúng sống sót, và `Ctrl+Z` hoàn tác được. Đánh đổi đã ghi: sửa qua chat vào kho **như chữ người dùng**, không mang nguồn gốc `ai`.
- Hai thứ Q2 mở ra cũng **chốt cùng ngày**: diff **tự dựng trong panel**, nhận/bỏ cả khối, **không thêm dependency** — `@codemirror/merge` để lại làm đường nâng cấp có điều kiện, bật khi đo được tỷ lệ `Ctrl+Z` ngay sau Áp dụng cao, không bật vì nó đẹp hơn. Phạm vi một lần Áp dụng: **bôi chọn → vùng bôi chọn, không bôi chọn → đoạn chứa con trỏ, cả chương phải nói ra**; mặc định "cả pane" bị loại vì nó biến một câu hỏi vô hại thành viết lại cả chương. **Còn mở:** trần chi phí cho chế độ hỏi.
- Cập nhật [backlog](../delivery/backlog.md) (`ai-chat-panel`), [câu hỏi còn mở](../product/open-questions.md), [sổ nguồn](../research/sources.md) (S30) và mục lục.
- **Chưa gọi API nào, chưa dựng kênh streaming, chưa viết dòng mã nào** cho panel. Câu "chunk cuối mang `usage` kể cả khi không truyền `stream_options`" lấy từ diễn đàn, không phải tài liệu Google.

## Xóa năm ảnh mockup, dọn chỗ tham chiếu — 2026-10-02

- Chủ sản phẩm chốt bỏ thật năm ảnh mockup nhận ngày 2026-10-01 (`focus-mode`, `mode-1-full-text`, `mode-2-sentence-smartcat-inspired`, `original-workspace`, `smartcat-reference`) — **6,8 MB** cho thứ chỉ dùng một lần ở bước đối chiếu.
- **Nội dung từng mockup không mất.** Bảng "Ảnh tham khảo" trong [đề xuất redesign](../experience/editor-redesign.md) giữ nguyên phần mô tả — chỉ đổi cột đầu từ đường dẫn tệp sang tên gọi, và thêm một dòng nói tệp đã xóa. Đó là hồ sơ quá trình: mọi kết luận rút ra từ năm ảnh đã nằm trong bảng "Đối chiếu với quyết định hiện hành" và trong sáu mục backlog sinh ra từ nó.
- Dọn ba chỗ tham chiếu còn lại: dòng mục lục trong [README](../README.md), câu "Nguồn" đầu mục redesign trong [backlog](../delivery/backlog.md), và mục 5 của trang redesign (trước dẫn tên tệp `original-workspace.png`, giờ dẫn tên gọi).
- Sửa một lời khai sai trong mã: `livePreviewDecorations.test.ts` ghi "`editor-redesign`'s screenshots cover the rest (actual rendering in a real window)" — ảnh đó là **mockup người dùng gửi**, không phải ảnh chụp Mira đang chạy, nên câu đó sai cả trước khi xóa ảnh. Đổi thành nói thẳng: phần dựng thật trong cửa sổ thật **chưa được kiểm**.
- Mục ngày 2026-10-01 bên dưới vẫn giữ nguyên tên năm tệp — đó là lịch sử, không sửa.

## Đóng change `ai-connection` ở 25/41 task — 2026-10-02

- Chủ sản phẩm chốt: "hiện tại chỉ cần kết nối AI thôi" → **đóng change** thay vì làm hết mục kiểm chứng. `openspec archive ai-connection` đã áp delta vào `openspec/specs/`: thêm hai capability mới (`ai-connection`, `ai-translate-chapter`) và cập nhật `translation-provider` — tổng **19 requirement**.
- **16 task chưa làm không bị xóa**: chuyển thành chín mục trong [backlog](../delivery/backlog.md), mục "Kết nối AI và dịch bằng AI". Quan trọng nhất là `ai-provider-live-verification` — **tầng này chưa từng gọi một nhà cung cấp thật**, nên mọi hình dạng phản hồi và lỗi 429 trong test đều là giả định dựng từ nghiên cứu, và múi giờ mốc reset hạn mức theo ngày (`DAILY_RESET_TIME_ZONE` trong `keyPool.ts`) vẫn **chưa xác minh**. Kế đó là `ai-settings-visual-check`: màn Cài đặt và hộp thoại dịch **chưa ai nhìn thấy chạy trong Electron thật**.
- Ba hướng đã cân trong lúc thảo luận và chủ sản phẩm hoãn, ghi lại kèm hình dạng kỹ thuật để lần sau không phải cân lại: `ai-gateway-process` (Mira tự chạy gateway người dùng đã có, **không** đóng kèm binary), `ai-oauth-connections` (PKCE + loopback, khớp vào `KeySource` sẵn có, làm OpenRouter trước vì là nơi duy nhất đã xác nhận có OAuth PKCE chính thức cho app bên thứ ba), `ai-failover-chain` (cạn mọi khóa một kết nối thì sang kết nối khác — không đụng `keyPool`, không đụng provider).
- Hai change khác vẫn mở, **không** archive: `context-core`, `segment-auto-align` (cả hai 0 task, chưa triển khai gì).

## Dịch chương bằng AI: hộp thoại, ghi theo segment ID, không ghi đè bản người dùng — 2026-10-02

- Làm xong **4.6 và 4.7** của change `ai-connection`. **687/687 test qua** (50 tệp, thêm 13 test), `typecheck:node` và `typecheck:web` sạch, `electron-vite build` qua, `openspec validate ai-connection --strict` qua.
- **Hai kênh IPC mới, không phải một job dài**: `ai:translate:plan` nói trước sẽ gửi gì và tốn bao nhiêu (không gửi gì ra ngoài — có test khẳng định), `ai:translate:batch` dịch **một lô** rồi ghi ngay. Vòng lặp lô nằm ở **renderer** (`useAiTranslate.ts`). Lý do kiến trúc: kho này chỉ có `invoke`/`handle`, chưa có kênh main → renderer, nên đó là cách duy nhất để tiến độ là số câu **đã ghi thật** chứ không phải một chỉ báo chờ, và để Hủy chỉ là "không gửi lô tiếp". Hệ quả tốt kèm theo: mất kết nối hay đóng hộp thoại giữa lượt không làm mất phần đã dịch.
- **4.7 đi qua `saveRow` thay vì `EditorSession`** (khác chữ trong task cũ): `saveRow` đã là lời ghi nguyên tử một hàng có kiểm revision, biết cả văn bản, segment, liên kết và nguồn gốc; `EditorSession` sống trong trình soạn và không thấy liên kết. `saveRow` nhận thêm `by: RowAuthor`, nên bản AI có liên kết `kind: 'ai'` với `reviewedAt: null` và nguồn gốc mang provider + model — hàng hiện là "AI đã dịch", không phải "đã soát". Quy ước "provider giả lập ghi là `mock`, không bao giờ là `ai`" được tách thành `originFor()` để chỉ nằm một chỗ.
- **Luật không ghi đè, định nghĩa bằng một hàm thuần**: `isProtectedRow(row)` = hàng đã có bản dịch mà bản đó **không** phải đề xuất AI chưa ai soát. Gồm cả hàng `check` — chữ của người dùng vẫn nằm đó, chỉ là liên kết đang đáng ngờ. Những hàng đó vẫn được gửi đi nhưng kết quả **quay về hộp thoại dưới dạng hai bản cạnh nhau** ("Bản của bạn" / "AI đề xuất") với "Dùng bản AI" / "Giữ bản của tôi". Đổi lại là tốn token cho phần đã dịch — hộp thoại nói rõ số câu đó trước khi chạy.
- **Hai thay đổi ở tầng provider do test lộ ra**, không phải do đoán:
  - Lô thiếu vài câu sau khi đã thử lại tới trần **không còn ném lỗi** mà trả về phần đã có. Trước đó một câu không bao giờ về được làm mất cả hai câu đã dịch của lô — đúng điều spec cấm ("giữ toàn bộ phần đã thành công"). Tầng trên ghi phần có, liệt kê phần thiếu vào nhóm "Dịch lại phần lỗi".
  - `usage` của nhà cung cấp (`prompt_tokens`/`completion_tokens`) được đọc, cộng dồn qua cả lượt chạy và hiện cạnh ước lượng — đây chính là số liệu task 5.3 cần. **Chưa lưu lại**: lưu cần thêm bảng (schema v5), nên cảnh "ghi lượng dùng thật" của spec hiện chỉ đúng trong phạm vi một lượt chạy. Ghi thành task 4.7b thay vì tick bừa.
- Một sai số tôi tự sửa trong lúc viết test: `expectedRev` giả định sai trần thử lại — trần một lô là **ba lần**, nên một lần 429 rồi thành công thì lô đó **vẫn thành công**, không phải lỗi. Test viết lại cho đúng cơ chế đang có.
- **Dọn hai thứ ngoài lề**: `openspec validate --strict` thực ra **đang hỏng** — hai tệp spec mới (`ai-connection`, `ai-translate-chapter`) dùng `## Requirements` thay vì `## ADDED Requirements` nên không được coi là delta; đã sửa, giờ qua. Và `eslint` **đang hỏng 60 lỗi** vì wireframe `docs/handbook/experience/wireframes/screens.js` là script chạy thẳng trong trình duyệt bị lint như mã app; đã thêm thư mục đó vào `ignores`. Còn lại **2 lỗi lint có từ trước** ở `src/shared/rawText.ts` (`no-irregular-whitespace` với khoảng trắng U+3000 dùng có chủ đích, từ commit 57c45af) — chưa sửa vì nằm ngoài phạm vi; cách sửa đúng là `skipComments: true` cho rule đó cộng `　` trong regex.
- **Chưa xem bằng mắt trong Electron thật, và chưa gọi nhà cung cấp thật lần nào.** Mọi hình dạng phản hồi và lỗi trong test đều là endpoint giả. Task 5.1–5.4 vẫn là việc phải làm trước khi tin tầng này.
- **Còn lại trong change**: 4.4 (dựng chín trạng thái để xem cạnh nhau), 4.5b (`Ctrl+,`), 4.7b (lưu `usage`), toàn bộ mục 5.

## Nối IPC và dựng màn Cài đặt → Kết nối AI — 2026-10-02

- Làm tiếp mục 3.7 và 4.1–4.3, 4.5 của change `ai-connection`. **674/674 test qua** (49 tệp, thêm 19 test mới), typecheck main sạch, `electron-vite build` qua, lint 0 lỗi.
- **3.7 — lớp dán cuối cùng ở main process**: `createConnectionKeySource` nối kho khóa → `chooseKey` (fill-first) → `SecretStore.open` → `decideFreeze` → ghi trạng thái khóa. Test tích hợp chạy **đúng ca quan trọng nhất**: hai khóa, khóa đầu trả 429-theo-ngày, provider thật chuyển sang khóa sau trong cùng một yêu cầu, **không dịch lại segment đã xong**, và khóa đầu bị đóng băng tới mốc reset chứ không phải 21 giây như thân lỗi gợi ý. Sửa `decideFreeze` thêm một nhánh: lỗi mạng/từ chối/phản hồi hỏng **không phạt khóa** (trước đó mọi lỗi đều dẫn tới đóng băng mù).
- **4.1 — tám kênh IPC** (`ai:connections:*`) với schema `valibot` và `Result`, cộng `ConnectionService` gom thao tác. Chín test đi qua đúng tầng handler, trong đó một test khẳng định **khóa vào rồi không ra**: sau khi thêm, không phản hồi nào của bất kỳ kênh nào chứa chuỗi khóa.
- **4.2–4.3, 4.5 — giao diện theo phương án F**: ba nguyên tố dùng chung mới (`Switch` dựng trên Base UI, `Badge`, `EmptyState`), màn `SettingsScreen` giới hạn 900px không thanh bên con, `ConnectionCard` cho từng kết nối, và **nút bánh răng trong `AppShell`** đặt trước nút sáng/tối, có ở mọi màn. `App.tsx` thêm nhánh `View` `settings` và **nhớ màn trước** nên đóng cài đặt trả về đúng chỗ.
- Hai chi tiết nhỏ bám đúng đo đạc từ wireframe: `Badge` **không tô nền** vì ở theme sáng chữ cảnh báo trên nền tint chỉ đạt 4,20:1; lỗi kiểm tra kết nối được gắn vào **đúng ô gây ra nó** (khóa sai → cạnh ô khóa, không nối được → cạnh ô địa chỉ). Ngày của bảng giá đi qua IPC cùng kết quả kiểm tra thay vì nhân bản thành hằng số ở renderer.
- **Chưa xem bằng mắt trong app thật.** Thử ba lần lái Electron bằng Playwright `_electron` đều hỏng ở bước gắn vào tiến trình (Playwright báo "Process failed to launch", tiến trình thoát ~0,7 s sau khi khởi động), trong khi chạy tay `electron.exe --inspect=0 --remote-debugging-port=0 .` thì lên bình thường và in đúng dòng DevTools. Dừng ở đây thay vì đào tiếp; task 5.4 ghi rõ màn này **chưa được xác minh bằng mắt**. Bằng chứng hình ảnh duy nhất hiện có là wireframe đã probe, không phải bản dựng.
- **Còn lại trong change**: 4.4 (dựng chín trạng thái để xem cạnh nhau), 4.5b (`Ctrl+,`), 4.6–4.7 (hộp thoại "Dịch bằng AI" và ghi kết quả vào bản dịch), toàn bộ mục 5 kiểm chứng — trong đó 5.2a (lấy nguyên văn hai thân lỗi 429 thật) vẫn là việc phải làm trước khi tin bộ phân loại.

## Triển khai tầng provider: snapshot giá, kho khóa, adapter thật — 2026-10-02

- Theo yêu cầu "triển khai module này": làm xong **mục 1–3 của change `ai-connection`** (main process, có test, không phụ thuộc giao diện). 15 task tick xong, thêm một task mới. `pnpm test` **655/655 qua** (47 tệp), typecheck sạch, `electron-vite build` qua, lint 0 lỗi. **Chưa viết giao diện, chưa có IPC, chưa gọi thử nhà cung cấp thật lần nào.**
- **Bảng model và giá là dữ liệu thật**: `scripts/refresh-model-catalog.mjs` tải `models.dev/api.json` (MIT), lọc còn 7 nhà cung cấp Mira có preset và các trường cần, ghi `src/main/providers/modelCatalog.json` **kèm ngày đọc trong chính tệp** — 563 model, 202 KB, chạy offline vẫn biết giá. `lookupModel` tra theo `(providerId, modelId)` hoặc quét mọi nhà cung cấp khi kết nối là gateway (Mira không biết phía sau là ai); không khớp thì trả `undefined` để giao diện nói "chưa biết giá" thay vì hiện 0. `estimateCost` ước lượng từ ký tự nguồn, hệ số ký-tự-trên-token và tỷ lệ đầu ra **phỏng đoán chưa đo**, đặt một chỗ có comment.
- **Kho kết nối**: `library.db` lên version 4 với ba bảng `ai_connection`/`ai_key`/`ai_model`, migration nguyên tử, fixture schema mới. `SecretStore` dùng `safeStorage.encryptStringAsync`/`decryptStringAsync`, **từ chối lưu** khi kho khóa hệ điều hành không khả dụng, và ghi lại bản mã khi `shouldReEncrypt` báo hệ điều hành đã xoay khóa. Phần mã hoá được **tiêm vào** nên test chạy ngoài Electron. Không hàm nào trong `connections.ts` trả khóa dạng rõ: `ConnectionView` (thứ sẽ đi qua IPC) chỉ có bốn ký tự cuối, bản mã chỉ lấy được bằng `readKeyCiphers` trong main process.
- **Adapter thật** `OpenAiCompatibleProvider`: `fetch` trần, chia lô ở ranh giới segment (segment dài hơn cả lô vẫn đi riêng một lô chứ không bị cắt), gửi JSON có ID, parse chịu được rào ```json và chữ thừa, **luôn** chạy `reconcile` rồi **chỉ gửi lại các ID còn thiếu**. `listModels()` kiểm tra kết nối bằng `GET {base}/models`; endpoint không có `/models` được coi là "nối được nhưng chưa liệt kê được", chỉ 401/403 và lỗi mạng mới là lỗi kết nối thật.
- **Hai thứ khó nhất đã có test**: `classifyError` đọc lỗi ba lớp suy giảm êm và vẫn tìm được `retryDelay` trong một thân lỗi đã bị gateway làm méo; `keyPool.decideFreeze` phân biệt 429-theo-phút với **429-theo-ngày** — ca quyết định là "thân lỗi nói `retryDelay: 21s` nhưng `quotaId` chứa `PerDay`", và test khẳng định khóa bị đóng băng **hàng giờ** chứ không phải 21 giây. Mốc reset tính bằng `Intl` theo múi giờ đặt trong một hằng số, **chưa xác minh** là đúng múi nào (task 5.2a).
- **Nói rõ cái chưa xong**: ba mảnh (`readKeyCiphers` → `chooseKey` → `SecretStore.open` → `decideFreeze` → ghi lại trạng thái khóa) đã có và có test riêng nhưng **chưa có lớp dán chúng lại thành một `KeySource` thật** — thêm task 3.7, là thứ cuối cùng trước khi nối IPC. Và **toàn bộ hình dạng lỗi 429 trong test là giả định** dựng từ nghiên cứu, không phải từ một lần gọi thật.
- Ba việc dọn dẹp nhỏ: `MIRA_UPDATE_SNAPSHOTS=1` ghi đè cả bảy fixture schema cũ (chỉ khác xuống dòng), đã `git checkout` trả lại để chỉ còn `library-v4` là mới; `npx vitest` nuốt mất output trên máy này nên chạy thẳng `node node_modules/vitest/vitest.mjs`; ca đo hiệu năng `rows.test.ts > builds 5,000 rows` **chập chờn** (hỏng 1/3 lần chạy) — đã có trong nhật ký trước, không liên quan thay đổi này.

## Ẩn tab Từng câu, bỏ Reading view bản dịch — 2026-10-02

- Theo `segment-auto-align` bị hoãn (mục trên), chủ sản phẩm chọn **ẩn tạm tab "Từng câu"** khỏi `ChapterWorkspace` thay vì để "Sắp có": hằng số `SENTENCE_MODE_ENABLED = false` trong `ChapterWorkspace.tsx` tắt cả `TabsRoot`/`TabsTab` của tab này; `mode` state, `switchMode`, nhánh render `SentenceMode` giữ nguyên để bật lại chỉ bằng đổi hằng số đó khi `segment-auto-align` xong.
- **Bỏ hẳn (không phải tạm) công tắc "Soạn thảo"/"Đọc" ở pane Bản dịch**: xóa `reading`/`readText`/`showReading`, công tắc hai nút, và component `ReadingView.tsx` (không còn nơi nào dùng, xóa file). Pane Bản dịch giờ luôn là `TextEditor`, không còn chế độ đọc riêng. Đây là bỏ yêu cầu "Reading view cho bản dịch" đã có trong spec `translation-editor` (chưa archive) — **chưa viết delta REMOVED Requirements cho spec đó**, chỉ ghi ở đây; cần cập nhật spec nếu sau này archive `translation-editor`.
- `pnpm typecheck` và `pnpm lint` qua sau cả hai thay đổi. Chưa chạy `pnpm test`/`pnpm build` hay thử trong Electron thật.

## Nghiên cứu thuật toán căn chỉnh segment + spec `segment-auto-align` — 2026-10-02

- Người dùng hỏi về "cơ chế đồng bộ segment" khi dịch toàn văn rồi chuyển sang mode Từng câu. Đọc sâu nguyên lý Bertalign (hai pha: neo 1-1 bằng top-k cosine, rồi dynamic programming trong cửa sổ hẹp quanh neo để ra liên kết n:m; GPL-3.0, chỉ học ý tưởng) và Vecalign (xấp xỉ FastDTW, O(n), Apache-2.0 — được phép tái dùng mã); ghi vào [technical-feasibility.md §3](../research/technical-feasibility.md) và [alignment.md](../experience/alignment.md) (cả hai là thuật toán **theo lô**, không phải cơ chế tức thời theo từng ký tự gõ).
- **Phát hiện sửa một cảnh báo trước đó**: danh sách 25 ngôn ngữ công khai của Bertalign (dùng LaBSE) không có tiếng Việt/Nhật. Tra tiếp model card `intfloat/multilingual-e5-small` (MIT): hỗ trợ 100+ ngôn ngữ có liệt kê rõ `vi`, có benchmark riêng cho **BitextMining** 89–98% — đúng bài toán, và thoáng license hơn Bertalign. Chọn model này làm embedding, Transformers.js (`@huggingface/transformers`) làm runtime JS (không cần Python) — khớp với phần đã benchmark trước đó trong `technical-feasibility.md` (118 MB, ~0,64 s/400 câu trên Node 24). Ghi [S27](../research/sources.md) cho lần đọc sâu này (qua tóm tắt AI từ README/một file mã, chưa chạy, chưa xác minh công thức margin chính xác).
- Liệt kê toàn bộ repo được dẫn trong handbook theo nhóm (căn chỉnh, pipeline dịch AI, hệ sinh thái Việt, CAT nguồn mở, hạ tầng kết nối model) khi người dùng hỏi lại; xác nhận hai repo Việt hóa thật (`NovelKit`, `Quick Translator Engine`) là công cụ từ điển/pipeline, không phải engine alignment — không giải quyết trực tiếp bài toán đang hỏi.
- **Viết spec**: tạo change OpenSpec `segment-auto-align` (proposal + design + 2 spec file `segment-alignment`/`segment-links` + tasks; `openspec validate` qua). Capability mới `segment-alignment` (ước lượng 1-1 có confidence, hai bậc Bậc 0 không model/Bậc 1 embedding trong cửa sổ, không tự ghi dữ liệu); sửa capability `segment-links` (đã có ở change `sentence-mode`, chưa archive) để "Ghép theo thứ tự" dùng kết quả ước lượng trước, chỉ rơi về ghép thuần theo thứ tự cho phần còn lại. Đây là milestone **M3** đã nhắc ở backlog (`edited-segment-link-review`). Model tải một lần khi dùng lần đầu (không đóng gói sẵn, không phá nguyên tắc offline của ADR-002), suy giảm về chỉ Bậc 0 khi không có mạng/model.
- **Chưa làm**: chưa viết code, chưa có số đo độ chính xác thật trên văn bản ZH/JA/VI nào — ngưỡng confidence trong design chỉ là giả thuyết, task kiểm chứng (đo trên ít nhất hai chương thật mỗi cặp ngôn ngữ) phải chạy trước khi tin ngưỡng đó.
- **Hoãn triển khai**: ngay sau khi spec xong, chủ sản phẩm chọn tạm chưa làm — giữ nguyên hành vi `autoPair` hiện tại (ghép theo thứ tự, `confidence` luôn 0), không lên lịch. Spec trong `openspec/changes/segment-auto-align/` giữ nguyên để mở lại khi cần, bắt đầu từ `tasks.md` đã viết sẵn (nhóm 1–5). Cập nhật `backlog.md`: trạng thái `segment-auto-align` đổi từ "Spec sẵn sàng" thành "Hoãn".

## Không dùng SDK nhà cung cấp, gọi `fetch` trần (D15) — 2026-10-02

- Người dùng hỏi "có Google AI SDK không hay nên dùng gì". Có: `@google/genai` là SDK hợp nhất, **GA từ 05/2025**, thay `@google/generative-ai` (ngừng bug fix 2025-11-30, repo lưu trữ 2025-12-16). Vẫn **không dùng** — thêm D15 vào `design.md` và Quan sát 3 vào [nghiên cứu hai hướng provider](../research/provider-gemini-gateway.md).
- **Bằng chứng quyết định, đọc thẳng mã SDK:** `src/_api_client.ts` của `googleapis/js-genai` ném lỗi bằng `new ApiError({ message, status })` — **chỉ status và message**; thân lỗi bị `JSON.stringify` nhét vào `message` nên `error.details` không còn là trường có cấu trúc. Tức là SDK làm mất đúng thứ D10/D11 cần (`retryDelay`, `quotaId`), và Mira vẫn phải phân tích chuỗi — chỉ là qua thêm một lớp. Cùng vấn đề ở `@ai-sdk/google` ([vercel/ai #18627](https://github.com/vercel/ai/issues/18627)) và `python-genai` ([#1875](https://github.com/googleapis/python-genai/issues/1875)).
- Hai lý do phụ: SDK chỉ nói giao thức Gemini nên **không phục vụ hướng gateway** (trái D13 và ADR-004); và Electron 44 đi kèm Node 24 nên `fetch`/`AbortSignal` có sẵn, `valibot` đã có trong repo — **không thêm dependency nào**.
- **Điều kiện xem lại ghi rõ:** nếu 5.2a cho thấy lớp tương thích OpenAI của Gemini nuốt mất `error.details`, lựa chọn đúng không phải là thêm SDK mà là thêm **biến thể ánh xạ theo giao thức Gemini gốc bên trong cùng adapter**; gateway cũng phơi `/v1beta/models/*action` nên biến thể đó phục vụ được cả hai hướng.

## Spec triển khai hai hướng provider: gateway tự dựng và khóa Google — 2026-10-02

- Theo yêu cầu "lên spec triển khai cho 2 hướng provider này, nghiên cứu tính năng của cả 2 best practice": thêm [nghiên cứu hai hướng provider](../research/provider-gemini-gateway.md) và năm quyết định mới **D10–D14** trong `design.md` của change `ai-connection`, kèm yêu cầu mới trong hai spec và sáu task kiểm chứng. `openspec validate --strict` qua. **Chưa viết code, chưa gọi API nào, chưa dựng gateway.**
- **Phát hiện đổi thiết kế, không phải chi tiết:** Gemini trả 429 **không có header `Retry-After`** — thời gian chờ nằm trong thân JSON ở `error.details[]` (`@type: google.rpc.RetryInfo`, `retryDelay: "34.4s"`), và lớp trung gian có thể làm mất phần đó. Nặng hơn: **429 có hai loại khác hẳn nhau** — chạm giới hạn theo phút (chờ `retryDelay` rồi thử lại là được) và **cạn hạn mức theo ngày** (`quotaId` chứa `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, thử lại theo `retryDelay` là vô ích). Gộp hai loại làm một chính là thứ làm job nghìn chương chết giữa đêm — tức là **sửa lại D4** đã viết sáng nay.
- **D10 — đọc lỗi ba lớp suy giảm êm:** thân kiểu Google → thân kiểu OpenAI → quét chuỗi thô → cuối cùng chỉ theo mã HTTP; trả `{ kind, retryAfterMs?, quotaScope? }` và **không đoán** `quotaScope` khi không có bằng chứng. **D11 — hai mức đóng băng:** theo phút dùng đúng `retryDelay`; theo ngày đóng băng tới mốc reset; không xác định được thì mức ngắn rồi **nhân đôi dần**.
- **D12 — cảnh báo khóa cùng project:** tên quota là `…PerProject…`, nên hai khóa Gemini sinh trong cùng một project nhiều khả năng **dùng chung hạn mức** và `fill-first` giữa chúng vô ích. Mira không đọc được project từ khóa nên chỉ hiện một câu nhắc, không chặn. **Suy luận này chưa xác minh** — task 5.2b phải đo trước khi tin.
- **D13/D14 — hai preset, một adapter:** khác biệt giữa hai đường nằm hết trong dữ liệu kết nối (baseUrl, khóa là của proxy hay của Google, ai xoay vòng khóa, tên model có phải alias không). Hệ quả: **không được giả định `id` model khớp snapshot models.dev** — alias của gateway rơi vào nhánh "chưa biết giá" là bình thường; và phải chuẩn hoá tiền tố `models/` trước khi tra bảng.
- **Đọc được từ `config.example.yaml` của CLIProxyAPI** (1 191 dòng): `request-scoped-errors` với `status` + `match`/`match-regexr` + `action` ∈ `stop` · `stop-and-cooldown` · `continue` · `continue-and-cooldown` — **đúng cơ chế để xử lý 429-theo-ngày ở tầng gateway**; và `access.api-keys` là khóa client xác thực với chính proxy, **tách hẳn** khỏi khóa upstream. Hai thứ này vào task 5.9 (trang hướng dẫn dựng gateway): không đặt `access.api-keys` thì mọi tiến trình trên máy dùng được hạn mức Gemini của người dùng.
- Sáu task kiểm chứng mới, trong đó **5.2a là cái phải chạy trước**: lấy nguyên văn hai thân lỗi 429 thật (một theo phút, một theo ngày) để xác nhận D10/D11 đúng hay sai. Cập nhật mục lục [README](../README.md) và [sổ nguồn](../research/sources.md) (S29, ghi rõ hình dạng 429 lấy từ issue/diễn đàn bên thứ ba chứ không phải tài liệu Google).

## Chốt giao diện màn Kết nối AI: màn riêng, không thanh bên con — 2026-10-02

- Dựng wireframe bảy phương án (A–G) bằng **chính token và chuỗi class của dự án** (dán nguyên `tokens.css`, chép class của `Button`/`Panel`/`TextField`/`Banner`, font Google Sans Flex thật), probe ở 1280 và 375, hai theme, nấc Xám và Màu. Chủ sản phẩm xem rồi chốt **phương án F — màn riêng, không thanh bên con**, vào bằng **nút bánh răng ở góc trên bên phải** (cạnh nút sáng/tối, có ở mọi màn), đóng thì quay lại đúng màn trước.
- **Bỏ phương án popup bằng số đo, không bằng khẩu vị**: một thẻ kết nối cao ~500px ở 1280, cộng header + chân nút của hộp thoại là ~600px cho **đúng một** kết nối — gần bằng toàn bộ chiều cao cửa sổ; hai kết nối ~1 000px. Một dòng model cần ~450px cho tên mono + ngữ cảnh + giá, hộp thoại 520px trừ padding còn ~470px (probe đã báo cắt chữ khi thử khung 620px). Điểm duy nhất popup thắng — không rời chương đang mở — giải được bằng "nhớ màn trước, đóng thì quay lại".
- **Bỏ luôn thanh bên con của phương án A** (phương án vốn được khuyên dùng trước khi vẽ): ba mục nó liệt kê — Giao diện, Lưu trữ và backup, Về Mira — **đều chưa tồn tại**, vẽ ra là hứa ba màn chưa có; mà bỏ ba mục thì thanh bên chỉ còn một mục. Đây là lỗi tự mình phát hiện khi soi ảnh chụp wireframe, probe không bắt được. Giữ phương án G (panel trượt phải) làm dự phòng nếu sau này "không rời chương" thành ưu tiên.
- **Probe sửa được năm lỗi trước khi ai nhìn thấy**: checkbox gốc trình duyệt (8 chỗ) → checkbox `appearance-none`; badge 11px → 12px; **badge bỏ nền tint** vì ở theme sáng chữ cảnh báo chỉ đạt 4,20:1 và chữ thành công 4,25:1 (cần 4,5:1); nút "+ Thêm khóa" bị kéo hết hàng do cha là `flex-col`; dòng "Kiểm tra gần nhất" rớt dòng một mình ở khổ hẹp.
- **Ba phát hiện thuộc về dự án, chưa sửa** (ghi ở [thiết kế màn](../experience/ai-connection-settings.md)): nền rê mục thanh bên gần như không thấy ở theme sáng (`LibrarySidebar.tsx:60` dùng `hover:bg-control`, cho ra `#f1f1f1 → #eeefef`); chữ `--status-error` trên nền popover ở theme tối đạt 4,38:1; viền `--border-subtle` nhạt hơn ngưỡng. Hai nhóm probe khác báo nhưng **giữ theo quy ước dự án**: vòng focus (dự án tự vẽ trong `Button`/`TextField`) và vùng bấm dưới 32px ở 375 (size `xs`/`xxs` là cỡ desktop; Mira không có bản cảm ứng).
- Cập nhật `tasks.md` của change `ai-connection`: mục 0 chuyển sang đã chốt, 4.3 ghi rõ bố cục F (`max-w-[900px]`, mỗi kết nối một `Panel`), 4.5 ghi đường vào bằng nút bánh răng + nhớ màn trước, thêm 4.5b tùy chọn `Ctrl+,` theo đúng quy ước `event.defaultPrevented` đã có. `openspec validate --strict` qua. **Vẫn chưa viết code.**

## Nghiên cứu UI/UX và spec cho kết nối AI qua proxy + khóa Google — 2026-10-02

- Người dùng chốt lát cắt đầu: *"trước tiên tôi cần AI qua cliproxy + APIkey của Google trước, nghiên cứu ui/ux + spec cho feature này"*. Thêm [thiết kế màn cài đặt kết nối AI](../experience/ai-connection-settings.md) và change OpenSpec `ai-connection` (proposal + design + 3 spec + tasks; `openspec validate --strict` qua). Chưa viết code.
- **Ghi rõ cách hiểu đề**: "AI qua cliproxy + APIkey Google" có thể là proxy cấu hình bằng khóa Gemini, hoặc hai đường song song. Thiết kế phục vụ cả hai mà không cần chọn, vì cả hai đi qua đúng một adapter và đúng một biểu mẫu — khác nhau chỉ ở giá trị ô URL.
- **Audit trước khi thiết kế** (bắt buộc theo quy trình thiết kế của dự án): Tailwind v4 + Base UI, không shadcn; đã có `Banner`/`Button`/`Dialog`/`Panel`/`Select`/`TextField`…; **chưa có công tắc, badge, khối rỗng, và chưa có màn cài đặt nào**; phong cách **flat** (đếm ra 0 file glass/gradient/shadow); không có router, `View` là union trong `App.tsx`. Hai hệ quả: chỗ đặt màn cài đặt là quyết định cấu trúc, và phải dựng thêm 2–3 nguyên tố dùng chung.
- **Tra quy ước thật của app cùng loại** (Cherry Studio, Chatbox, LM Studio, opencode, cộng PR/issue công khai) thay vì viết theo trí nhớ. Ba thứ lấy nguyên: (1) **`GET /v1/models` là phép kiểm tra kết nối**, không phải một lần chat thử — rẻ, hầu hết nhà cung cấp không tính tiền, và **một lần bấm làm hai việc**: xác nhận URL + khóa và nạp danh sách model; (2) **ô khóa không được bắt buộc**, vì proxy local và Ollama/LM Studio thường không cần khóa — bắt buộc thì ca dùng chính của lát cắt này không khai nổi; (3) khóa đã lưu **không trả về giao diện**, chỉ cho thay. Hai thứ bỏ: nhập nhiều khóa bằng dấu phẩy (không có chỗ hiện khóa nào đang đóng băng — đúng thông tin cần lúc job dừng giữa nghìn chương) và gán khóa riêng theo từng model (thêm một trục cấu hình cho ca chưa ai yêu cầu).
- **Liệt kê trạng thái trước khi vẽ**: chín trạng thái cho màn kết nối (rỗng, đang kiểm tra, thành công, lỗi auth cạnh ô khóa, lỗi mạng cạnh ô URL, hết quota một khóa, hết mọi khóa, không lưu được khóa, model đã khai tử) và bảy cho hộp thoại dịch. Thiếu một trạng thái ở bước này thì bản dựng phải sửa lại bố cục.
- **Phạm vi change `ai-connection`**: màn cài đặt kết nối + adapter `openai-compatible` thật + nhiều khóa `fill-first` + `safeStorage` async + snapshot models.dev, **cộng một điểm gọi tối thiểu** ("Dịch bằng AI" cho một chương, có ước lượng, tiến độ theo segment, hủy, ghi nguồn gốc, không ghi đè phần người dùng đã sửa) — vì không có điểm gọi thì không chứng minh được AI đã chạy. Ngoài scope: job bền vững qua crash, Batch API, adapter native, prompt caching, ngữ cảnh trong prompt, panel Hỏi AI, mode Từng câu.
- **Ba quyết định kỹ thuật đáng ghi**: kết nối và khóa lưu ở `library.db` **không** ở tệp `.mira` (backup/chia sẻ một tác phẩm sẽ mang khóa API đi theo); khóa **không bao giờ quay về renderer** sau khi lưu, renderer chỉ nhận dạng che và trạng thái; tầng kiểm tra tập ID chạy **vô điều kiện** kể cả khi nhà cung cấp khai có structured output.
- **Đang chờ hai quyết định của chủ sản phẩm** trước khi dựng giao diện (mục 0 của `tasks.md`): chỗ đặt màn cài đặt (màn riêng — khuyên dùng / hộp thoại / khu trong màn tác phẩm) và có vẽ wireframe trước hay dựng luôn. Mục 1–3 của tasks (main process, không giao diện) chạy được ngay, không phụ thuộc hai câu đó.

## ADR-004: chốt scope tầng kết nối AI — 2026-10-02

- Người dùng yêu cầu: "vẫn muốn áp dụng cli proxy, và sử dụng apikey chính thống hoặc dùng openrouter, tham khảo opencode nữa xem. Và chốt scope cho tôi" — tức **uỷ quyền chốt scope**. Thêm [ADR-004](../decisions/0004-ai-provider-layer.md) ở trạng thái Accepted, chi tiết hoá phần "Kết nối model" của [ADR-002](../decisions/0002-ai-first-translation.md) mà không đổi ràng buộc nào của nó.
- Đọc thêm **opencode** (MIT) và **models.dev** (MIT) trước khi chốt, ghi thành Quan sát 6 trong [nghiên cứu](../research/ai-provider-integration.md). Hai điều đổi quyết định: (1) opencode hỗ trợ 75+ nhà cung cấp **bằng cấu hình khai báo**, provider lạ và model local dùng **cùng một hình dạng** (`@ai-sdk/openai-compatible` + `baseURL`), nên không cần code riêng cho "local"; (2) **`models.dev/api.json` đã có đủ bảng giá/giới hạn/năng lực**, kể cả `cost.cache_read`/`cost.cache_write` và `status: deprecated` — giải quyết trực tiếp cảnh báo lớn nhất của nghiên cứu hôm nay là "đừng tự nuôi bảng giá".
- **Chốt cho lát cắt đầu:** đúng **một adapter `openai-compatible`** cho mọi nhà cung cấp (preset chỉ là baseUrl điền sẵn: OpenRouter, Gemini `/v1beta/openai/`, Anthropic, OpenAI, DeepSeek, Ollama, LM Studio, và một ô "Gateway tự dựng"); registry model là **snapshot models.dev vendored vào repo** kèm ngày + script refresh (chạy offline vẫn biết giá); **nhiều key một provider** với `fill-first` cố định + cooldown theo `retryAfterMs`; `safeStorage` async và **từ chối lưu** nếu không khả dụng; chỉ chế độ gửi tương tác; tầng kiểm tra ID **luôn chạy** bất kể provider khai gì.
- **Giải quyết yêu cầu "vẫn muốn áp dụng cli proxy"**: áp dụng theo hướng Mira là *client*, gateway là *upstream*. Ai cần nhiều hãng hay nhiều tài khoản cùng lúc thì tự dựng CLIProxyAPI/LiteLLM **bằng API key của mình** rồi trỏ ô "Gateway tự dựng" vào — giải pháp bằng **tài liệu, không bằng code**, nên Mira không đóng kèm process nào và không mở cổng nào. Hai lớp `fill-first` không xung đột: ai dựng gateway thì khai một key trong Mira.
- **Đánh đổi ghi rõ trong ADR:** đi qua lớp compat của Anthropic thì mất `strict` (không bảo đảm schema) và mất prompt caching; chấp nhận được vì tầng kiểm tra ID vốn đã bắt buộc và lát cắt đầu chưa dùng caching/batch. Phụ thuộc mới: models.dev — đổi rủi ro "tự nhập giá sai" thành rủi ro "nguồn ngoài ngừng", giảm thiểu bằng snapshot vendored.
- **Hoãn có điều kiện kích hoạt** (không phải hoãn vô thời hạn): adapter native Anthropic/Gemini, Batch API 50%, OpenRouter PKCE, panel Hỏi AI gọi thật, tự dò runtime local, weighted routing. **Ngoài scope, đổi ý cần ADR mới:** đóng kèm gateway/runtime, mọi OAuth thuê bao và mọi preset đặt tên theo CLI thuê bao, Agent mode, registry dịch cặp `(from, to)`, Vercel AI SDK trong job dịch.
- Cập nhật [decisions.md](../product/decisions.md) (hàng "Kết nối AI"), [open-questions.md](../product/open-questions.md) (hai hàng P0/UX chuyển sang "đã trả lời một phần", nêu rõ phần còn mở là provider mặc định khi cài mới, con số trần chi phí mỗi job và danh sách dữ liệu gửi đi), mục lục [README](../README.md), [sổ nguồn](../research/sources.md) (S28). Chưa sửa scope.md/roadmap/backlog và chưa viết code — ADR này chốt phạm vi, spec AI và `openspec` change là bước sau.
- Phát hiện phụ khi cập nhật sổ nguồn: **mã S27 đang bị trùng** cho hai nhóm nguồn khác nhau (ngữ cảnh truyện và thuật toán căn chỉnh). Chưa đánh số lại vì `story-context.md` và `technical-feasibility.md` đang trích dẫn; đã ghi chú ở đầu sổ nguồn.

## Nghiên cứu ngữ cảnh truyện: so sánh sản phẩm và đề xuất — 2026-10-02

- Theo yêu cầu người dùng ("nghiên cứu thêm về ngữ cảnh cho truyện, so sánh các phương pháp của từng sản phẩm và đề xuất"): thêm [story-context.md](../research/story-context.md). Khảo sát ba nhóm — công cụ dịch truyện/game (GalTransl, AiNiee, LinguaGacha, auto-novel, OpenNovel, TranslateABook, darkautism/ai-novel-translation, Sakura), CAT/nền tảng dịch (memoQ, MultiTerm, Smartling, Intento), công cụ viết/roleplay AI (SillyTavern World Info, NovelAI Lorebook, Novelcrafter Codex, Sudowrite Story Bible) — cộng hai bài nghiên cứu (DelTA, TransAgents). **Chưa cài, chưa chạy, chưa benchmark sản phẩm nào.**
- Khung mới: ngữ cảnh truyện có **sáu lớp** (thuật ngữ/tên riêng · hồ sơ nhân vật · **quan hệ giữa nhân vật** · thế giới quan · văn phong · tóm tắt và ký ức gần). Lớp quan hệ — thứ tiếng Việt cần nhất cho xưng hô — **không công cụ dịch nào trong mẫu khảo sát có**; gần nhất là relations một chiều của Novelcrafter, vốn là liên kết chứ không mang giá trị.
- Ba phát hiện đổi hướng thiết kế so với handbook hiện có: (1) **ablation của DelTA** cho thấy nhồi thêm câu liền trước (thứ mọi công cụ truyện đều làm, `contextNum` mặc định 8) làm LTCR-1 **giảm** 2,38 điểm, nhất quán thực sự đến từ **tóm tắt song ngữ** và **sổ tên riêng chốt theo lần dịch đầu** — và hai thứ đó rẻ nếu chạy ở đơn vị *chương* thay vì *câu* (DelTA tốn ~3 lần gọi LLM mỗi câu, không khả thi với truyện nghìn chương); (2) quy tắc “chỉ gửi mục xuất hiện trong đoạn” của GalTransl/AiNiee/Intento **sai cho lớp xưng hô**, vì tiếng Việt cần đại từ đúng ở chính các đoạn thoại không nhắc tên ai → thuật ngữ lọc theo đoạn, xưng hô lọc theo **dàn nhân vật của chương**; (3) **nghịch lý cache không phải nghịch lý**: lọc để giữ chất lượng (Intento: gửi cả glossary có thể *giảm* chất lượng; lost-in-the-middle) và cache để giảm giá không xung đột nếu xếp đúng thứ tự — thứ tự khối của AiNiee đặt glossary đã lọc ngay sau system prompt, đúng chỗ tệ nhất có thể khi có prompt caching.
- Đề xuất chính: **ba tầng prompt theo điểm cắt cache** (A ổn định cả job: hướng dẫn + định dạng ID + văn phong đã duyệt; B ổn định trong một chương: tóm tắt song ngữ + ma trận xưng hô có hiệu lực + hồ sơ nhân vật của chương; C biến thiên theo đoạn: thuật ngữ khớp + ví dụ văn phong + segment liền trước + nguồn), quy tắc một câu “không có gì ở tầng C đứng trước A hoặc B”; một bảng mục ngữ cảnh dùng chung bốn trường `fromChapter`/`toChapter`, `status`, `origin`, `aiContext` (bốn mức lấy của Novelcrafter); **`fromChapter` giải quyết đồng thời xưng hô đổi giữa truyện và chặn rò spoiler** — lợi thế cấu trúc vì Mira biết đang dịch chương nào; ngân sách ngữ cảnh có ưu tiên tĩnh (mượn `Budget`/`Insertion Order` của lorebook, **bỏ** `Probability`/nhóm loại trừ/đệ quy vì job dịch phải tái hiện được); `buildContext(...) → { blocks, contextHash }` là hàm thuần để “đổi glossary → đánh dấu segment chịu ảnh hưởng” thành phép so hash.
- Một lợi thế riêng của cặp đích tiếng Việt: vì tiếng Việt đơn lập, thất bại kinh điển của glossary ở CAT tool (không khớp vì **biến tố**) gần như không xảy ra — `dst` đã duyệt thường xuất hiện nguyên chữ, nên Mira có thể đặt kiểm tra tuân thủ glossary thành **cổng QA cứng** thay vì chỉ cảnh báo, cộng thêm **term cấm** (memoQ) và **biến thể term** (Smartling).
- Cập nhật mục lục [README](../README.md) và [sổ nguồn](../research/sources.md) (S27, có ghi rõ nguồn yếu: TranslateABook/Sudowrite chỉ có trang bán hàng và blog chính hãng; Smartling trả 403 và DeepWiki auto-novel trả 429 lúc đọc; số của DelTA từ bản HTML, model đời GPT-3.5/GPT-4, không có cặp tiếng Việt, chưa tái hiện). Chưa sửa `decisions.md`, `open-questions.md` hay backlog: P0 ma trận xưng hô và P1 văn phong vẫn mở, trang này là đề xuất chờ chủ sản phẩm chốt. Bảy bước kiểm chứng ghi ở cuối tài liệu, trong đó phép đo quyết định là so ba cách gửi glossary (dump cache được / lọc đặt sai chỗ / lọc đặt ở tầng C) trên fixture 2 bộ × 10 chương.

## Nghiên cứu chế độ AI, nhà cung cấp, CLI proxy và model local — 2026-10-02

- Theo yêu cầu người dùng ("nghiên cứu AI mode, các hướng đi cho AI provider, cli proxy cho đa dạng AI, model local"): thêm [ai-provider-integration.md](../research/ai-provider-integration.md). Chỉ đọc tài liệu và bài so sánh công khai trong ngày; **chưa gọi thử provider nào, chưa benchmark, chưa dựng proxy, chưa chạy model local**.
- Ba điểm mới so với handbook hiện có: (1) "AI mode" tách thành **ba chế độ có quyền khác nhau** — job dịch theo lô, Hỏi AI (chỉ đọc), hành động nhanh (đề xuất phải duyệt) — và chốt là **không làm Agent mode**; (2) **Batch API giảm 50%** ở cả ba hãng lớn và khớp `custom_id` ↔ segment ID đúng y thiết kế trong `providers/types.ts`, nên job dịch nên có hai chế độ gửi (tương tác / theo lô); (3) **prompt caching cộng dồn với batch**, nhưng là so khớp tiền tố nên thứ tự glossary/văn phong trong prompt trở thành quyết định kiến trúc, không phải chi tiết.
- Đề xuất **ba adapter** thay vì một adapter mỗi hãng: `openai-compatible` (phủ DeepSeek, Qwen, OpenRouter, Ollama, LM Studio, llama.cpp, gateway tự dựng), `anthropic`/`gemini` qua API gốc khi cần structured outputs có bảo đảm + caching + batch, và `mock` giữ nguyên. Lý do không dùng một đường duy nhất: lớp tương thích OpenAI của Anthropic **bỏ qua `strict`** nên không bảo đảm schema và không có prompt caching — hai thứ pipeline ID của Mira dựa vào.
- Đọc lại điều khoản theo yêu cầu của [ADR-002](../decisions/0002-ai-first-translation.md): Anthropic chặn OAuth thuê bao từ 2026-01-09 và đổi chính sách 2026-04-04; Google cấm từ tháng 2/2026, cưỡng chế từ 2026-03-25, đã khóa cả tài khoản trả phí. Kết luận không đổi quyết định cũ, chỉ làm rõ **ranh giới UI**: có ô "endpoint tương thích OpenAI" (trung lập, dùng cho model local/gateway/proxy tự dựng) nhưng **không** preset tên theo CLI thuê bao và không luồng OAuth nào ngoài OpenRouter PKCE.
- Bổ sung cùng ngày theo yêu cầu "tham khảo repo này": đọc kỹ [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) (README, `config.example.yaml`, `internal/api/server_routes.go`, `internal/translator/translator/translator.go`) và thêm Quan sát 3b. Ba điều đổi kết luận: (a) **sửa lại cách hiểu** — repo này là dual-use, có nguyên nhóm `api-keys` và `openai-compatibility` cho upstream dùng API key, phần vi phạm điều khoản chỉ là các route OAuth callback thuê bao; (b) **giấy phép MIT**, khác GalTransl/auto-novel (GPL-3.0) và AiNiee (AGPL-3.0) nên được tham khảo cả mã, không chỉ ý tưởng; (c) **không đóng kèm** dù MIT — đóng kèm nghĩa là nuôi thêm một process, cổng 8317, tầng auth thứ hai, plugin loader và server OAuth callback, tức đóng kèm luôn cơ chế vi phạm.
- Hai suy luận mới rút từ repo đó (mục 9 và 10 trong tài liệu): **nhiều key cho một provider nên vào contract ngay** (`TranslationProvider` hiện ngầm định một credential; lấy từ vựng `fill-first`/`round-robin`/`weight`/`cooldown`, trong đó `fill-first` đúng ca free tier và khớp thói quen xoay vòng key Gemini của cộng đồng Voz), và **khác biệt giữa các hãng nên là dữ liệu khai báo** (alias model, payload override theo model, quy tắc phân loại lỗi theo provider — bảng `RETRYABLE` trong `types.ts` đang hardcode cho mọi hãng). Bài học ngược: **không** bắt chước registry dịch theo cặp `(from, to)` của nó — nó cần ma trận N×N vì phục vụ client bất kỳ, Mira chỉ có một định dạng nội bộ nên chỉ cần N adapter một chiều.
- Cập nhật mục lục [README](../README.md) và [sổ nguồn](../research/sources.md) (S26). **Giá và tên model không-Anthropic trong trang này lấy từ trang tổng hợp bên thứ ba, chưa đối chiếu trang giá chính chủ** — ghi rõ trong tài liệu, phải đọc lại trước khi đưa vào UI ước lượng chi phí. Chưa sửa `decisions.md`, `open-questions.md` hay backlog: đây là nghiên cứu + đề xuất, chờ chủ sản phẩm chốt.

## Ctrl+B trong editor bật/tắt đậm thay vì đóng thanh bên — 2026-10-02

- Người dùng báo: bấm Ctrl+B trong pane bản dịch lại đóng/mở thanh bên thay vì in đậm, kèm yêu cầu nghiên cứu cách đặt phím tắt cho đúng. Nguyên nhân: `AppShell.tsx` gắn trình xử lý `Ctrl+B` toàn cục trên `window`, không kiểm tra đang focus ở đâu, trong khi `TextEditor` chưa hề nhận Ctrl+B — không có gì "giành" phím đó ở tầng editor nên trình xử lý toàn cục luôn thắng.
- Kết luận sau khi khảo sát (không cài thư viện phím tắt — xem D8 ở `editor-rich-text-images/design.md`): đây là vấn đề phạm vi (scoping), không phải thiếu công cụ bắt phím. `keydown` nổi bọt từ phần tử đang focus lên `window`; phần tử cụ thể hơn (editor) nhận trước và gọi `preventDefault()` khi tự xử lý; trình xử lý toàn cục chỉ cần kiểm `event.defaultPrevented` trước khi hành động là tự nhường đúng cách, không cần gì thêm ngoài nền DOM sẵn có.
- `boldCommand.ts` (mới): `toggleBold` — một `Command` của CodeMirror — bọc/gỡ `**` quanh vùng chọn; nếu con trỏ hay vùng chọn đang nằm trong một đoạn đã đậm sẵn (quét dòng hiện tại bằng regex, không cần chọn đúng cả cặp `**`) thì gỡ đậm. Gắn vào `TextEditor` qua `keymap.of([{ key: 'Mod-b', run: toggleBold }])`, chỉ khi Live Preview bật (pane bản dịch).
- Ba trình xử lý phím tắt toàn cục đang có (`AppShell` Ctrl+B thanh bên, `ChapterWorkspace` Ctrl+S và Ctrl+K) thêm `if (event.defaultPrevented) return` ở đầu, theo đúng quy ước "cụ thể hơn nhận trước". Nhân tiện sửa `AppShell` thiếu `event.metaKey` (chỉ kiểm `ctrlKey`), không nhất quán với hai nơi kia.
- Cập nhật spec `editor-rich-text-images/specs/full-text-editor/spec.md` (yêu cầu + 4 scenario mới) và `current-state.md`. Kiểm bằng `pnpm typecheck`, `pnpm lint`, `electron-vite build`, `pnpm vitest run` (569/569, trừ 1 ca chập chờn ở `rows.test.ts` không liên quan) — đều sạch; chưa bấm thử trên Electron thật.

## Live Preview ẩn dấu đậm/nghiêng/gạch ngang khi rời con trỏ — 2026-10-02

- Theo phản hồi trực tiếp của người dùng sau khi thử bản Live Preview (chỉ mờ dấu, không ẩn): đổi đậm/nghiêng/gạch ngang sang ẩn hẳn cặp dấu `**`/`*`/`_`/`~~` khi con trỏ/vùng chọn không chạm vào đúng đoạn đã gõ xong (đủ cặp mở/đóng), hiện lại mờ ngay khi bấm vào để sửa — không cần công tắc bật/tắt, tự động theo vị trí con trỏ, giống Live Preview thật của Obsidian. Tiêu đề/trích dẫn/danh sách **không** đổi (vẫn mờ, luôn hiện) vì ẩn hẳn dấu đầu dòng sẽ mất luôn dấu hiệu là tiêu đề/danh sách mà không có gì thay thế.
- Kỹ thuật: tách `selectionTouches()` dùng chung giữa `livePreviewDecorations.ts` và `imageEmbedDecorations.ts` (trước đó ảnh đã có hàm tương đương riêng). Dùng `Decoration.replace({})` không widget cho hai dấu khi span hoàn chỉnh và không bị chạm; `update.selectionSet` được thêm vào điều kiện dựng lại decoration (trước chỉ dựng lại khi đổi chữ hoặc cuộn) để riêng việc di chuyển con trỏ bằng phím mũi tên cũng cập nhật đúng.
- **Đây là lần đầu change này ẩn ký tự người dùng gõ tay qua IME** (khác ảnh — ảnh chỉ chèn qua paste/drop). Lý lẽ an toàn giống hệt widget ảnh (chỉ ẩn khi span hoàn chỉnh và con trỏ đã rời hẳn, không bao giờ ẩn/hiện giữa lúc đang compose) nhưng **chưa được xác nhận bằng tay thật trên máy** — ca quan trọng nhất: gõ xong `**chữ**` rồi gõ dấu cách ngay lập tức bằng Telex/VNI thật. Ghi vào `design.md` (D1b) và `tasks.md` (1.3) của change `editor-rich-text-images` là rủi ro chưa đóng, có thể phải lùi lại mark-only riêng cho ba cú pháp này nếu ca IME thất bại.
- Cập nhật `current-state.md` và spec `editor-rich-text-images/specs/full-text-editor/spec.md` (yêu cầu + scenario) cho khớp. Kiểm bằng `pnpm typecheck`, `pnpm lint`, `electron-vite build`, `pnpm vitest run` (562/562, trừ `crash.test.ts` chập chờn không liên quan) — đều sạch; chưa xem bằng mắt hay gõ tay thật trên Electron (môi trường agent không chạy được GUI).

## Chrome màn chương: pane vuông sát nhau, bỏ lề số dòng — 2026-10-02

- Theo yêu cầu trực tiếp của người dùng (kèm ảnh tham chiếu Antigravity IDE): đổi khung hai pane + panel "Hỏi AI" ở mode Toàn văn từ "card" (viền, bo góc `--radius-panel`, cách mép/cách nhau 12px) sang vuông, sát mép, sát nhau — chỉ còn một đường kẻ 1px dùng chung (`divide-x divide-line` ở khung lưới `ChapterWorkspace.tsx`, thay vì viền riêng từng pane trong `EditorPane.tsx`/`AiPanel.tsx`). `TextEditor.tsx` bỏ `border-radius` của CodeMirror cho khớp.
- Theo yêu cầu tiếp theo: giảm padding ngang của dòng văn bản (`'.cm-line'`: `0 16px 0 4px` → `0 8px`) và bỏ hẳn cột số dòng ở lề (`gutter()`/`NumberMarker` gỡ khỏi `segmentDecorations.ts`) — áp dụng cho cả hai pane (bản gốc và bản dịch), vì đây là editor dịch văn xuôi, không cần lề kiểu code editor. Ranh giới segment vẫn thấy được bằng nền xen kẽ nhẹ + gạch dưới chấm cho segment đã sửa, không đổi.
- Cập nhật các spec OpenSpec chưa archive cho khớp: `editor-redesign` (yêu cầu "Khung màn chương gọn theo phương án D"), `source-editor` (`specs/source-editor`, `specs/chapter-screen`, `design.md` D7), `translation-editor` (`specs/chapter-screen`) — đều còn ghi SHALL cũ (viền/bo góc/cách nhau 12px, lề có số dòng) nên sửa lại cho đúng hành vi mới, kèm chú thích "Cập nhật 2026-10-02" và lý do. `openspec validate --strict` qua cho cả ba change.
- Cập nhật `current-state.md` (hàng "Soạn thảo bản gốc"). Kiểm bằng `pnpm typecheck`, `pnpm lint`, `electron-vite build`, `pnpm vitest run` (562/562, trừ ca `crash.test.ts` chập chờn theo máy không liên quan) — đều sạch. Chưa xem bằng mắt trên Electron thật (môi trường agent không chạy được GUI).

## Mở rộng Live Preview và nhúng ảnh — 2026-10-02

- Nghiên cứu tài liệu chính thức Obsidian (cú pháp Markdown, Live Preview, nhúng/resize ảnh) làm cơ sở viết change OpenSpec `editor-rich-text-images`, tiếp nối `editor-redesign` (chưa archive). Dựng thẳng vào code theo spec đã duyệt:
  - `livePreviewDecorations.ts` thêm nghiêng (`*x*`/`_x_`), gạch ngang (`~~x~~`), trích dẫn (`> x`) và danh sách (`-`/`*`/`+`/`1.`) — cùng khuôn mark decoration/regex-theo-dòng đã có, không ẩn ký tự cú pháp, để không phá IME.
  - Nhúng ảnh (mới): dán/kéo-thả một ảnh (PNG/JPEG/GIF/WebP) vào pane bản dịch chèn cú pháp cục bộ `![[id]]` (ID nội bộ, không phải tên tệp — Mira không có vault thư mục như Obsidian), hiện ngay thành ảnh thật bằng `imageEmbedDecorations` (widget `Decoration.replace`, điểm duy nhất lệch khỏi quy tắc "chỉ mark decoration", an toàn IME vì chỉ áp dụng cho cú pháp đã gõ xong và con trỏ không chạm vào). Kéo góc dưới-phải để đổi cỡ (ghi lại hậu tố `|rộng`).
  - Ảnh lưu dạng blob ngay trong tệp `.mira` của tác phẩm (bảng `image` mới, schema version 5, nâng cấp nguyên tử), qua kênh IPC có kiểu `images.put`/`images.get`/`images.delete` (data URL như `works.getCover`/`setCover`, không stream bytes riêng); main process nhận diện định dạng theo byte thật (không theo đuôi tên hay mime renderer khai), giới hạn 8.000.000 byte/ảnh và 200 ảnh/tác phẩm; renderer co ảnh về tối đa 2000px trước khi gửi.
  - Không làm: bảng, callout, công thức toán, mermaid, footnote, comment `%% %%`, ảnh từ URL ngoài, embed PDF/audio/video/note, thư mục đính kèm tuỳ chỉnh, dọn ảnh mồ côi tự động.
- Cập nhật `decisions.md` ("Nội dung chung"), `backlog.md` (`rendered-direct-edit-view`), `current-state.md`.
- Kiểm bằng `pnpm typecheck` (sạch, trừ một lỗi có sẵn không liên quan ở `SearchField.tsx` trên nhánh này), `pnpm lint` (không lỗi/cảnh báo mới), `electron-vite build` (qua), `pnpm vitest run` (562/562 qua). Chưa lái thử bằng Electron thật và chưa có bảng ca IME thật (dán ảnh, gõ cạnh ảnh, gõ các cú pháp mới) — môi trường agent không chạy được Electron; cần người dùng xác nhận trước khi archive change này.

## Sửa lại: thêm nhãn Ngữ cảnh trong màn chương — 2026-10-02

- Mục ngày 2026-10-01 bên dưới ghi nhầm là "quyết định không thêm hàng tab Ngữ cảnh" trong màn chương; người dùng xác nhận lại muốn thấy đúng như wireframe D (hàng nhãn **Thuật ngữ · Xưng hô · Văn phong** cạnh mode Toàn văn/Từng câu). Đã thêm hàng này vào `ChapterWorkspace.tsx`: ba nhãn tĩnh, mỗi nhãn kèm badge "Sắp có" dùng chung `SOON_LABEL`/`MOCK_FEATURES.contextArea` đã có, không bấm được, không tạo điều hướng hay mục `mockFeatures` mới (không trùng với tab Ngữ cảnh ở cấp tác phẩm, chỉ là xem trước). Cập nhật lại `editor-redesign.md` và change OpenSpec `editor-redesign` (proposal/specs/design/tasks) cho khớp.

## Dựng phần redesign đã chốt từ wireframe — 2026-10-01

- Sau khi chọn phương án D ở [đề xuất redesign](../experience/editor-redesign.md), dựng vào code thật: sidebar bên trái đổi thành danh sách chương của tác phẩm (`ChapterNavSidebar`) khi đang mở một chương, thay vì điều hướng thư viện. Pane bản dịch ở mode Toàn văn có Live Preview nhẹ (`livePreviewDecorations`: `#`/`##`/`###` và `**đậm**`, chỉ mark decoration để không phá IME, không ẩn ký tự cú pháp — khác Live Preview đầy đủ của Obsidian). Nút "Hỏi AI" (hoặc Ctrl+K) ở mode Toàn văn mở `AiPanel`, một cột thật cạnh hai pane (không che nội dung) với nội dung hỏi/đáp là dữ liệu mẫu, đăng ký minh họa "Sắp có" (`ai-chat-panel`) theo đúng quy ước `mockFeatures`.
- Quyết định không thêm hàng tab "Ngữ cảnh" (Thuật ngữ/Xưng hô/Văn phong) riêng trong màn chương như wireframe D ban đầu: khu vực này đã có sẵn ở cấp tác phẩm và có khá nhiều thông tin nên giữ làm một khu vực đầy đủ, tránh trùng lặp (`work-area-nav-v2` chuyển sang "Không làm hiện tại").
- Cập nhật `decisions.md` ("Nội dung chung"), `open-questions.md`, `backlog.md` (`ai-chat-panel`, `rendered-direct-edit-view`, `work-area-nav-v2`) và `current-state.md` theo đúng phạm vi đã dựng. Kiểm bằng `pnpm typecheck`, `pnpm lint` (chỉ còn cảnh báo CRLF có sẵn trong repo), `pnpm build`, `pnpm vitest run` (513/514 qua; 1 ca đo hiệu năng trong `rows.test.ts` chập chờn theo máy, không liên quan), và một lượt lái Electron thật (Playwright `_electron`) qua `window.mira` để tạo dữ liệu mẫu, xác nhận bằng mắt cả ba thay đổi trên.

## Đề xuất redesign workspace từ mockup — 2026-10-01

- Nhận 5 ảnh mockup mới (`focus-mode`, `mode-1-full-text`, `mode-2-sentence-smartcat-inspired`, `original-workspace`, `smartcat-reference`). Viết [đề xuất redesign workspace](../experience/editor-redesign.md) đối chiếu từng mockup với quyết định hiện hành: xác nhận giữ tên **Mira** (mockup dùng tên minh họa khác); nêu ba điểm lệch cần chốt (điều hướng cấp tác phẩm, Live Preview ở mode Chỉnh sửa trực tiếp, phạm vi panel AI Chat) và thêm vào [open-questions.md](../product/open-questions.md). Thêm sáu mục backlog mới (`ai-chat-panel`, `inline-ai-quick-actions`, `sentence-mode-toolbar`, `sentence-mode-side-panels`, `rendered-direct-edit-view`, `work-area-nav-v2`) ở trạng thái Backlog, chưa lên roadmap.

## Mode Từng câu — 2026-10-01

- Triển khai `sentence-mode`: tab “Từng câu” với các hàng theo segment bản gốc, trạng thái hàng suy ra từ liên kết, ghi một hàng vào văn bản dịch cùng liên kết trong một transaction, xác nhận hàng, nhảy hàng cần xử lý kế tiếp, ghép theo thứ tự cho bản dịch viết sẵn, chuyển mode không mất chữ. Thêm bốn kênh IPC cho liên kết, không đổi schema. Đo trong Electron thật, sửa hai chỗ chậm bậc hai ở kho liên kết do đo lộ ra. `sentence-mode` chuyển sang đã triển khai ở backlog; thêm `merge-split-rows`, `shared-undo-modes`.

## Màn editor hai pane — 2026-10-01

- Triển khai `translation-editor`: màn Toàn văn với bản gốc bên trái (khóa mặc định, mở khóa để sửa lỗi) và bản dịch bên phải (sửa trực tiếp, Reading view), lưu cả hai bên, chặn rời, nút tập trung. Ghi cách thể hiện "bản gốc chỉ đọc" vào quyết định hiện hành. Thêm vào backlog `sentence-mode`, `reading-view-markdown`, `sync-scroll`; `translation-editor` chuyển sang đã triển khai.

## Editor chương — 2026-10-01

- Triển khai `source-editor`: editor CodeMirror 6 cho bản gốc của chương, ánh xạ segment qua chỉnh sửa, một lịch sử hoàn tác gồm cả ID, lưu bằng `expectedRev` (xung đột không ghi đè), chặn rời khi chưa lưu. Đo trong Electron thật trên chương 5.000 segment; ghi số đo vào design và kiểm chứng. Sửa ADR-003: bỏ đường lùi `<textarea>` và ghi quy tắc chèn ở ranh giới segment mới. Thêm vào backlog `autosave`, `edited-segment-link-review`, `manual-segment-split-merge`, `translation-editor`.

## Nhập bản gốc một chương — 2026-10-01

- Triển khai `chapter-source-import`: màn chương, hộp thoại nhập (dán hoặc tệp, nhiều bảng mã, xem trước, thay bản gốc giữ bản dịch). Đo trong Electron thật và kiểm tra bàn phím; ghi số đo vào design của change. Ghi quy tắc chuẩn hóa vào hiện trạng, thêm bốn mục vào backlog (`chapter-title-from-text`, `import-whole-volume`, `segmentation-rules-editor`, `encoding-detect-cjk`).

## Hoàn thành M0 về dữ liệu — 2026-10-01

- Triển khai `content-backup-provider`: kho văn bản/segment/liên kết, sao lưu và khôi phục tác phẩm, provider dịch giả lập. Schema tệp tác phẩm lên v4 (cột `size` + index phủ) sau khi đo thấy danh sách chương chậm 409 ms với 5.000 chương có nội dung. Cập nhật hiện trạng, roadmap và backlog.

## Nghiên cứu bổ sung — 2026-10-01

- Gộp spec `work-chapters` vào `work-detail` (một spec cho màn chi tiết, có khung đầu trang + danh mục khu vực), thêm requirement minh họa tính năng chưa làm; chốt bốn câu hỏi mở của `work-detail-screen` (danh sách phẳng, số chương theo vị trí, cho xóa chương, mở chương đổi trạng thái).
- Thêm [backlog tính năng chưa triển khai](../delivery/backlog.md); “Nhập từ .txt” là mục đầu tiên ở trạng thái chỉ minh họa trên giao diện.

- So sánh màn chi tiết truyện và danh sách chương của Hako, OpenNovel, Reedsy Studio, GalTransl; ghi các suy luận cho `work-detail-screen` và câu hỏi cần kiểm chứng, chưa đổi quyết định hay spec.
- Thêm mockup sáng để thảo luận bố cục màn chi tiết; dữ liệu trong ảnh chỉ minh họa.
- Theo phản hồi về mockup, bổ sung hướng tab cấp tác phẩm và đổi thiết kế danh sách chương trong change `work-detail-screen` từ “Hiện thêm” sang phân trang 50/100.
- Đối chiếu nguồn chính chủ cho từng khu vực/tab dự kiến (chương, thuật ngữ, xưng hô, nguồn raw, tác vụ, văn phong); ghi rõ phần Mira tự thiết kế và giới hạn bằng chứng.
- Chốt điều hướng tác phẩm thành bốn khu vực Chương/Ngữ cảnh/Nguồn/Tác vụ, gộp Thuật ngữ/Xưng hô/Văn phong dưới Ngữ cảnh; lập change `work-area-navigation` và giữ M0 chỉ có Chương.

## 0.3 — 2026-09-29

- ADR-003: chốt bộ công nghệ lưu trữ và soạn thảo (`node:sqlite`, CodeMirror 6, SQL thuần, valibot, Vitest, IPC tự viết, một tệp `.mira` mỗi tác phẩm) kèm bằng chứng đo và điều kiện xem lại.
- Hoàn thành phần đầu M0: kho lưu trữ, IPC, thư viện thật (tác giả, thể loại/bối cảnh, ảnh bìa), test crash. Cập nhật hiện trạng và roadmap; phần còn lại của M0 tách thành hai change riêng.
- Sửa các mô tả hiện trạng không còn đúng (dữ liệu mẫu, khung hoạt động gần đây, màn preview design system).

## 0.2 — 2026-09-29

- ADR-002: AI dịch từ raw thành luồng chính của bản đầu; thêm nhiều nguồn raw, văn phong từ bản dịch cũ, ma trận xưng hô; chốt kiểu kết nối model (API key, OpenRouter, tương thích OpenAI; không OAuth thuê bao Claude/Antigravity). Tài khoản và đồng bộ để sau.
- Thêm nghiên cứu công cụ dịch AI (GalTransl, AiNiee, LinguaGacha, auto-novel, Sakura, OpenNovel), nhiều nguồn, văn phong và OpenRouter PKCE.
- Thêm nghiên cứu hệ sinh thái dịch truyện Việt/nhà cung cấp AI và khả thi kỹ thuật (liên kết qua chỉnh sửa, `node:sqlite`, căn chỉnh bậc thang, đo thử embedding).
- Viết lại roadmap theo quy trình đã chốt: giao diện sớm trên dữ liệu thật mỏng, provider giả lập, một chương xuyên suốt trước.
- Viết lại scope thành bảng ưu tiên S0–S3 kèm thứ tự spec; cập nhật decisions, open-questions, mapping MIR-09 và thêm MIR-13 đến MIR-15.
- Gỡ link tới `docs/assets` và preview design system đã xóa; ghi cách lấy lại từ lịch sử Git. Gỡ màn preview design system và panel công cụ phát triển khỏi app.

## 0.1 — 2026-09-29

- Đổi brand sang Mira theo yêu cầu người dùng; ghi ADR-001 và phạm vi đổi định danh ứng dụng.
- Tổ chức lại tám tài liệu chủ đề cũ vào handbook; giữ trang chuyển hướng và tài sản tham khảo.
- Khảo sát 11 sản phẩm/dự án nguồn đóng/thương mại và nguồn mở; ghi riêng giới hạn phân loại QuickTranslator.
- Thêm mapping MIR-01 đến MIR-12, roadmap theo điều kiện hoàn thành và kế hoạch kiểm chứng.
- Đối chiếu hiện trạng scaffold, sửa mô tả cũ về màn khởi động/thư viện.
- Áp dụng cấu trúc tài liệu sống dựa trên tham khảo Diátaxis, GitLab Handbook và ADR; thêm mẫu bổ sung.

Đây là phiên bản tài liệu trong working tree, chưa là Git tag hay release ứng dụng. Các nghiên cứu kế thừa giữ ngày nguồn ban đầu; kết quả benchmark/phỏng vấn chưa có.

Kiểm tra thay đổi ngày 2026-09-29: `pnpm typecheck`, `pnpm lint` và `pnpm build` thành công; kiểm tra đích liên kết Markdown nội bộ và `git diff --check` không phát hiện lỗi. Build cần chạy ngoài sandbox vì esbuild bị chặn tạo tiến trình con. Chưa chạy ứng dụng để nghiệm thu UI hoặc tạo/kiểm thử installer; các bài V01–V09 vẫn là kế hoạch.

---

[Mục lục handbook](../README.md)
