# Mira Handbook

Phiên bản **0.1**, cập nhật **2026-10-03** ([ADR-005](decisions/0005-ai-first-proposals-no-sentence-mode.md)). Tài liệu sống trong Git để xây sản phẩm; chưa phải hướng dẫn sử dụng ứng dụng hoàn thiện.

Mira giúp dịch giả giữ mạch văn khi dịch cả chương và **làm việc cùng AI ngay trong editor**: AI đề xuất, người duyệt từng chỗ tại chỗ. Mục tiêu bản đầu là vòng **nhập raw → AI dịch theo đoạn → duyệt đề xuất và sửa cùng AI → lưu/mở lại → xuất/backup/restore** trên Windows; mọi thứ trừ bước gọi AI chạy offline ([ADR-002](decisions/0002-ai-first-translation.md), [ADR-005](decisions/0005-ai-first-proposals-no-sentence-mode.md)). [Hiện trạng code](engineering/current-state.md) là **bản MVP để thử nghiệm**; từ nay làm lại hoàn chỉnh từng module theo [kiến trúc AI-first](engineering/ai-first-architecture.md) và [lộ trình](delivery/roadmap.md).

## Đường đọc

- **Chủ sản phẩm:** định hướng → thị trường → mapping → scope → roadmap → câu hỏi mở.
- **Thiết kế:** quyết định → luồng đầu tiên → design system → kiểm chứng.
- **Lập trình:** quyết định (ADR-005) → kiến trúc AI-first → hiện trạng → kiến trúc kỹ thuật → scope → lộ trình và nghiệm thu.
- **Người tiếp quản/agent:** đọc quyết định và hiện trạng trước; cập nhật chương chịu trách nhiệm cho nội dung thay đổi.

## Mục lục

