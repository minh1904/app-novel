# Nhật ký handbook

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
