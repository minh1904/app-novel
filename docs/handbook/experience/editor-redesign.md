# Đề xuất redesign: workspace dịch theo mockup NekoNovel/SmartCat

**Cập nhật kết quả (2026-10-02):** Ba câu hỏi mở bên dưới đã có hướng xử lý qua trao đổi tiếp theo và đã dựng thật — xem [decisions.md](../product/decisions.md) và [backlog.md](../delivery/backlog.md) (`ai-chat-panel`, `rendered-direct-edit-view`, `work-area-nav-v2`). Tóm tắt: giữ nguyên bốn khu vực cấp tác phẩm Chương/Ngữ cảnh/Nguồn/Tác vụ (không đổi tên/gộp lại theo mockup); màn chương thêm một hàng nhãn **Thuật ngữ · Xưng hô · Văn phong** cạnh mode Toàn văn/Từng câu — mỗi nhãn mang badge "Sắp có", không bấm được, chỉ cho thấy trước nội dung của khu vực Ngữ cảnh ở cấp tác phẩm (không phải một điều hướng mới, không trùng hay thay thế tab Ngữ cảnh đã có); pane bản dịch có Live Preview nhẹ (chỉ `#`, `**đậm**`, bằng mark decoration để không phá IME); panel "Hỏi AI" dựng làm cột thứ ba cạnh hai pane (không che nội dung), mở bằng nút hoặc Ctrl+K, nội dung vẫn là dữ liệu mẫu. Phần mô tả gốc dưới đây giữ nguyên làm hồ sơ quá trình.

**Dựng chrome theo phương án D (2026-10-02):** người dùng chốt bố cục **D · B gọn chữ** của wireframe. Màn chương đổi từ khối tiêu đề nhiều dòng sang **hai thanh cố định** — thanh chương 42px (tên chương 12.5px, số liệu ở màu chữ phụ, nút dồn phải) và thanh mode 36px (tab `size="sm"` cùng hàng với nhãn Ngữ cảnh). Hai pane thành khối có viền `rounded-panel bg-sidebar p-3`, tên pane + số liệu + trạng thái lưu gộp một hàng, CodeMirror bỏ viền riêng. "Thay bản gốc" và "Về tác phẩm" chuyển vào menu tràn; header AppShell và đầu sidebar thu 52px → 44px cho khớp nhịp. **Một thay đổi so với đoạn dưới:** ba nhãn Thuật ngữ/Xưng hô/Văn phong dùng **một** badge "Sắp có" chung cho cả nhóm thay vì mỗi nhãn một badge, vì cả hàng phải nằm gọn trong 36px.

Cập nhật: 2026-10-01. Đây là **phương án UX để thảo luận**, chưa phải đặc tả đã duyệt. Năm ảnh mockup do người dùng gửi minh họa giao diện và luồng thao tác; tên sản phẩm, nhãn nút, số liệu và bố cục chi tiết trong ảnh **không tự trở thành yêu cầu** (nguyên tắc ở [decisions.md](../product/decisions.md)). Mục này đối chiếu từng mockup với quyết định hiện hành, nêu phần khớp, phần lệch cần chốt, và phần hoàn toàn mới chưa có ở [scope](../product/scope.md)/[backlog](../delivery/backlog.md).

## Ảnh tham khảo

**Năm tệp ảnh đã xóa khỏi repo ngày 2026-10-02** theo yêu cầu chủ sản phẩm (6,8 MB cho thứ chỉ dùng một lần ở bước đối chiếu, và mọi điều cần giữ đã nằm trong bảng dưới cùng bảng "Đối chiếu"). Bảng này giữ lại **nội dung từng mockup** vì đó là hồ sơ quá trình; cột đầu là tên gọi, không còn là đường dẫn tệp.

