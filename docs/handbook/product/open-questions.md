# Mira — quyết định còn mở

Cập nhật 2026-09-29; kế thừa quyết định ngày 2026-09-23. Trang này chỉ liệt kê điều cần quyết định, tránh để các câu hỏi cũ trong nhật ký bị hiểu là chưa được trả lời. Mục đã chốt nằm ở [decisions.md](decisions.md).

| Ưu tiên | Câu hỏi | Vì sao cần | Trạng thái |
| --- | --- | --- | --- |
| P0 | TXT và Markdown đã chốt; mức giữ cú pháp Markdown (tiêu đề, bảng, link, code...) và encoding khi import/export thế nào? | Cần tiêu chí không mất nội dung và định dạng. | Cần đặc tả + dữ liệu mẫu; không cần hỏi lại định dạng file. |
| P0 | Đề xuất căn chỉnh offline đã chốt; thuật toán, ngưỡng tin cậy và UX kiểm tra vùng mơ hồ nên thế nào? | Bảo vệ bản dịch thoát ý, gộp/tách và đảo đoạn. | Cần prototype với dữ liệu Anh/Trung/Nhật → Việt. |
| Kỹ thuật | Lưu nội bộ bằng một DB thư viện hay một package mỗi project? | App quản lý nội bộ đã chốt; cấu trúc vật lý cần spike backup/restore. | Chưa chốt. |
| Kỹ thuật | Electron đã dùng cho scaffold; CodeMirror/SQLite và chi phí runtime có phù hợp với editor P0 không? | Cần đo editor, bộ cài, RAM và triển khai offline trước khi khóa stack P0. | [Đề xuất stack](../engineering/architecture.md); Electron/React là scaffold hiện tại, phần còn lại chưa chốt. |
| UX | Khi mở app dùng theme theo Windows hay ghi nhớ lựa chọn gần nhất? | Cần cho setting và screenshot mặc định. | Chưa chốt. |
| Brand | Logo/wordmark, subtitle/tagline chính thức và khả dụng nhãn hiệu/domain/store cho Mira? | Tên sản phẩm đã chốt; nhận diện và phát hành công khai còn mở. | Chưa chốt. |
| Sản phẩm | Giấy phép của Mira, mô hình thu phí và kênh phân phối? | Khảo sát nguồn mở/đóng không tự quyết định mô hình kinh doanh. | Chưa chốt; cần nghiên cứu người dùng. |
| Nghiên cứu | Hai mode giảm công biên tập đủ để người dùng đổi công cụ không? | Cần quan sát thay vì chỉ so checklist chức năng. | [Kế hoạch kiểm chứng](../delivery/validation.md), chưa thực hiện. |
| Sau P0 | AI provider, online/local, quyền agent và UX duyệt diff; hỗ trợ Markdown docs/MDX nhiều file. | AI và docs là giai đoạn sau. | Chưa cần khóa cho bản đầu. |

**Đã trả lời:** AI không nằm trong bản đầu; app lưu nội bộ và cho xuất/backup; Source editor + Reading view riêng và đề xuất căn chỉnh offline ở P0; ba cặp ngôn ngữ Anh/Trung giản thể/phồn thể/Nhật → Việt; nhập/xuất TXT/MD; sửa lỗi bản gốc bằng thao tác riêng có lịch sử/hoàn tác; tên là Mira; Tailwind CSS v4 + Base UI cho component tương tác dùng chung. Không hỏi lại trừ khi người dùng đổi ý.

---

[Mục lục handbook](../README.md)
