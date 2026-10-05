## Why

Người dịch làm việc đồng thời trên nhiều truyện nhưng Mira chỉ giữ một màn đang mở; chuyển truyện làm mất vị trí điều hướng và khiến việc quay lại phải đi qua Thư viện. Trước khi thêm tác vụ nhiều chương ở Module 7, mỗi truyện cần một không gian làm việc có thể chuyển nhanh mà không gắn vòng đời tác vụ với màn đang xem.

## What Changes

- Thêm thanh tab cấp ứng dụng: mỗi tác phẩm đang mở có đúng một tab; mở lại từ Thư viện chuyển tới tab sẵn có.
- Mỗi tab nhớ màn chi tiết hoặc chương, chương và khu vực tác phẩm đang xem; phiên mở tab được khôi phục sau khi mở lại ứng dụng, với kiểm tra tác phẩm/chương còn tồn tại.
- Chuyển tab giữ bản sửa chưa lưu của từng editor trong phiên chạy; đóng tab và thoát ứng dụng xử lý rõ mọi bản sửa chưa lưu.
- Tab hiển thị gọn trong thanh tiêu đề, dùng được bằng bàn phím và khi có nhiều truyện; Thư viện và Cài đặt vẫn là điều hướng toàn ứng dụng.
- Đóng tab chỉ đóng không gian làm việc; tác vụ dịch chạy trong Main ở Module 7 có vòng đời riêng.

## Capabilities

### New Capabilities

- `work-tabs`: Mở, chuyển, đóng và khôi phục tab theo tác phẩm; bảo vệ bản sửa và tách tab khỏi tác vụ nền.

### Modified Capabilities

- `work-detail`: Thay quy tắc luôn quay về Chương khi mở màn bằng quy tắc giữ khu vực đang xem theo tab tác phẩm.

## Impact

- Điều hướng và trạng thái UI (`App`, `AppShell`, `uiStore`, `WorkDetailScreen`), editor và `LeaveGuard` cần hỗ trợ nhiều không gian mở.
- Các store hiện gắn với một tác phẩm (`chapterStore`, `aiChatStore`) cần được kiểm tra để không trộn dữ liệu hoặc mất stream khi chuyển tab.
- Cần lưu bố cục tab ở phạm vi ứng dụng; không đưa trạng thái giao diện vào tệp nội dung `.mira`.
- Không đổi schema `job`/`job_item`, cách tính chi phí hoặc hợp đồng JobRunner của Module 7.