| Mockup | Nội dung |
| --- | --- |
| Chế độ tập trung | Chế độ tập trung của mode Toàn văn (Song song): thanh trên cùng rút gọn, hai pane gốc/dịch, menu nổi khi bôi chọn một câu (Dịch lại · Viết tự nhiên hơn · Tra từ · Ghi chú). |
| Toàn văn, workspace đầy đủ | Workspace đầy đủ ở mode Toàn văn: thanh bên trái (Dự án, Chương, Nhân vật, Từ điển), giữa là hai pane gốc/dịch kiểu Toàn văn/Từng câu, phải là panel **AI Chat** thường trực theo ngữ cảnh đoạn đang xem. |
| Từng câu, kiểu SmartCat | Mode Từng câu dạng bảng: thanh công cụ tìm trong gốc/tìm trong dịch, lọc trạng thái, lọc người dịch, Gộp, Tách, Kiểm tra liên kết; dưới bảng có tab Gợi ý/Thuật ngữ/Lịch sử/QA; AI Chat bên phải trả lời câu hỏi về một thuật ngữ cụ thể. |
| Chỉnh sửa trực tiếp | Mode "Chỉnh sửa trực tiếp": bản dịch hiển thị **có định dạng** (tiêu đề lớn, không phải đoạn thuần) thay vì văn bản thô; AI Chat đề xuất viết lại cả đoạn kèm bảng so sánh lý do từng chỗ đổi. |
| Ảnh tham chiếu SmartCat | Ảnh chụp **sản phẩm SmartCat thật**, không phải mockup của Mira — chỉ dùng để đối chiếu nguồn cảm hứng cho thanh công cụ và bảng hàng của mode Từng câu. |

## Đối chiếu với quyết định hiện hành

| Yếu tố trong mockup | Quyết định/triển khai hiện tại | Trạng thái |
| --- | --- | --- |
| Tên "NekoNovel Studio", logo mèo | Tên sản phẩm đã chốt là **Mira** ([ADR-001](../decisions/0001-mira-brand.md)) | **Giữ nguyên Mira** — xác nhận ngày 2026-10-01: ảnh chỉ minh họa giao diện, không đổi tên. |
| Hai pane Song song + Chế độ tập trung | Đã triển khai ở `translation-editor` (pane gốc khóa mặc định, nút tập trung ẩn thanh bên) | Khớp hướng đã chốt; phần mới là **menu nổi AI khi bôi chọn** (xem bên dưới). |
| Mode Từng câu dạng bảng, trạng thái hàng | Đã triển khai ở `sentence-mode` (hàng theo segment, 4 trạng thái, nhảy hàng kế) | Khớp hướng đã chốt; phần mới là **thanh công cụ và panel phụ** (xem bên dưới). |
| Thanh điều hướng trên cùng: Dịch thuật · Nhân vật · Từ điển · Thế giới quan · Benchmark | Đã chốt ngày 2026-10-01: bốn khu vực cấp tác phẩm **Chương · Ngữ cảnh (Thuật ngữ·Xưng hô·Văn phong) · Nguồn · Tác vụ** ([work-area-navigation](../../../openspec/changes/work-area-navigation/proposal.md)) | **Lệch, cần chốt lại** — xem câu hỏi mở #1. |
| Mode "Chỉnh sửa trực tiếp" render có định dạng (tiêu đề to) | Quyết định hiện hành: "Source editor + Reading view riêng, **chưa cần Live Preview inline**" | **Lệch, cần chốt lại** — xem câu hỏi mở #2. |
| Panel AI Chat thường trực, có ngữ cảnh đoạn, áp dụng/chèn/sao chép | Chưa có ở bất kỳ spec nào; decisions.md chỉ ghi "khi AI xuất hiện sau P0, panel đó cũng có thể ẩn" — dự liệu trước chứ chưa đặc tả | **Mới, cần chốt phạm vi** — xem câu hỏi mở #3. |

## Tính năng mới xuất hiện trong mockup, chưa có ở backlog

Các mục dưới đây đã được thêm vào [backlog](../delivery/backlog.md) ở trạng thái **Backlog** (chưa có gì trên giao diện), chờ quyết định trước khi viết spec:

