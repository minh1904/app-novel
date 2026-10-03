## Why

Màn chi tiết truyện đã cho tạo, đặt tên, sắp xếp và xóa chương (change `work-detail-screen`, đã archive), nhưng chương mới chỉ là một cái tên: chưa có chỗ lưu **văn bản gốc và bản dịch**, chưa cho **sao lưu và khôi phục**, và chưa có **giao diện provider dịch** để dựng luồng AI. Ba phần này là phần còn lại của mốc M0 và là điều kiện trước khi làm nhập raw, editor và job dịch (M1).

Sao lưu cần có trước khi dữ liệu thật tích lũy: hộp xóa chương hiện nói "chỉ mất tên và vị trí", câu đó sẽ sai ngay khi chương có nội dung.

## What Changes

- Thêm repository nội dung: văn bản theo bên có revision và kiểm tra xung đột, segment có ID ổn định neo vào một revision với **tọa độ tính theo đơn vị UTF-16**, liên kết n:m, nguồn gốc bản dịch; văn bản và segment luôn ghi cùng một transaction và có giới hạn kích thước. Các bảng đã có sẵn trong schema v1 của tệp tác phẩm, chỉ thiếu mã truy cập, IPC và test.
- Thêm kênh IPC `text:get` và `text:save` (chỉ văn bản và segment). Liên kết và nguồn gốc là hàm của repository có test, **chưa mở IPC** cho tới khi editor hoặc job dịch cần.
- `chapters:list` trả thêm chương nào đã có bản gốc, có bản dịch, để hộp xóa chương cảnh báo đúng. **Hộp xóa chương** nói rõ khi chương có nội dung và gợi ý sao lưu.
- Thêm sao lưu một tác phẩm thành một tệp và khôi phục thành tác phẩm mới, có kiểm tra toàn vẹn và phiên bản schema, khôi phục nguyên tử. Bao gồm ảnh bìa.
- Thêm interface provider dịch (yêu cầu và phản hồi theo segment ID, lỗi có phân loại, hủy), hàm đối chiếu ID thuần và provider giả lập chạy offline. Chỉ có test đơn vị, chưa có IPC hay giao diện gọi.
- Nối nút "Mở tác phẩm có sẵn" ở thư viện thành khôi phục từ tệp sao lưu và thêm "Sao lưu…" vào menu tác phẩm **ở cả thư viện và màn chi tiết**. Sau khi khôi phục có thông báo và cho mở tác phẩm vừa khôi phục.

Không thuộc change này: nhập raw, chia câu, editor và ánh xạ segment qua chỉnh sửa, job dịch, gọi AI thật, cột "có raw / có bản dịch" trên giao diện (chỉ có dữ liệu; xem [backlog](../../../../docs/handbook/delivery/backlog.md)), sao lưu cả thư viện hay sao lưu định kỳ.

## Capabilities

### New Capabilities

- `content-model`: hợp đồng dữ liệu nội dung — văn bản theo bên có revision, segment, liên kết n:m, nguồn gốc bản dịch, các bất biến và giới hạn.
- `work-backup`: xuất một tác phẩm thành một tệp và khôi phục thành tác phẩm mới, an toàn và nguyên tử.
- `translation-provider`: hợp đồng provider dịch và provider giả lập offline.

### Modified Capabilities

- `work-detail`: yêu cầu "Xóa chương" cảnh báo thêm khi chương có nội dung, kèm gợi ý sao lưu.

## Impact

- **Code mới:** `src/main/storage/` (repository văn bản, segment, liên kết, backup), `src/main/providers/`, kênh IPC `text:*`, `backup:*`; mở rộng `src/shared/`, preload, `chapters:list`, hộp xóa chương, màn "Mở tác phẩm có sẵn" và menu tác phẩm ở thư viện và màn chi tiết.
- **Dữ liệu:** schema tệp tác phẩm lên **v4** (`chapter_text.size` và một index phủ, để danh sách chương biết chương nào có nội dung mà không đọc văn bản; xem design D5). Các bảng nội dung đã có từ v1. Backup đọc và ghi đúng định dạng tệp `.mira`, tệp cũ được nâng cấp khi khôi phục.
- **Phụ thuộc:** không thêm dependency runtime.
- **Tài liệu:** cập nhật `engineering/current-state.md`, `delivery/roadmap.md` và `delivery/backlog.md` khi hoàn thành.
