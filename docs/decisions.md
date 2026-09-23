# Miyati — quyết định hiện hành

Cập nhật 2026-09-23. Đây là **nguồn quyết định chính** để lập roadmap. “Đã chốt” chỉ gồm điều người dùng đã xác nhận trong trao đổi; các đề xuất kỹ thuật và mockup không tự trở thành yêu cầu. Khi thay đổi quyết định, cập nhật tài liệu này và lý do ngay tại chủ đề liên quan.

| Chủ đề | Đã chốt | Giới hạn của quyết định |
| --- | --- | --- |
| Tên | **Miyati** là tên sản phẩm. | Logo, wordmark và tagline chính thức chưa chốt. “Translation workspace” hiện chỉ là dòng mô tả chức năng. |
| Nền tảng đầu | **Ứng dụng desktop cho Windows**, phần đọc/sửa/lưu cốt lõi dùng được **offline**. | Electron/Tauri, packaging và cập nhật chưa chốt. |
| Người dùng đầu | Dịch giả cá nhân làm việc với **truyện dài, nhiều chương**; cặp ngôn ngữ P0 là **Anh → Việt, Trung (giản thể và phồn thể) → Việt, Nhật → Việt**. | Có đường mở rộng sang dịch tài liệu/docs về sau; hỗ trợ docs đầy đủ chưa thuộc bản đầu. |
| Hai mode | **Toàn văn** là hai văn bản dài gốc/dịch, có thể lệch số dòng; **Từng câu** là editor theo hàng segment kiểu Smartcat. Bản gốc chỉ đọc trong luồng dịch thường; P0 có thao tác riêng để **sửa lỗi bản gốc**, có lịch sử/hoàn tác. | Chi tiết thuật toán căn chỉnh và trạng thái hàng cần prototype. |
| Nội dung chung | Hai mode đọc/sửa **cùng nội dung**. Có thể viết hoặc nhập bản dịch toàn văn trước; P0 **đề xuất căn chỉnh offline** rồi cho người dùng kiểm tra vùng không chắc. Mode Toàn văn P0 có **Source editor + Reading view riêng**, chưa cần Live Preview inline. | Không hứa tự khôi phục liên kết chính xác sau khi viết lại/đảo cả chương. Thuật toán và ngưỡng tin cậy cần prototype. |
| Bố cục | Toàn văn **không có số nối, đường nối hoặc ép cân hàng** hai bên. Có chế độ tập trung ẩn điều hướng để mở rộng editor; khi AI xuất hiện sau P0, panel đó cũng có thể ẩn. | Mode Từng câu vẫn dùng hàng để đối chiếu; đó không phải đường nối trong toàn văn. |
| Bản đầu | Ưu tiên **editor hai mode và lưu offline**. **AI dịch/viết lại ở giai đoạn sau**. | Thiết kế có thể chừa chỗ cho AI, nhưng AI không là điều kiện dùng editor P0. |
| Lưu trữ | **App quản lý dữ liệu nội bộ**, có **xuất và backup** cho người dùng. P0 nhập/xuất văn bản **TXT và Markdown**. | SQLite hay backend khác, DB chung hay mỗi project, định dạng backup và thư mục mặc định chưa chốt. Cú pháp Markdown hỗ trợ chi tiết cần đặc tả. |
| Design system | Google Sans Flex; light/dark theo [palette Solar Docs](assets/solar-v2-docs-theme.css); radius control 10px, tab 11px, panel/editor 14px; Solar Icons; anatomy Button/Panel/Slider tham chiếu point-cloud; workspace lấy tinh thần Obsidian + Codex. **Tailwind CSS v4** cho token/style và **Base UI** cho component tương tác dùng chung. | [Design system chi tiết](design-system-v1.md). Mockup cũ là tham khảo cấu trúc, không là chuẩn màu/logo. TextField đơn giản có thể dùng native; editor văn bản cần lớp riêng. |
| Repo | Prototype và roadmap cũ đã được bỏ khỏi cây làm việc để lên kế hoạch mới. | Lịch sử Git vẫn giữ làm tài liệu tham khảo. |

## Nguyên tắc đi cùng quyết định

- Bản gốc và bản dịch có thể gộp/tách, thêm/bớt câu; không ép quan hệ 1:1 hoặc dựa vào dòng hiển thị trên màn hình.
- Nội dung bản dịch toàn văn vẫn hợp lệ khi chưa căn chỉnh xong. Chuyển mode không được làm mất hoặc tự viết lại văn bản.
- **Đề xuất cho AI giai đoạn sau:** thay đổi nên có diff để xem và áp dụng/hoàn tác; phạm vi quyền của agent chưa được chốt.
- “Miyati” không gắn riêng với novel để hỗ trợ định vị docs sau này. Trong bản đầu, UI có thể dùng từ “tác phẩm/chương” cho project truyện; mô hình dữ liệu nên đủ rộng cho project/document.

Các vấn đề chưa chốt và thứ tự cần hỏi nằm ở [open-questions.md](open-questions.md). [Scope v0.1](product-scope-v0.md), [first-run flow](first-run-flow.md), [alignment flow](alignment-flow.md) và [tech stack](tech-stack-proposal.md) là **đề xuất**, không phải toàn bộ đã được duyệt.
