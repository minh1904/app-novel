# Định hướng Mira

Cập nhật: 2026-10-03 (theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md); bản trước 2026-09-29) · Trạng thái: ràng buộc đã chốt + giả thuyết sản phẩm. Chủ trì: chủ sản phẩm.

Người dùng đầu tiên là dịch giả cá nhân làm truyện nhiều chương, Anh/Trung giản thể/Trung phồn thể/Nhật → Việt. Ưu tiên người **dịch toàn bộ bằng AI từ raw** rồi soát và sửa; kế đến người tự dịch hoặc sửa bản dịch đã có với AI hỗ trợ ([ADR-002](../decisions/0002-ai-first-translation.md)). Bản dịch là sản phẩm công việc cần biên tập, kiểm tra và mang đi sử dụng.

**Mục tiêu lõi:** làm việc cùng AI trên từng chương. Một trình gõ kiểu Obsidian nơi AI đọc được văn bản, dịch và đề xuất sửa; người dịch duyệt từng chỗ ngay trong pane và quyết định cái gì vào bản dịch.

| Công việc | Kết quả cần có | Ràng buộc thiết kế |
| --- | --- | --- |
| Bắt đầu một truyện | Có tác phẩm và chương | Không phải cấu hình AI mới được viết |
| Dịch và sửa cả chương | Đọc mạch văn, đoạn, lời thoại | Hai pane độc lập, không ép cân dòng |
| Làm việc cùng AI | Hỏi, nhờ sửa, dịch cả chương; thấy đề xuất ngay trên chữ thật | AI chỉ đề xuất; người dịch nhận hoặc bỏ từng chỗ, hoàn tác được |
| Duy trì nhất quán | Tra tên, thuật ngữ, xưng hô, ghi chú | Từ điển thủ công trước tự trích xuất; ngữ cảnh gửi AI hiện ra cho người dùng thấy |
| Tiếp tục sau gián đoạn | Mở đúng nội dung đã lưu | Offline, phục hồi, backup/restore |
| Hoàn tất chương | Xuất văn bản để dùng tiếp | TXT/MD trước EPUB/DOCX/PDF |

## Lời hứa sản phẩm

**Định vị đề xuất:** không gian dịch thuật trên máy cá nhân, giúp giữ mạch văn cả chương và làm việc cùng AI mà vẫn nắm quyền quyết định từng chỗ. Đây là mô tả làm việc, chưa phải tagline.

Khác biệt cần kiểm chứng là kết hợp trình gõ tự do kiểu Obsidian, AI tác động được vào văn bản nhưng chỉ ghi khi người dịch nhận, ngữ cảnh truyện nhất quán xuyên chương, và phục hồi được. Offline, glossary hoặc AI đứng riêng chưa đủ chứng minh lợi thế; xem [mapping](../research/feature-map.md).

## Nguyên tắc ưu tiên

1. Không mất chữ hoặc âm thầm viết lại văn bản.
2. **AI đề xuất, người ghi.** AI không ghi đè chữ đã có; đề xuất hiện tại chỗ, nhận hoặc bỏ từng chỗ. Ngoại lệ duy nhất là pane bản dịch đang trống, nơi không có gì để mất.
3. Dịch giả kiểm soát văn phong; gợi ý tự động có nguồn gốc và sửa được.
4. P0 hoàn thành bằng một vòng công việc thực tế, không bằng số màn hình.
5. Mô hình có đường sang project/document cho docs; UI P0 dùng tác phẩm/chương.

*(Bản 2026-09-29 còn ghi "bản dịch vẫn hợp lệ khi chưa căn chỉnh; trạng thái dịch khác trạng thái liên kết" và "soát chi tiết: thấy vùng nguồn và dịch liên quan". Đã thay: mode Từng câu, liên kết giữa câu gốc và câu dịch bị bỏ ngày 2026-10-03; xem [alignment](../experience/alignment.md) làm hồ sơ.)*

## Giả thuyết cần kiểm chứng

Người dịch bằng AI có thực sự soát từng chỗ, hay chỉ đọc lướt cả chương? (Đây là điều ADR-005 đặt cược và chưa chạy kiểm chứng.) Duyệt đề xuất ngay trong pane có đủ nhanh và đủ an tâm không? Offline và kiểm soát dữ liệu có đủ giá trị để đổi công cụ? Cần từ điển tác phẩm hay import VietPhrase/Names trước? Chưa có phỏng vấn, retention hoặc mức sẵn sàng trả tiền.

Mira chưa chốt mô hình thu phí, giấy phép nguồn mở/đóng, kênh phân phối hoặc quy mô thị trường. Khảo sát đối thủ không tự quyết định các mục này. Xem [kế hoạch kiểm chứng](../delivery/validation.md).

---

[Mục lục handbook](../README.md)
