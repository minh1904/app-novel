# Mira — quyết định còn mở

Cập nhật 2026-09-29 sau [ADR-002](../decisions/0002-ai-first-translation.md); kế thừa quyết định ngày 2026-09-23. Trang này chỉ liệt kê điều cần quyết định, tránh để các câu hỏi cũ trong nhật ký bị hiểu là chưa được trả lời. Mục đã chốt nằm ở [decisions.md](decisions.md).

| Ưu tiên | Câu hỏi | Vì sao cần | Trạng thái |
| --- | --- | --- | --- |
| P0 | Đơn vị gửi AI là câu, đoạn hay cửa sổ nhiều đoạn? Định dạng nào đảm bảo ánh xạ lại đúng segment ID (dòng đánh số, JSON)? | Quyết định chất lượng văn và việc liên kết sinh ra có tin cậy. | Đang nghiên cứu công cụ hiện có; cần spike với 2–3 provider. |
| P0 | Provider mặc định cụ thể và trần chi phí mỗi job là bao nhiêu? Dữ liệu nào được gửi đi? | Người dùng cần biết trước chi phí và phạm vi gửi. | **Đã trả lời một phần** ngày 2026-10-02 ([ADR-004](../decisions/0004-ai-provider-layer.md)): kiến trúc adapter, nguồn bảng giá (models.dev), nhiều key `fill-first`, lưu khóa bằng `safeStorage` async đã chốt. **Còn mở:** provider nào là mặc định khi cài mới, con số trần chi phí mỗi job, và danh sách dữ liệu được gửi — cần spec AI. |
| P0 | Ghép chương giữa các nguồn raw khi bản EN/JA chia chương khác bản gốc? | Nhiều nguồn đã chốt; ghép sai làm hỏng ngữ cảnh gửi AI. | Cần mẫu dữ liệu thật. |
| P0 | TXT và Markdown đã chốt; mức giữ cú pháp và encoding khi import/export thế nào? Có cần xuất “dán sạch” và chọn kiểu lời thoại? | Tiêu chí không mất nội dung; nền tảng đăng chủ yếu nhận văn bản dán. | Cần đặc tả + dữ liệu mẫu. |
| P0 | Ma trận xưng hô: cấu trúc (người nói, người nghe, cách xưng, từ chương nào) và cách AI đề xuất cập nhật để người dùng duyệt? | Nỗi đau nhất quán lớn nhất theo nghiên cứu. | Màn xem ưu tiên trước; cơ chế cập nhật cần spec. |
| P1 | Văn phong từ bản dịch cũ: ví dụ mẫu truy xuất theo câu tương tự, bản hướng dẫn văn phong, hay cả hai? | Cần căn chỉnh bản cũ với raw; chi phí prompt tăng. | Chờ nghiên cứu công cụ + thử. |
| Kỹ thuật | IME tiếng Việt (Telex, VNI) và Pinyin có gõ đúng trong CodeMirror ở Electron 44 không? | Chromium 149+ trên Windows từng mất lần gõ IME đầu ở contenteditable; chưa kiểm chứng cho Chromium 152. Điều kiện chốt CodeMirror ([ADR-003](../decisions/0003-technology-stack.md)). | Cần thử tay bằng bàn phím thật ở spike M1. |
| Kỹ thuật | Căn chỉnh offline có cần model embedding trong bản cài? | Sau ADR-002 căn chỉnh rời đường chính; vẫn cần cho nhiều nguồn và bản cũ. | Lát cắt đầu dùng Bậc 0; đo trên corpus trước khi quyết. |
| UX | Khi mở app dùng theme theo Windows hay ghi nhớ lựa chọn gần nhất? | Cần cho setting và screenshot mặc định. | Chưa chốt. |
| UX | Phạm vi thật của panel "Hỏi AI": dùng chung provider đã chốt hay tính năng riêng cần UX/chi phí/giới hạn riêng? Có bắt buộc mạng không? | Khác job dịch theo lô (S1.3); cần quyết định trước khi nối dữ liệu thật. | **Đã trả lời phần thứ tự** ngày 2026-10-02 ([ADR-004](../decisions/0004-ai-provider-layer.md)): panel này **hoãn tới sau khi job dịch chạy end-to-end**, dùng chung cấu hình provider nhưng là một contract thứ hai (streaming, chỉ đọc), không nhồi vào `translate()`. **Còn mở:** giới hạn chi phí riêng và mặc định model cho chế độ hỏi. Vỏ giao diện vẫn là minh họa (`ai-chat-panel` — xem [backlog](../delivery/backlog.md)). |
| Brand | Logo/wordmark, subtitle/tagline chính thức và khả dụng nhãn hiệu/domain/store cho Mira? | Tên đã chốt; nhận diện còn mở. | Chưa chốt. |
| Sản phẩm | Giấy phép của Mira, mô hình thu phí và kênh phân phối? | Không tự suy ra từ khảo sát đối thủ. | Chưa chốt; cần nghiên cứu người dùng. |
| Nghiên cứu | Người dịch bằng AI có thực sự soát theo segment, hay chỉ đọc lướt toàn văn? | Quyết định mức đầu tư cho mode Từng câu. | [Kế hoạch kiểm chứng](../delivery/validation.md), chưa thực hiện. |
| Sau bản đầu | Tài khoản, đồng bộ, docs/MDX nhiều file, EPUB. | Đã chốt để sau. | Chưa cần khóa. |

**Đã trả lời:** Ngày 2026-10-01: thanh điều hướng cấp tác phẩm **giữ nguyên bốn khu vực** Chương/Ngữ cảnh/Nguồn/Tác vụ (không đổi sang Dịch thuật/Nhân vật/Từ điển/Thế giới quan/Benchmark của mockup redesign; Ngữ cảnh có nhiều thông tin nên giữ là khu vực riêng, không rút gọn thành tab trong màn chương); pane bản dịch có **Live Preview nhẹ** (`#`/`**đậm**`, chỉ mark decoration, không ẩn ký tự cú pháp) thay vì chờ chốt Live Preview đầy đủ — xem `rendered-direct-edit-view` ở backlog. `node:sqlite` chạy trong Electron 44 và được chốt cùng CodeMirror, SQL thuần, valibot, Vitest, IPC tự viết ([ADR-003](../decisions/0003-technology-stack.md)); đuôi tệp là `.mira`; mỗi tác phẩm một tệp; app lưu nội bộ và cho xuất/backup; Source editor + Reading view riêng; đề xuất căn chỉnh offline; ba cặp ngôn ngữ Anh/Trung giản thể/phồn thể/Nhật → Việt; nhập/xuất TXT/MD; sửa lỗi bản gốc bằng thao tác riêng có lịch sử/hoàn tác; tên là Mira; Tailwind CSS v4 + Base UI. Ngày 2026-09-29: **AI dịch từ raw là luồng chính**; nhiều nguồn raw với nguồn chính do người dùng chọn; văn phong từ bản dịch cũ; ma trận xưng hô; kết nối API key/OpenRouter/tương thích OpenAI, không OAuth thuê bao; tài khoản và đồng bộ để sau. Không hỏi lại trừ khi người dùng đổi ý.

---

[Mục lục handbook](../README.md)
