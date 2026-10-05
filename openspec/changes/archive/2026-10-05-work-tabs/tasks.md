## 1. Lưu phiên tab

- [x] 1.1 Thêm bản ghi workspace có version trong `library.db` và IPC có kiểu để đọc/ghi thứ tự tab, tab hoạt động và vị trí từng truyện; kiểm thử nạp rỗng, nạp lại và lỗi ghi.
- [x] 1.2 Kiểm tra ID tác phẩm/chương khi phục hồi; bỏ tab mất, đưa chương mất về màn chi tiết và báo lỗi dễ hiểu mà Thư viện vẫn mở được.

## 2. Điều hướng theo truyện

- [x] 2.1 Chuyển `uiStore` từ một `view` sang danh sách tab theo `workId` và màn cấp ứng dụng; mọi lối mở truyện/chương dùng cùng hành động, không tạo tab trùng.
- [x] 2.2 Đưa khu vực của `WorkDetailScreen` vào vị trí của từng tab; kiểm thử chuyển tab, mở lại từ Thư viện, quay lại từ chương và khôi phục sau restart.
- [x] 2.3 Tách trạng thái chương và phiên AI theo tác phẩm; kiểm thử tải chương/stream đến sau khi đổi tab không cập nhật sai truyện.

## 3. Bản sửa chưa lưu

- [x] 3.1 Giữ `EditorState` của tab có bản sửa khi ẩn; tab ẩn không nhận focus và tab sạch có thể giải phóng màn nặng.
- [x] 3.2 Mở rộng `LeaveGuard` theo tab; chuyển tab không hỏi lưu, đóng tab hoặc rời chương chỉ xét bản sửa liên quan, lưu thất bại giữ tab và nội dung.
- [x] 3.3 Nối đường thoát cửa sổ với tất cả guard còn dirty; kiểm thử hai tab cùng chưa lưu, hủy thoát và lưu một tab thất bại.

## 4. Thanh tab và nghiệm thu

- [x] 4.1 Dựng tab truyện trong `AppShell` với tên cập nhật, nút đóng, trạng thái chọn, cuộn khi chật và phím Ctrl+Tab/Ctrl+Shift+Tab không chiếm phím editor đã xử lý.
- [x] 4.2 Kiểm bằng mắt trong Electron ở chiều rộng tối thiểu và khi mở nhiều truyện; kiểm focus, công nghệ hỗ trợ và vùng nút cửa sổ.
- [x] 4.3 Kiểm đóng tab không ảnh hưởng tác vụ Main và kết quả AI vẫn gắn đúng truyện; chạy `node scripts/check.mjs --build` trước nghiệm thu.
- [x] 4.4 Cập nhật tài liệu module/handbook và hiện trạng theo hành vi đã triển khai; phân biệt tab đã có với JobRunner Module 7 còn chờ.
