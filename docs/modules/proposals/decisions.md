# Quyết định hiện hành — Trợ lý AI

Ngày: 2026-10-11 · Trạng thái: **Đã chốt về hướng sản phẩm; triển khai theo roadmap**.

## Sản phẩm

1. **Một Trợ lý cho toàn ứng dụng.** Người dùng có thể mở chat từ Trang chủ hoặc khi đang đọc một
   chương. Lịch sử session tập trung trong `library.db`, không chia thành các hộp chat độc lập theo
   tác phẩm.
2. **Ngữ cảnh đi theo từng lượt.** Khi gửi từ màn chương, lượt chụp tác phẩm, chương, vùng chọn và vị
   trí hiện tại. Session không đổi khi người dùng chuyển màn; target resolver xác định đích thao tác
   và yêu cầu làm rõ khi có nhiều khả năng hợp lệ.
3. **Agent chọn capability, workflow bền chạy việc dài.** Model hiểu ý định và chọn công cụ được đăng
   ký. Việc nhiều chương dùng workflow tất định, có trạng thái lưu bền; không để model tự điều khiển
   vòng lặp hàng chục chương.
4. **Turn và task là hai vòng đời khác nhau.** Turn giữ hội thoại. Task giữ tiến độ, ngân sách,
   pause/cancel/retry và phục hồi sau khi mở lại app. Một task có thể tiếp tục khi người dùng chat ở
   nơi khác.
5. **Mọi thao tác ghi phải kiểm soát được.** Agent chỉ ghi qua capability domain có target đã resolve,
   revision guard, write lease, journal/checkpoint và Undo. Kết quả lỗi phải hiện là lỗi; không được
   trả lời như đã hoàn tất.
6. **Usage lấy từ provider.** Tổng token và chi phí chỉ dựa trên usage provider báo; dữ liệu thiếu
   phải hiện là chưa đầy đủ, không thay bằng số 0 hoặc counter suy đoán.

## Giao diện chương

7. **Trợ lý và Ngữ cảnh dùng chung side panel.** Trên desktop đủ rộng, panel phải có hai chế độ
   **Trợ lý** và **Ngữ cảnh**; không mở hai panel song song trong phiên bản đầu. Trên cửa sổ hẹp, cùng
   panel trở thành drawer phủ từ bên phải.
8. **Ngữ cảnh nhanh và khu quản lý đầy đủ dùng chung dữ liệu.** Chế độ Ngữ cảnh mặc định hiển thị mục
   đang áp dụng cho chương, có lối xem toàn bộ glossary. Khu Context cấp tác phẩm tiếp tục xử lý import,
   lọc nâng cao và thao tác hàng loạt.
9. **Pending không đi vào prompt.** Mục context chờ duyệt phải có trạng thái nhìn thấy rõ và không được
   gửi cho model cho tới khi được duyệt.

## Dữ liệu cũ

10. Proposal, session và turn theo tác phẩm đã có vẫn phải đọc được. Accept/Deny và liên kết
    `legacyRef` chỉ phục vụ dữ liệu hoặc luồng legacy. Lượt agent mới dùng operation trực tiếp có
    checkpoint và Undo; không tạo thêm proposal chỉ để mô phỏng agent.

Các quyết định trước ngày 2026-10-11 về chat theo tác phẩm, composer có mode Hỏi/Sửa hoặc
proposal-only cho mọi lượt chat đã bị thay thế. Lịch sử Git là nguồn tra cứu các quyết định đó.

[Roadmap agent](agent-roadmap.md) · [Phiên và tác vụ](sessions-and-jobs.md) · [Về module](README.md)
