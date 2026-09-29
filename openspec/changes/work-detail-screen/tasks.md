## 1. Kiểu và hợp đồng dùng chung

- [ ] 1.1 Thêm `ChapterSummary`, schema valibot cho `chapters:*` (ID hợp lệ, tên tối đa 200 ký tự đã cắt khoảng trắng, `to` là số nguyên dương) và kênh tương ứng trong `shared/`
- [ ] 1.2 Mở rộng `workPatchSchema` với `cover` (`null` để gỡ, vắng mặt để giữ) và kiểu `WorkPatch`

## 2. Repository chương

- [ ] 2.1 Hàm chương trong tệp tác phẩm: liệt kê, thêm vào cuối, đổi tên, chuyển vị trí (`from → to` bằng hai câu lệnh dồn có điều kiện trong một transaction), xóa và dồn số thứ tự, mở chương (đặt chương gần nhất, `not-started` → `in-progress`, không đụng `paused`); mọi thao tác cập nhật `work.updated_at`
- [ ] 2.2 `LibraryStore`: phơi các thao tác chương, tra chương trong đúng tệp tác phẩm (`not_found` cho ID lạ), làm mới chỉ mục thư viện sau mỗi thay đổi
- [ ] 2.3 `library.update` nhận `cover` trong cùng transaction với các trường khác (lưu thông tin và bìa nguyên tử)
- [ ] 2.4 Test bất biến: vị trí luôn là hoán vị liền mạch sau mỗi thao tác; số chương và chương gần nhất trong chỉ mục khớp; xóa chương gần nhất xóa con trỏ; chuyển tới vị trí ngoài phạm vi bị từ chối
- [ ] 2.5 Test ngẫu nhiên so với mô hình mảng thuần: dãy thao tác thêm/đổi tên/chuyển/xóa ngẫu nhiên (cố định seed, in seed khi fail) cho kết quả kho bằng kết quả mô hình
- [ ] 2.6 Mở rộng test kill tiến trình sang thêm, chuyển và xóa chương: sau khi kill, thứ tự vẫn liền mạch và mọi thay đổi đã xác nhận còn nguyên
- [ ] 2.7 Đo ở tầng kho với 2.000 và 5.000 chương: thời gian liệt kê, thêm, chuyển, xóa; ghi kết quả vào design

## 3. IPC

- [ ] 3.1 Handler `chapters:list|create|rename|move|delete|open` qua `createHandler` và `guardHandlers`; mở rộng preload và `DesktopApi`
- [ ] 3.2 Test handler: đầu vào sai kiểu, ID chương của tác phẩm khác, `to` ngoài phạm vi, nguồn không tin cậy

## 4. Giao diện: nền dùng chung

- [ ] 4.1 Tách `WorkForm` (tên, ngôn ngữ, tên gốc, tác giả, thể loại, mô tả, `CoverPicker`) khỏi `CreateWorkScreen`, có chế độ tạo và sửa (ngôn ngữ nguồn khóa khi sửa); màn tạo dùng lại và không đổi hành vi
- [ ] 4.2 Hàm thuần lọc chương theo tên không dấu và phân tích ô "tìm hoặc nhảy tới số" (số nguyên → nhảy, còn lại → lọc), kèm test
- [ ] 4.3 Hook `useWorkDetail(workId)`: nạp tác phẩm + chương, các hành động chương và sửa thông tin, thông báo lỗi, làm mới thư viện khi rời màn

## 5. Giao diện: màn chi tiết truyện

- [ ] 5.1 `WorkDetailScreen`: đầu màn (bìa, tên, tên gốc, tác giả, thể loại, mô tả thu gọn, trạng thái, ngôn ngữ, số chương, thời điểm sửa), nút chính "Tiếp tục" hoặc "Thêm chương", menu tác phẩm (tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa), nhãn "Đã lưu trữ"
- [ ] 5.2 Hộp thoại "Sửa thông tin" dùng `WorkForm`; lỗi lưu giữ nguyên nội dung đã nhập; xóa trường tùy chọn thì dòng biến mất
- [ ] 5.3 Danh sách chương: hàng số + tên + thời điểm sửa + menu; hiển thị dần 100 hàng, "Hiện thêm" và tải khi cuộn; `React.memo` cho hàng
- [ ] 5.4 Thêm chương: hàng nhập ở đầu danh sách, Enter thêm và giữ nhập, Esc đóng, cuộn tới chương mới và đặt focus
- [ ] 5.5 Đổi tên tại chỗ (menu hoặc nhấp đôi; Enter lưu, Esc hủy, rỗng → "Chương N")
- [ ] 5.6 Chuyển vị trí qua menu (lên, xuống, đầu, cuối) và hộp thoại "Chuyển tới vị trí…" báo lỗi ngoài phạm vi
- [ ] 5.7 Xóa chương với hộp xác nhận nêu tên chương và cảnh báo không hoàn tác
- [ ] 5.8 Ô tìm/nhảy: lọc không dấu, nhảy tới số và làm nổi bật hàng, trạng thái không có kết quả kèm nút xóa bộ lọc
- [ ] 5.9 Trạng thái trống của danh sách chương (chưa có chương), trạng thái đang tải và lỗi, và màn khi tác phẩm không mở được
- [ ] 5.10 Cửa sổ hẹp (940 px) không tràn ngang; thứ tự Tab, focus nhìn thấy, thông báo trạng thái cho công nghệ hỗ trợ (`role="status"`/`alert`)

## 6. Điều hướng và chỗ giữ chỗ editor

- [ ] 6.1 `View` thêm `work` (chi tiết) và `chapter` (chỗ giữ chỗ editor có nút về chi tiết); "Mở tác phẩm", mục thanh bên "Tác phẩm gần đây" và breadcrumb tới màn chi tiết
- [ ] 6.2 "Tiếp tục" ở thư viện và ở màn chi tiết gọi `chapters:open` rồi tới chương; menu hàng "Tiếp tục dịch chương N" cũng vậy; thư viện tải lại khi quay về

## 7. Kiểm chứng và tài liệu

- [ ] 7.1 Chạy trong Electron thật: tác phẩm 2.000 và 5.000 chương (tạo bằng script ngoài repo): đo thời gian mở màn, thêm chương, chuyển vị trí, lọc, nhảy; chụp màn hình các trạng thái chính; ghi số đo vào design và đổi sang ảo hóa nếu không đạt
- [ ] 7.2 Kiểm tra bằng bàn phím toàn bộ luồng thêm, đổi tên, chuyển, xóa, sửa thông tin
- [ ] 7.3 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `experience/first-run.md`
