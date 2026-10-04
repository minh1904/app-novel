# Lộ trình và các câu hỏi còn mở

Cập nhật: 2026-10-04 · Trạng thái: đề xuất thứ tự triển khai dựa trên nghiên cứu.
Chủ trì: chủ sản phẩm/kỹ thuật. Câu hỏi: bắt đầu nhỏ ở đâu và cần chốt gì trước khi viết code?

## Các lát triển khai

| Lát | Phạm vi | Điều kiện để coi là đủ |
| --- | --- | --- |
| 1. Glossary thủ công | mục/alias/biến thể, duyệt, phạm vi cơ bản, quyền gửi, khớp và xem trước | sửa/restore không mất dữ liệu; không gửi mục chưa được phép; ca mơ hồ không chọn ngầm |
| 2. Lắp và truy vết | snapshot, ngân sách, báo phần cắt, ghi những gì thực gửi | tái dựng được request; thay mục và thêm mục mới tìm được ảnh hưởng |
| 3. Nhân vật và xưng hô thủ công | ba lớp dữ liệu, A→B, ngoại lệ, mặc định giữ hậu tố | không tự sinh chiều ngược; giữ được “chưa biết”; người dịch sửa quy ước được |
| 4. Hàng duyệt trích xuất | AI đề xuất thuật ngữ, nhân vật, vai và sự kiện có bằng chứng | không auto-promote; đo coverage, sai và công duyệt |
| 5. Văn phong và ký ức | mẫu có provenance, tóm tắt, truy hồi có giới hạn tri thức | tách corpus người dịch khỏi AI; chứng minh lợi ích ngoài mẫu chỉnh prompt |

Đây là thứ tự logic, không ấn định số sprint hay gộp module hiện có. Từng lát cần interface với editor/job/provider; có thể nghiệm thu lõi bằng recording mock khi luồng phụ thuộc chưa sẵn sàng, nhưng phải ghi rõ chưa nối UI hoặc dịch thật.

## Cần chốt trước khi tạo spec triển khai

1. Cách chọn chế độ hậu tố ở UI, phạm vi override và xử lý mâu thuẫn. Mặc định giữ đã chốt; không cần hỏi lại điều đó.
2. Phạm vi v1 chỉ theo chương hay có cảnh; xử lý tiết lộ muộn và chương làm mốc bị xóa.
3. Mô hình alias đồng dạng, gộp/tách thực thể và lưu lịch sử.
4. Quyền gửi từng loại mục; có thật sự cần mức “không gửi khi khớp” không?
5. Chính sách duyệt mục nhập tay/nhập ngoài; AI chưa duyệt không tự thành quy ước.
6. Nội dung snapshot, thời hạn lưu, backup và cách xóa dữ liệu riêng tư.
7. Cờ nào chỉ cảnh báo, cờ nào cho phép đề nghị thử lại; không đồng nhất retry với sửa chữ tự động.
8. Thứ tự cắt, phần bắt buộc, estimator và ngưỡng sau phép đo; không chốt các số cũ bằng việc sao chép.

## Các điểm không kế thừa nguyên xi từ context-core

| Thiết kế cũ | Vấn đề cần giải quyết trước khi làm |
| --- | --- |
| Alias unique toàn tác phẩm | đồng danh và biệt danh chung cần biểu diễn được |
| Xóa mốc thành NULL = vô hạn | có thể mở rộng hiệu lực và làm lộ thông tin |
| B bất biến cả chương | xung đột với ngoại lệ theo cảnh |
| Hash bỏ raw và đoạn trước | không đủ định danh toàn payload hoặc tái dựng request |
| Hai nhân vật xuất hiện là cần cặp thoại | chưa biết họ có nói với nhau không |
| Thiếu chuỗi glossary hoặc khác đại từ là lỗi | cần xử lý biến thể, vai nói/nghe và trường hợp không đủ căn cứ |
| Pending được dùng tiếp ở chương sau | trái bước duyệt, có nguy cơ khuếch đại lỗi |
| Mẫu AI đã chấp nhận thành phong cách người dịch | sai provenance của corpus nghiên cứu |
| Ngưỡng cố định và cache tiết kiệm như báo cáo vendor cũ | chưa đo trên Mira; điều kiện nhà cung cấp cần kiểm lại khi tích hợp |

Những điều trên là kết luận rà soát của bộ tài liệu này, không sửa âm thầm OpenSpec cũ. Trước triển khai cần cập nhật change tương ứng và ghi quyết định thật sự được chọn.

## Nghiên cứu tiếp, không phải việc đã hoàn thành

Thẩm định trực tiếp cặp Nhật–Việt của mẫu người dịch đã tìm được; bổ sung mẫu phát hành hợp pháp; nhờ người đủ năng lực annotate vai/cảnh và các cách dịch hợp lệ. Kiểm lại license, phiên bản repo và tài liệu provider tại thời điểm tích hợp. Chỉ mở rộng sang Trung/Anh sau khi đã tách các giả định đặc thù Nhật–Việt.

Theo dõi thành công bằng mức giảm lỗi có xác nhận và công biên tập, không bằng số trường schema, số mục glossary hay độ dài prompt.

[Về mục lục](README.md)
