# Luồng duyệt tại editor

Cập nhật: 2026-10-04 · Trạng thái: luật ghi đã chốt; hình dạng UI chi tiết là đề xuất.
Chủ trì: sản phẩm. Câu hỏi: Accept, Deny và Accept all tác động lên chữ nào?

## Luật nền đã chốt

AI xử lý theo đoạn tự nhiên trong chương, không ép khớp câu. **Mọi** kết quả có thể thay chữ đều có
hồ sơ đề xuất, kể cả khi pane dịch trống. Mode mặc định giữ chữ cho tới khi người dùng Accept; mode
**Áp dụng thẳng** do người dùng chọn cho lượt chat/dịch sẽ tự Accept nếu mọi điều kiện ghi còn đúng.
Deny không ghi chữ. Đây là [quyết định hiện hành](decisions.md), thay ngoại lệ pane trống của
ADR-005. Diff phải xem được ngay tại pane đích với các phần còn chờ duyệt.

## Luồng tương tác đề xuất

1. Kết quả về được gắn với **tác phẩm, chương và vùng nguồn/đích xác định**, rồi hiện ở hàng chờ.
   Badge trên danh sách chương cho biết số đề xuất chờ; panel hiển thị phiên/lượt dịch và trạng thái.
2. Mở một đề xuất đưa người dùng đến đúng chương, đúng đoạn; diff ở pane đích cho thấy chữ hiện tại
   và chữ AI đề xuất. Không đổi chương đang mở chỉ vì một lượt dịch khác vừa xong. Với lượt chat
   **Tạo đề xuất** vừa chạy trong panel, đề xuất tự mở ở editor khi lượt xong; đề xuất của lượt cũ
   được khôi phục từ lịch sử thì không tự mở mà chờ nút **Xem trong bản dịch**.
3. **Accept** áp dụng đúng phần được chọn sau khi kiểm tra văn bản đích còn khớp ảnh chụp; lưu
   snapshot trước khi ghi và cho hoàn tác. **Deny** ghi quyết định, không sửa chữ.
4. **Accept all** chỉ lấy các đề xuất `pending` trong **chương đang mở**, hiển thị số lượng và tên
   chương trước khi xác nhận. Module 7 thêm hành động riêng **Duyệt tất cả trong lượt dịch**, ghi rõ
   số chương và số đề xuất. Không dùng cùng một nút mơ hồ cho hai phạm vi.
5. Áp dụng hàng loạt kiểm từng đề xuất bằng cùng điều kiện như Accept. Kết quả cho biết số đã nhận,
   số xung đột/cũ và số bị bỏ qua; một lỗi không được đổi chữ của đề xuất khác sai vị trí. Đề xuất
   bị xung đột vẫn ở hàng chờ để xem lại hoặc tạo lại.

Trong một đề xuất dài, UI có thể cho Accept/Deny **từng khối diff** như `chatReview.ts` hiện nay;
trạng thái của đề xuất chỉ kết thúc khi tất cả khối đã được quyết định. Đây là hướng UX, chưa chốt
cách lưu từng quyết định khối. Không suy từ tên nút ở Antigravity rằng nó có cùng ý nghĩa trong Mira.

## Ví dụ qua nhiều chương

Người dùng yêu cầu dịch chương 3–8 rồi mở chương 12 để sửa tay. Kết quả chương 3–8 vẫn gắn với từng
chương và hiện số chờ ở panel/danh sách chương; không chen chữ vào chương 12. Người dùng vào chương
3, Accept một đoạn, Deny một đoạn, rồi Accept all phần còn chờ của **chương 3**. Chương 4–8 không bị
duyệt ngầm; nếu muốn, người dùng dùng hành động riêng cho cả lượt dịch khi Module 7 có mặt. Tiến độ
AI dịch các chương thuộc Tác vụ, còn trạng thái duyệt thuộc Đề xuất.

## Trường hợp cần thấy rõ

| Tình huống | Hành vi đề xuất |
| --- | --- |
| Đoạn đích đã sửa tay sau khi AI tạo đề xuất | Không ghi; hiển thị xung đột và diff theo chữ mới |
| Đoạn nguồn đổi, bị xóa, tách hoặc gộp | Đánh dấu cũ, cho tạo lại hoặc gắn lại thủ công sau khi xem |
| Chỉ vị trí đoạn dời, chữ neo vẫn nguyên | Có thể tìm lại theo nội dung như V12, chỉ áp dụng khi khớp duy nhất |
| Đóng panel khi còn đề xuất chờ | Chỉ ẩn panel; hàng chờ và chữ không mất |
| Đóng app khi có đề xuất chờ | Đề xuất đã lưu còn ở lịch sử sau khi mở lại |

Không dùng thứ tự dòng hoặc `paragraphId` suy từ thứ tự làm khóa bền. Cách cấp định danh đoạn ổn
định khi người dùng tách/gộp dòng còn phải chốt trong OpenSpec.

Nguồn ràng buộc: [quyết định module](decisions.md),
[V11–V12](../../handbook/delivery/validation.md), [kiến trúc AI-first](../../handbook/engineering/ai-first-architecture.md).

[Về mục lục](README.md)
