# Mira — quyết định hiện hành

Cập nhật 2026-09-29 (bổ sung [ADR-002](../decisions/0002-ai-first-translation.md)); kế thừa quyết định ngày 2026-09-23. Đây là **nguồn quyết định chính** để lập roadmap. “Đã chốt” chỉ gồm điều người dùng đã xác nhận trong trao đổi; các đề xuất kỹ thuật và mockup không tự trở thành yêu cầu. Khi thay đổi quyết định, cập nhật tài liệu này và lý do ngay tại chủ đề liên quan.

| Chủ đề | Đã chốt | Giới hạn của quyết định |
| --- | --- | --- |
| Tên | **Mira** là tên sản phẩm, đổi theo yêu cầu ngày 2026-09-29; xem [ADR-001](../decisions/0001-mira-brand.md). | Logo, wordmark và tagline chính thức chưa chốt. “Translation workspace” hiện chỉ là dòng mô tả chức năng. |
| Nền tảng đầu | **Ứng dụng desktop cho Windows**, phần đọc/sửa/lưu cốt lõi dùng được **offline**. | Electron đã được yêu cầu cho scaffold; stack editor/storage và quy trình phát hành vẫn cần kiểm chứng. |
| Người dùng đầu | Dịch giả cá nhân làm việc với **truyện dài, nhiều chương**; cặp ngôn ngữ P0 là **Anh → Việt, Trung (giản thể và phồn thể) → Việt, Nhật → Việt**. Ưu tiên người **dịch toàn bộ bằng AI từ raw** rồi soát/sửa, kế đến người tự dịch từ raw có AI hỗ trợ. Một truyện có thể có **nhiều nguồn raw**; người dùng chọn nguồn chính. | Có đường mở rộng sang dịch tài liệu/docs về sau; hỗ trợ docs đầy đủ chưa thuộc bản đầu. |
| Hai mode | **Toàn văn** là hai văn bản dài gốc/dịch, có thể lệch số dòng; **Từng câu** là editor theo hàng segment kiểu Smartcat. Bản gốc chỉ đọc trong luồng dịch thường; P0 có thao tác riêng để **sửa lỗi bản gốc**, có lịch sử/hoàn tác. | Chi tiết thuật toán căn chỉnh và trạng thái hàng cần prototype. |
| Nội dung chung | Hai mode đọc/sửa **cùng nội dung**. Có thể viết hoặc nhập bản dịch toàn văn trước; P0 **đề xuất căn chỉnh offline** rồi cho người dùng kiểm tra vùng không chắc. Mode Toàn văn P0 có **Source editor + Reading view riêng**, chưa cần Live Preview inline. | Không hứa tự khôi phục liên kết chính xác sau khi viết lại/đảo cả chương. Thuật toán và ngưỡng tin cậy cần prototype. |
| Bố cục | Toàn văn **không có số nối, đường nối hoặc ép cân hàng** hai bên. Có chế độ tập trung ẩn điều hướng để mở rộng editor; khi AI xuất hiện sau P0, panel đó cũng có thể ẩn. | Mode Từng câu vẫn dùng hàng để đối chiếu; đó không phải đường nối trong toàn văn. |
| Bản đầu | **AI dịch từ raw là luồng chính**: nhập raw → chia segment → AI dịch theo segment → soát/sửa ở hai mode → QA → xuất. Tài nguyên ngữ cảnh gồm glossary, **ma trận xưng hô** (cập nhật song song, màn xem ưu tiên trước) và **văn phong từ bản dịch cũ**. Thay quyết định “AI sau P0” ngày 2026-09-23; xem [ADR-002](../decisions/0002-ai-first-translation.md). | Editor, lưu, lịch sử, nhập/xuất vẫn chạy khi không có mạng; chỉ bước gọi AI cần mạng trừ model local. AI không âm thầm ghi đè văn bản người dùng đã sửa. |
| Kết nối AI | **API key** (Anthropic, Gemini, OpenAI, DeepSeek…), **OpenRouter** và **endpoint tương thích OpenAI** (Ollama/LM Studio). **Không** dùng OAuth thuê bao Claude Pro/Max hay Antigravity/Gemini CLI vì nhà cung cấp cấm. | Provider mặc định, giới hạn chi phí và cách lưu khóa cần spec riêng. Đọc lại điều khoản khi thêm kiểu kết nối. |
| Tài khoản và đồng bộ | **Để sau**; ưu tiên phát triển offline. | Không thiết kế UI hoặc schema buộc có tài khoản. |
| Lưu trữ | **App quản lý dữ liệu nội bộ**, có **xuất và backup** cho người dùng. P0 nhập/xuất văn bản **TXT và Markdown**. | SQLite hay backend khác, DB chung hay mỗi project, định dạng backup và thư mục mặc định chưa chốt. Cú pháp Markdown hỗ trợ chi tiết cần đặc tả. |
| Design system | Google Sans Flex; light/dark theo palette Solar Docs (nay ở [tokens.css](../../../src/renderer/src/styles/tokens.css)); radius control 10px, tab 11px, panel/editor 14px; Solar Icons; anatomy Button/Panel/Slider tham chiếu point-cloud; workspace lấy tinh thần Obsidian + Codex. **Tailwind CSS v4** cho token/style và **Base UI** cho component tương tác dùng chung. | [Design system chi tiết](../experience/design-system.md). Mockup cũ là tham khảo cấu trúc, không là chuẩn màu/logo. TextField đơn giản có thể dùng native; editor văn bản cần lớp riêng. |
| Repo | Prototype cũ giữ trong lịch sử; hiện có scaffold Electron/React và thư viện dữ liệu mẫu. | [Hiện trạng](../engineering/current-state.md) phân biệt UI mẫu với tính năng hoàn chỉnh. |

## Nguyên tắc đi cùng quyết định

- Bản gốc và bản dịch có thể gộp/tách, thêm/bớt câu; không ép quan hệ 1:1 hoặc dựa vào dòng hiển thị trên màn hình.
- Nội dung bản dịch toàn văn vẫn hợp lệ khi chưa căn chỉnh xong. Chuyển mode không được làm mất hoặc tự viết lại văn bản.
- Bản dịch do AI tạo ghi nguồn gốc (provider, model, thời điểm) theo segment. Khi AI dịch lại vùng người dùng đã sửa, hiển thị so sánh để chọn; không ghi đè âm thầm. Quyền của agent ngoài dịch/viết lại chưa được chốt.
- “Mira” không gắn riêng với novel để hỗ trợ định vị docs sau này. Trong bản đầu, UI có thể dùng từ “tác phẩm/chương” cho project truyện; mô hình dữ liệu nên đủ rộng cho project/document.

Các vấn đề chưa chốt và thứ tự cần hỏi nằm ở [open-questions.md](open-questions.md). [Scope v0.1](scope.md), [first-run flow](../experience/first-run.md), [alignment flow](../experience/alignment.md) và [tech stack](../engineering/architecture.md) là **đề xuất**, không phải toàn bộ đã được duyệt.

## Tổ chức tài liệu hiện hành

Ngày 2026-09-29 người dùng yêu cầu nghiên cứu thị trường và tổ chức lại docs thành handbook để phát triển dần. [Mục lục](../README.md) là điểm vào; [thị trường](../research/market-landscape.md) và [mapping](../research/feature-map.md) là nghiên cứu/đề xuất, không tự thay đổi scope đã chốt.

---

[Mục lục handbook](../README.md)
