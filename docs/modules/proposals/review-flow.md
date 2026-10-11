# Luồng duyệt proposal legacy

Cập nhật: 2026-10-11 · Trạng thái: hành vi tương thích cho proposal đã có và luồng chưa chuyển đổi.

Proposal luôn gắn với tác phẩm, chương, vùng đích và base revision. Nó không đại diện cho operation hoặc
task của Trợ lý mới.

## Luồng tương tác

1. Mở proposal điều hướng tới đúng chương và hiển thị diff giữa chữ hiện tại với chữ được đề xuất.
2. **Accept** kiểm revision và neo trước khi ghi, lưu snapshot để hoàn tác rồi đổi trạng thái proposal.
3. **Deny** ghi quyết định nhưng không sửa nội dung.
4. **Accept all** chỉ áp dụng proposal `pending` trong phạm vi được ghi rõ. Mỗi mục dùng cùng kiểm tra như
   Accept; mục xung đột không ghi đè và vẫn được báo riêng.
5. Đóng panel hoặc app không làm mất proposal đã lưu.

| Tình huống | Hành vi |
| --- | --- |
| Đích đã được sửa sau khi proposal sinh | Không ghi; hiển thị xung đột theo chữ mới. |
| Nguồn bị sửa, xóa, tách hoặc gộp | Đánh dấu cũ hoặc yêu cầu tạo lại. |
| Vị trí đổi nhưng neo còn khớp duy nhất | Có thể gắn lại sau khi kiểm revision và nội dung. |
| Nhiều proposal chung một base | Áp trong một phép kiểm nhất quán; không tạo xung đột giả do mục trước vừa ghi. |

Không dùng số dòng hay thứ tự paragraph làm khóa bền. Dữ liệu mới do Trợ lý ghi đi qua operation,
journal/checkpoint và Undo trong [điều kiện ghi](data-and-safety.md).

[Về module](README.md)
