## Why

Kho tác phẩm (change `m0-storage-foundation`) đã lưu được tác phẩm, nhưng chưa lưu được **nội dung dịch**, chưa cho **sao lưu và khôi phục**, và chưa có **giao diện provider dịch** để dựng luồng AI. Ba phần này là phần còn lại của mốc M0 và là điều kiện trước khi làm editor và job dịch (M1). Tách thành change riêng vì màn chi tiết truyện được ưu tiên làm trước.

## What Changes

- Thêm repository nội dung: văn bản theo bên có revision và kiểm tra xung đột, segment có ID ổn định neo vào một revision, liên kết n:m, nguồn gốc bản dịch; văn bản và segment luôn ghi cùng một transaction. Các bảng đã có sẵn trong schema v1 của tệp tác phẩm, chỉ thiếu mã truy cập, IPC và test.
- Thêm sao lưu một tác phẩm thành một tệp và khôi phục thành tác phẩm mới, có kiểm tra toàn vẹn và phiên bản schema, khôi phục nguyên tử. Bao gồm ảnh bìa.
- Thêm interface provider dịch (yêu cầu và phản hồi theo segment ID, lỗi có phân loại, hủy), hàm đối chiếu ID thuần và provider giả lập chạy offline.
- Nối nút "Mở tác phẩm có sẵn" trên thư viện thành khôi phục từ tệp sao lưu, và thêm hành động sao lưu từ menu tác phẩm.

Không thuộc change này: màn chi tiết truyện và danh sách chương (change `work-detail-screen`), soạn thảo, nhập raw, chia câu, job dịch, gọi AI thật (M1 trở đi).

## Capabilities

### New Capabilities

- `content-model`: hợp đồng dữ liệu nội dung — văn bản theo bên có revision, segment, liên kết n:m, nguồn gốc bản dịch, các bất biến.
- `work-backup`: xuất một tác phẩm thành một tệp và khôi phục thành tác phẩm mới, an toàn và nguyên tử.
- `translation-provider`: hợp đồng provider dịch và provider giả lập offline.

### Modified Capabilities

<!-- Không có: các spec này chưa tồn tại trong openspec/specs/ khi change này được tạo. -->

## Impact

- **Code mới:** `src/main/storage/` (repository văn bản, segment, liên kết, backup), `src/main/providers/`, kênh IPC `text:*`, `backup:*`; mở rộng `src/shared/`, preload và menu hàng ở thư viện.
- **Dữ liệu:** không đổi schema tệp tác phẩm (đã có bảng từ v1 và cover từ v3); backup đọc và ghi đúng định dạng tệp `.mira` hiện có.
- **Phụ thuộc:** không thêm dependency runtime.
- **Tài liệu:** cập nhật `engineering/current-state.md` và `delivery/roadmap.md` khi hoàn thành.
