# Phiên AI, lịch sử và nhiều chương

Cập nhật: 2026-10-04 · Trạng thái: vòng đời sản phẩm đã chốt; mô hình bảng chưa chốt.
Chủ trì: sản phẩm/kỹ thuật. Câu hỏi: panel đang mở ở chương khác thì kết quả đi đâu?

## Ba vòng đời khác nhau

| Đối tượng đề xuất | Phạm vi | Dữ liệu cần giữ | Vòng đời |
| --- | --- | --- | --- |
| **Phiên AI** | Một tác phẩm; chứa các lượt hỏi/sửa và tham chiếu tới lượt dịch | Hội thoại, model/cấu hình từng lượt, mốc thời gian, liên kết kết quả | Panel ẩn không kết thúc phiên; có thể mở lại và tiếp tục sau khi app tắt |
| **Lượt dịch / tác vụ** | Một yêu cầu với danh sách chương cố định | Chương nào đã xong, đang chạy, lỗi, số lần thử và chi phí | Chạy bền trong main ở Module 7; app tắt phải tiếp tục đúng việc |
| **Đề xuất** | Một chương và vùng chữ được neo | Chữ AI, chữ gốc lúc sinh, trạng thái duyệt, nguồn sinh | Tồn tại độc lập với panel và chương đang mở |

Đây là **mô hình khái niệm**, chưa khóa tên bảng. Một phiên có thể chứa nhiều lượt dịch; một lượt
dịch có thể tạo nhiều đề xuất ở nhiều chương. Chat sửa một đoạn cũng tạo đề xuất cùng loại. Panel
đang xem phiên nào là trạng thái UI, không phải điều kiện để một tác vụ tiếp tục chạy.

## Hành vi người dùng cần giữ

- Ẩn/đóng panel rồi mở lại trong cùng lần chạy app: hội thoại và vị trí xem vẫn còn.
- Mở chương khác: panel vẫn xem được phiên của tác phẩm, còn mỗi đề xuất luôn mở đúng chương của nó.
- Tắt/mở app: **lịch sử phiên và đề xuất đã lưu** còn tra cứu được; người dùng có thể mở phiên cũ
  để tiếp tục chat. Tác vụ nhiều chương tiếp tục theo Module 7. Tiếp tục chat là lượt gọi AI mới,
  không đòi giữ một kết nối provider hay tiến trình AI qua lần tắt app.
- Người dùng có thể tạo phiên mới, xem phiên cũ và biết đề xuất nào vẫn chờ. Tạo phiên mới không xóa
  lịch sử/đề xuất của phiên trước.
- Lịch sử theo **tác phẩm**, không theo chương đang mở; mỗi lượt và đề xuất vẫn ghi `chapterId`.

## Ranh giới triển khai

Module 5 cần thiết lập lịch sử phiên, liên kết nguồn gốc đề xuất và hàng chờ có thể điều hướng theo
chương. Module 7 mới sở hữu `JobRunner`, chia lô, retry, hủy, chi phí và phục hồi sau khi app tắt.
Để không dựng tác vụ giả trong Module 5, một lượt dịch một chương hiện có có thể gắn trực tiếp
`sessionId`/`requestId`; liên kết `jobId` để trống cho tới Module 7. Module 5 phải lưu hội thoại đủ
để xem và tiếp tục phiên cũ, không chỉ giữ một tóm tắt trong state React. OpenSpec sẽ chốt retention,
giới hạn dung lượng và cách phục hồi lượt đang dở khi app tắt.

Với nhiều chương, phải cho xem danh sách chương đã xong/chờ duyệt/đang dịch/lỗi và lọc đề xuất theo
chương hoặc lượt dịch. Đó là yêu cầu điều hướng dữ liệu cho Module 5 và Module 7, chưa có UI được
duyệt. Không buộc người dùng đứng ở chương mà AI đang dịch.

Nguồn: [quyết định module](decisions.md),
[roadmap](../../handbook/delivery/roadmap.md#7-tác-vụ).

[Về mục lục](README.md)
