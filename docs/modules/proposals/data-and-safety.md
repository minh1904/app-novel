# Dữ liệu agent và điều kiện ghi

Cập nhật: 2026-10-11 · Trạng thái: ràng buộc an toàn hiện hành.

## Nguồn sự thật

- `library.db` giữ session, turn, activity, operation và task toàn ứng dụng.
- Work DB giữ nội dung tác phẩm, revision, context, journal/checkpoint thao tác và proposal legacy.
- State React, transcript hiển thị và HTML diff không phải nguồn phục hồi.

Mọi tham chiếu cross-database dùng ID bền. Nếu tác phẩm hoặc chương đã mất, lịch sử vẫn đọc được nhưng
operation mới phải dừng với lỗi target không còn tồn tại.

## Điều kiện ghi của agent

1. Resolver xác định work/chapter/side trước khi capability chạy. Target mơ hồ chuyển turn sang
   `waiting_user`; model không tự tạo ID để bỏ qua resolver.
2. Renderer flush bản sửa chưa lưu trước khi main cấp write lease. Capability kiểm expected revision
   trước mỗi batch.
3. Batch nội dung, journal và checkpoint commit trong cùng transaction của work DB. Library DB chỉ cập
   nhật trạng thái operation sau khi có bằng chứng từ journal.
4. Cancel giữ các batch đã commit và dừng request tiếp theo. Operation chỉ báo `completed` khi mọi batch
   cần thiết đã commit; phần thành công kèm lỗi phải có trạng thái riêng.
5. Undo chỉ chạy khi revision hiện tại còn bằng revision cuối operation đã ghi. Nếu người dùng đã sửa
   tiếp, Undo dừng và giải thích xung đột.
6. Capability trả lỗi không được biến thành câu trả lời thành công. Terminal event phải có đúng một
   trạng thái cuối và giữ nguyên lỗi gốc đã phân loại.

## Context và dữ liệu nhạy cảm

Context snapshot ghi ID và revision của các mục thực sự gửi. Chỉ glossary, nhân vật và quy tắc đã duyệt,
đúng phạm vi mới rời máy; mục `pending` hoặc `rejected` không đi vào prompt.

Nội dung truyện, hội thoại và kết quả tool không được ghi vào telemetry mặc định. Log kỹ thuật chỉ giữ
ID, trạng thái, kích thước và lỗi đã lọc bí mật. Backup phải bao phủ cả library DB và work DB để không
tách session khỏi operation hoặc checkpoint liên quan.

## Proposal legacy

Proposal cũ tiếp tục kiểm base text/revision và neo duy nhất trước Accept. Accept ghi nội dung, snapshot
và trạng thái proposal trong một transaction; Deny chỉ đổi trạng thái. Luồng này không được dùng làm
đường ghi cho lượt agent mới.

[Quyết định](decisions.md) · [Phiên và tác vụ](sessions-and-jobs.md) ·
[Dữ liệu Context](../context/data-lifecycle.md) · [Về module](README.md)
