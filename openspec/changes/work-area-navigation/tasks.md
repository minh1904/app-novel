Khung màn (danh mục khu vực, `WorkAreaHost`, thanh tab cấp một, `workId`, bàn phím) do change `work-detail-screen` dựng (task 4.4 và 5.1). Change này chỉ làm phần dài hạn gắn vào khung đó, khi có màn thật.

## 1. Danh mục khu vực đầy đủ

- [ ] 1.1 Sau khi `work-detail-screen` có khung, khai báo thứ tự cố định Chương → Ngữ cảnh → Nguồn → Tác vụ và danh mục con Thuật ngữ → Xưng hô → Văn phong; bản sản phẩm chỉ đăng ký khu vực đã dùng được, không thêm khu vực giả để lấp tab.
- [ ] 1.2 `Ngữ cảnh` sẵn sàng khi có ít nhất một mục con sẵn sàng; mục con chưa sẵn sàng không xuất hiện.

## 2. Điều hướng cấp hai trong Ngữ cảnh

- [ ] 2.1 Hiển thị điều hướng cấp hai chỉ trong Ngữ cảnh khi có từ hai mục con sẵn sàng; mục con đầu tiên sẵn sàng là nội dung mặc định khi vào Ngữ cảnh, giữ đúng `workId`, không ghi dữ liệu khi đổi mục con.
- [ ] 2.2 Kiểm tra tab/panel, tên đọc được, focus khi đổi mục con và bố cục tại 940 px không tràn ngang toàn trang.

## 3. Kiểm chứng và tài liệu

- [ ] 3.1 Dùng danh mục thử trong test để kiểm tra trạng thái chỉ Chương, một phần Ngữ cảnh và đủ bốn khu vực: thứ tự, thao tác bàn phím, không hiện mục chưa sẵn sàng, đúng `workId`.
- [ ] 3.2 Cập nhật mockup năm tab thành cấu trúc đã chốt và `engineering/current-state.md` khi khu vực thứ hai thực sự được triển khai; chạy typecheck, lint, test và build.
