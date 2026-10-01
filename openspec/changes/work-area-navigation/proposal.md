## Why

Màn chi tiết tác phẩm sẽ dần có thêm tài nguyên ngữ cảnh, nguồn raw và tác vụ dịch. Nếu giữ năm tab ngang trong mockup, Thuật ngữ và Xưng hô bị tách khỏi Văn phong dù cùng phục vụ ngữ cảnh dịch; nếu đưa tab vào M0, người dùng lại gặp màn chưa có chức năng. Người dùng đã chốt cấu trúc bốn khu vực ngày 2026-10-01; cần đặc tả cách điều hướng xuất hiện theo tiến độ tính năng.

## What Changes

- Dùng bốn khu vực cấp tác phẩm: **Chương · Ngữ cảnh · Nguồn · Tác vụ**. Ngữ cảnh chứa **Thuật ngữ · Xưng hô · Văn phong** dưới dạng điều hướng cấp hai.
- Chỉ hiển thị khu vực và mục con khi có màn làm việc thật cho khả năng đó; màn Chương của change `work-detail-screen` vẫn không có thanh tab một mục.
- Giữ tiêu đề/thông tin nhận diện tác phẩm và đường quay lại tác phẩm khi chuyển giữa khu vực hoặc từ chương; trạng thái cục bộ của mỗi màn không bị hiểu thành dữ liệu đã lưu.
- Định nghĩa hợp đồng điều hướng để các change về glossary, ma trận xưng hô, nguồn raw và job dịch gắn vào đúng khu vực khi được triển khai. Hành vi dữ liệu của từng tính năng vẫn thuộc spec riêng theo [scope](../../../docs/handbook/product/scope.md).

## Capabilities

### New Capabilities

- `work-area-navigation`: Điều hướng cấp tác phẩm theo bốn khu vực, mục con Ngữ cảnh và quy tắc chỉ hiện khi chức năng sẵn sàng.

### Modified Capabilities

Không đổi requirement đã có của `work-library`, `work-storage` hay spec `work-detail` (đã gộp chương và khung màn) trong change `work-detail-screen`.

## Impact

- **UI:** vùng chi tiết tác phẩm trong `src/renderer/src/features/work/`, `View`/AppShell và breadcrumb; có thể cần thành phần tab dùng chung theo design system hiện hành.
- **Dữ liệu/API:** không thêm bảng, migration hoặc IPC chỉ để tạo điều hướng. Các màn con dùng hợp đồng dữ liệu riêng của change tương ứng.
- **Thứ tự:** M0 hoàn thành Chương trước. Change này có ý nghĩa hiển thị khi ít nhất một khu vực khác đã có màn và thao tác thật; việc triển khai từng tài nguyên theo S1–S3 không được đẩy sớm chỉ để lấp tab.
- **Tài liệu:** cập nhật handbook, mockup nghiên cứu và hiện trạng triển khai khi áp dụng.