| Phần | Chương | Vai trò / trạng thái |
| --- | --- | --- |
| Sản phẩm | [Định hướng và người dùng](product/vision.md) | Ràng buộc đã chốt + giả thuyết giá trị |
| Sản phẩm | [Quyết định hiện hành](product/decisions.md) | Nguồn chính của quyết định đã chốt |
| Sản phẩm | [Brand Mira](product/brand.md) | Tên và mẫu linh vật đã chốt; bộ ảnh riêng đã có, chưa tích hợp |
| Sản phẩm | [Scope bản đầu](product/scope.md) | Bảng ưu tiên S0–S3 (v0.3, theo ADR-005), ánh xạ sang module |
| Sản phẩm | [Câu hỏi còn mở](product/open-questions.md) | Những điều chưa khóa |
| Nghiên cứu | [Thị trường nguồn đóng và nguồn mở](research/market-landscape.md) | Tài liệu công khai, chưa benchmark |
| Nghiên cứu | [Mapping chức năng → Mira](research/feature-map.md) | Ưu tiên, mã yêu cầu và kiểm chứng |
| Nghiên cứu | [Editor segment](research/segment-editors.md) | Nghiên cứu UX kế thừa 2026-09-23; **bối cảnh, không còn là hướng của Mira** (ADR-005 bỏ mode Từng câu) |
| Nghiên cứu | [Hệ sinh thái dịch truyện Việt và nhà cung cấp AI](research/vietnam-ecosystem.md) | Quan sát 2026-09-29, chưa phỏng vấn |
| Nghiên cứu | [Khả thi kỹ thuật: dữ liệu, lưu trữ, căn chỉnh](research/technical-feasibility.md) | Đọc tài liệu + chạy thử một phần; phần căn chỉnh và segment là mô hình MVP sẽ gỡ |
| Nghiên cứu | [Công cụ dịch AI, nhiều nguồn, văn phong](research/ai-translation-tools.md) | Đọc README/mã, chưa chạy thử |
| Nghiên cứu | [Chế độ AI, nhà cung cấp, CLI proxy, model local](research/ai-provider-integration.md) | Quan sát 2026-10-02 + đề xuất adapter; chưa gọi provider thật |
| Nghiên cứu | [Hai hướng provider: gateway và khóa Google](research/provider-gemini-gateway.md) | Tài liệu Gemini + mã CLIProxyAPI, 2026-10-02; chưa gọi thật, chưa dựng gateway |
| Nghiên cứu | [Ngữ cảnh truyện: so sánh và đề xuất](research/story-context.md) | Quan sát 2026-10-02: công cụ dịch, CAT, công cụ viết AI + 2 bài nghiên cứu; sáu lớp ngữ cảnh và ba tầng prompt, đề xuất chưa chốt |
| Nghiên cứu | [Hệ thống ngữ cảnh, đợt 2](research/context-system.md) | Quan sát 2026-10-03: bộ đệm prompt của provider Mira dùng, chọn lọc so với ngữ cảnh dài, ai nói với ai, văn phong từ đề xuất đã duyệt, hàng chờ trích, đánh dấu xem lại; đề xuất K1–K9 chưa chốt; chưa gọi provider thật |
| Nghiên cứu | [Màn chi tiết truyện và danh sách chương](research/work-detail-screen.md) | So sánh sản phẩm; cấu trúc bốn khu vực đã chốt, chi tiết khác còn đề xuất |
| Nghiên cứu | [Tính năng Markdown của Obsidian](research/obsidian-markdown-features.md) | Bảng kiểm đối chiếu với Mira, đã tick cái nào xong |
| Nghiên cứu | [Panel Hỏi AI chạy thật: phương thức](research/ai-chat-panel.md) | Đọc code + tài liệu Gemini/Electron 2026-10-02; quyết định đã chốt và **đã triển khai** (change `ai-chat`), chưa gọi provider thật |
| Nghiên cứu | [Kiến trúc các app Electron mã nguồn mở](research/electron-architecture.md) | Quan sát 2026-10-03: cây thư mục của 11 sản phẩm qua GitHub API (chưa chạy thử), bảy khuôn và khuôn nào Mira học |
| Nghiên cứu | [Lõi AI: kiến trúc provider và cách sản phẩm khác dựng](research/ai-core-architecture.md) | Quan sát 2026-10-03: mã Mira + 20 sản phẩm (agent lập trình, app desktop, công cụ dịch, SDK/gateway); đề xuất bốn lớp, chưa chốt; chưa gọi provider thật |
| Nghiên cứu | [Chia lô dịch truyện và giữ mạch giữa các lô](research/chunking-translation.md) | Quan sát 2026-10-03: mã LinguaGacha (đọc lại phần planner) + hơn 10 công cụ khác + 9 bài báo; đề xuất C1–C8 cho bước chia lô, chưa chốt; chưa chạy thử, chưa có fixture |
| Nghiên cứu | [Chất lượng dịch: đo, prompt, lượt soát lại, chọn model](research/translation-quality.md) | Quan sát 2026-10-03: cách đo chất lượng →Việt (kiểm tất định, giám khảo LLM so cặp, người chấm), prompt và tham số, quy ước tiếng Việt, refine, giá model; đề xuất E/G/R chưa chốt; chưa chạy model nào |
| Nghiên cứu | [Sổ nguồn](research/sources.md) | URL, ngày đọc, giới hạn bằng chứng |
| Trải nghiệm | [Luồng đầu tiên](experience/first-run.md) | Đề xuất + mockup |
| Trải nghiệm | [Toàn văn và căn chỉnh](experience/alignment.md) | **Superseded phần lớn bởi ADR-005** (căn chỉnh và liên kết bị hủy); giữ làm hồ sơ |
| Trải nghiệm | [Redesign workspace dịch](experience/editor-redesign.md) | Đề xuất, đối chiếu quyết định hiện hành, chưa chốt; ảnh mockup đã xóa, nội dung từng ảnh ghi lại trong trang |
| Trải nghiệm | [Wireframe các màn còn lại](experience/wireframes/README.md) | Ba phương án mỗi màn, chờ chọn |
| Trải nghiệm | [Màn cài đặt kết nối AI](experience/ai-connection-settings.md) | Audit + brief + quy ước app cùng loại + 7 wireframe; **đã chốt phương án F**, vào bằng nút bánh răng góc trên phải |
| Trải nghiệm | [Design system](experience/design-system.md) | Baseline đã chốt + scaffold |
| Kỹ thuật | [Hiện trạng repo](engineering/current-state.md) | Bản MVP thử nghiệm, ghi số phận từng phần theo module; viết lại 2026-10-03 |
| Kỹ thuật | [Kiến trúc kỹ thuật và luật ranh giới](engineering/architecture.md) | Stack đã chốt (ADR-003); mục "Cấu trúc mã nguồn và luật ranh giới" đã triển khai 2026-10-03 và lint ép |
| Kỹ thuật | [Luồng làm việc và kiến trúc AI-first](engineering/ai-first-architecture.md) | **Hướng đã chốt (ADR-005, 2026-10-03):** bỏ Từng câu, đơn vị là đoạn, AI chỉ đề xuất, tác vụ dịch chạy trong main; học từ Obsidian, Notion, Logseq. Thiết kế từng module còn là đề xuất; Q4–Q7 còn mở |
| Phát triển | [Lộ trình theo module](delivery/roadmap.md) | **Đổi 2026-10-03:** chất lượng dịch trước (Bộ đo → Lõi dịch → Thuật ngữ → Xưng hô), rồi Đề xuất, Xuất, Tác vụ, Gỡ Từng câu, QA; hướng đã chốt, chia module còn là đề xuất; không cam kết lịch |
| Phát triển | [Backlog tính năng chưa triển khai](delivery/backlog.md) | Mục “Sắp có” trên giao diện và điều kiện làm thật |
| Phát triển | [Kế hoạch kiểm chứng](delivery/validation.md) | Người dùng, dữ liệu, nghiệm thu |
| Duy trì | [Cách xây và cập nhật handbook](maintenance/handbook-guide.md) | Quy ước làm việc đề xuất |
| Duy trì | [Mẫu research / spec / ADR / kiểm chứng](maintenance/templates.md) | Dùng cho các chương bổ sung |
| Duy trì | [Nhật ký handbook](maintenance/changelog.md) | Các thay đổi có ý nghĩa |
| Quyết định | [ADR-001: đổi tên Mira](decisions/0001-mira-brand.md) | Accepted — yêu cầu người dùng |
| Quyết định | [ADR-002: AI dịch từ raw là luồng chính](decisions/0002-ai-first-translation.md) | Accepted — thay “AI sau P0”; **một phần bị ADR-005 thay** (hai mode, segment ID) |
| Quyết định | [ADR-003: bộ công nghệ lưu trữ và soạn thảo](decisions/0003-technology-stack.md) | Accepted — có chạy thử |
| Quyết định | [ADR-004: tầng kết nối AI và scope lát cắt đầu](decisions/0004-ai-provider-layer.md) | Accepted — chủ sản phẩm uỷ quyền chốt 2026-10-02 |
| Quyết định | [ADR-005: bỏ mode Từng câu, đơn vị là đoạn, AI chỉ đề xuất](decisions/0005-ai-first-proposals-no-sentence-mode.md) | Accepted — chủ sản phẩm chốt 2026-10-03; repo hiện tại là MVP, làm lại theo module |

## Cách hiểu nội dung

**Đã chốt** là điều người dùng xác nhận. **Đề xuất** là phương án cần đánh giá. **Quan sát** có nguồn. **Giả thuyết** cần kiểm chứng. **Đã triển khai** phải có bằng chứng code; không suy ra từ mockup, roadmap hoặc tên nút. Một trang có thể có nhiều trạng thái, từng phần phải ghi rõ.

Khi có mâu thuẫn: chỉ đạo mới nhất của người dùng → quyết định hiện hành → đặc tả chủ đề. Code phản ánh thứ đã làm, không tự chứng minh yêu cầu đã chốt. [Cách duy trì](maintenance/handbook-guide.md) mô tả quy trình cập nhật.
