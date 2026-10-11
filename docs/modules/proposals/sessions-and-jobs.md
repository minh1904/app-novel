# Phiên Trợ lý và tác vụ

Cập nhật: 2026-10-11 · Trạng thái: contract sản phẩm hiện hành; phần task nhiều chương chưa triển khai.

## Bốn vòng đời

| Đối tượng | Nơi lưu | Vai trò |
| --- | --- | --- |
| **Session** | `library.db` | Một hội thoại toàn ứng dụng; còn nguyên khi đổi màn, chương hoặc tác phẩm. |
| **Turn** | `library.db` | Một yêu cầu và câu trả lời, kèm context snapshot, model, activity và usage. |
| **Operation** | `library.db` + journal/checkpoint trong work DB | Một thao tác ghi ngắn do turn tạo, có target, tiến độ, cancel và Undo. |
| **Task** | `library.db`, sẽ bổ sung | Công việc dài gồm nhiều item, có pause/cancel/retry, ngân sách và phục hồi sau khi mở lại app. |

Proposal cũ tiếp tục nằm trong work DB và được truy cập qua `legacyRef`; nó không phải task hay
operation mới.

## Hành vi phải đạt

- Có thể tạo và tiếp tục session ở ngoài tác phẩm.
- Mở Trợ lý từ chương chỉ bổ sung context cho lượt mới; không tạo lịch sử thứ hai.
- Chuyển màn không hủy turn hoặc task đang chạy. Stream được định danh bằng request/turn ID.
- Mỗi operation và task hiển thị đúng target; **Mở đích** điều hướng tới chương liên quan.
- Đóng app biến turn đang stream thành `interrupted`. Task bền đọc journal để tiếp tục hoặc báo trạng
  thái cần xử lý; không tự tuyên bố hoàn tất.
- Lịch sử chat và trạng thái task là hai danh sách liên kết, không gộp tiến độ dài vào transcript.

## Tác vụ dịch nhiều chương đầu tiên

`translate_range` nhận danh sách chương đã resolve và tạo một task gồm các item tuần tự. Mỗi item gọi
pipeline dịch chương hiện có và lưu trạng thái `queued`, `running`, `completed`, `failed` hoặc
`cancelled`. Task lưu ngân sách, usage đã tiêu, lỗi cuối và con trỏ tiếp tục.

UI tối thiểu cần tổng tiến độ, chương đang chạy, danh sách lỗi, Pause/Continue, Cancel và Retry item.
Không cần scheduler tổng quát, DAG hoặc chạy song song ở phiên bản đầu.

Quản lý session nâng cao như rename, pin, archive, tìm kiếm, retention và attachment được hoãn cho tới
khi vòng chat và task cốt lõi đã chạy đầu-cuối.

[Quyết định](decisions.md) · [Roadmap agent](agent-roadmap.md) · [Về module](README.md)
