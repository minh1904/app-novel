# Phiên AI, lịch sử và nhiều chương

Cập nhật: 2026-10-09 · Trạng thái: vòng đời phiên và proposal đã triển khai; quản lý phiên,
retention và tác vụ nhiều chương còn mở.
Chủ trì: sản phẩm/kỹ thuật. Câu hỏi: panel đang mở ở chương khác thì kết quả đi đâu?

## Ba vòng đời

| Đối tượng | Hiện trạng đã triển khai | Vòng đời |
| --- | --- | --- |
| **Phiên AI** | `ai_session` theo tác phẩm; chứa các `ai_turn` bền, mỗi lượt ghi chương, vị trí, model, câu hỏi/trả lời, tool, usage và trạng thái | Ẩn panel hoặc đổi chương không kết thúc phiên. Mở lại app đọc được lịch sử; lượt đang dở thành `interrupted`. Chưa có rename/delete/pin/archive/retention. |
| **Lượt dịch / tác vụ** | Dịch một chương có run/proposal; `JobRunner` nhiều chương chưa thuộc module này | Chia lô, retry, hủy và phục hồi tác vụ nhiều chương vẫn thuộc Module 7. |
| **Đề xuất** | Bản ghi theo chương, có phần neo, trạng thái duyệt và liên kết nullable tới session/turn | Tồn tại độc lập với panel. Theo schema hiện tại, xóa session sẽ bỏ liên kết session/turn nhưng không xóa proposal. |

## Hành vi người dùng cần giữ

- Ẩn/đóng panel rồi mở lại trong cùng lần chạy app: hội thoại và vị trí xem vẫn còn.
- Mở chương khác: panel vẫn xem được phiên của tác phẩm, còn mỗi đề xuất luôn mở đúng chương của nó.
- Tắt/mở app: **lịch sử phiên và đề xuất đã lưu** còn tra cứu được; người dùng có thể mở phiên cũ
  để tiếp tục chat. Tác vụ nhiều chương tiếp tục theo Module 7. Tiếp tục chat là lượt gọi AI mới,
  không đòi giữ một kết nối provider hay tiến trình AI qua lần tắt app.
- Người dùng có thể tạo phiên mới, xem phiên cũ và biết đề xuất nào vẫn chờ. Tạo phiên mới không xóa
  lịch sử/đề xuất của phiên trước.
- Lịch sử theo **tác phẩm**, không theo chương đang mở; mỗi lượt và đề xuất vẫn ghi `chapterId`.

## Ranh giới triển khai còn lại

Module quản lý phiên cần chốt và đặc tả riêng rename/delete/pin/archive, phân trang end-to-end,
retention và quan hệ khi xóa phiên. Storage đã có cursor, nhưng renderer mới tải 30 phiên và 100 lượt
mới nhất; các lượt cũ hơn chưa hiện và chưa tham gia lịch sử gửi model. Module 7 vẫn sở hữu
`JobRunner`, dịch nhiều chương, retry, hủy, chi phí và phục hồi tác vụ.

Với nhiều chương, phải cho xem danh sách chương đã xong/chờ duyệt/đang dịch/lỗi và lọc đề xuất theo
chương hoặc lượt dịch. Đó là yêu cầu điều hướng dữ liệu cho Module 5 và Module 7, chưa có UI được
duyệt. Không buộc người dùng đứng ở chương mà AI đang dịch.

Lượt dở khi app đóng giữ partial answer và được đánh dấu `interrupted` ở lần khởi động sau. Proposal
do tool chat tạo luôn ở chế độ duyệt trước; pending glossary hiện chỉ giữ liên hệ trong metadata tool,
chưa có provenance session/turn trực tiếp.

Nguồn: [quyết định module](decisions.md),
[roadmap](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#7-tác-vụ).

[Về mục lục](README.md)