1. **Panel AI Chat** (`ai-chat-panel`) — hội thoại với AI theo ngữ cảnh đoạn/chương đang mở, có thể "Áp dụng", "Chèn vào bản dịch", "Sao chép". Khác với job dịch AI theo lô (S1.3): đây là trợ lý tương tác theo câu hỏi tự do của người dùng.
2. **Menu nổi AI khi bôi chọn văn bản** (`inline-ai-quick-actions`) — xuất hiện trong Chế độ tập trung khi chọn một câu/đoạn: Dịch lại, Viết tự nhiên hơn, Tra từ, Ghi chú.
3. **Thanh công cụ mode Từng câu kiểu SmartCat** (`sentence-mode-toolbar`) — tìm trong bản gốc/bản dịch riêng biệt, lọc theo trạng thái, lọc theo người dịch (người/AI), nút Kiểm tra liên kết. Vượt xa `sentence-mode` đã triển khai (hiện chưa có tìm kiếm hay bộ lọc).
4. **Panel phụ dưới bảng Từng câu** (`sentence-mode-side-panels`) — tab Gợi ý (câu tương tự từ bản dịch cũ, có % khớp), Thuật ngữ, Lịch sử sửa, QA cho đúng hàng đang chọn.
5. **Mở lại câu hỏi Live Preview** (`rendered-direct-edit-view`) — mockup "Chỉnh sửa trực tiếp" cho thấy bản dịch hiển thị có định dạng (tiêu đề, có thể cả in đậm/nghiêng) thay vì đoạn thuần; đây là đúng thứ quyết định hiện hành ghi "chưa cần" cho P0 — ghi lại làm input, không tự bật.
6. **Điều hướng theo Nhân vật/Từ điển/Thế giới quan/Benchmark** (`work-area-nav-v2`) — nếu được chốt, đổi hướng của `work-area-navigation` (bốn khu vực Chương/Ngữ cảnh/Nguồn/Tác vụ) sang cấu trúc khác; cần làm rõ quan hệ với "Ngữ cảnh" đã gộp Thuật ngữ/Xưng hô/Văn phong.

## Câu hỏi mở mới (đã thêm vào [open-questions.md](../product/open-questions.md))

1. Thanh điều hướng cấp tác phẩm nên theo bốn khu vực đã chốt (Chương/Ngữ cảnh/Nguồn/Tác vụ) hay đổi sang nhóm theo mockup (Dịch thuật/Nhân vật/Từ điển/Thế giới quan/Benchmark)? Nếu đổi, "Nhân vật" và "Thế giới quan" là khu vực mới hoàn toàn (chưa có trong S0–S3) hay là cách gọi khác của nội dung Ngữ cảnh?
2. Mode "Chỉnh sửa trực tiếp" có định dạng (gần Live Preview) có nên đưa vào P0 thay vì Source editor + Reading view thuần, hay giữ nguyên quyết định "chưa cần Live Preview inline" và coi mockup là hướng sau bản đầu?
3. Phạm vi panel AI Chat: đây có phải một job dịch/viết lại chạy qua cùng provider đã chốt (API key/OpenRouter/endpoint tương thích OpenAI), hay là tính năng riêng cần UX/chi phí/giới hạn riêng? Có bắt buộc có mạng, và ẩn được như phần "Bố cục" đã dự liệu không?

## Việc cần làm trước khi lên roadmap

- Người dùng (chủ sản phẩm) chốt ba câu hỏi ở trên; cho tới khi đó các mục trong bảng "Tính năng mới" ở trạng thái Backlog, không lên S0–S3.
- Nếu chốt đổi điều hướng cấp tác phẩm, viết lại `work-area-navigation` trước khi đụng tới `work-detail-screen` đã triển khai, tránh đổi hai lần.
- Nếu chốt mở Live Preview, đây là đổi quyết định "Hai mode"/"Nội dung chung" trong decisions.md — cần ghi theo đúng quy ước "đã chốt" chứ không chỉ sửa UI.
- Thanh công cụ và panel phụ của mode Từng câu không chặn việc dùng `sentence-mode` hiện tại; có thể làm thành lát cắt kế tiếp độc lập với các câu hỏi về điều hướng/Live Preview.

---

[Mục lục handbook](../README.md)
