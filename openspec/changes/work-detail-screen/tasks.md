## 1. Kiểu và hợp đồng dùng chung

- [x] 1.1 Thêm `ChapterSummary`, schema valibot cho `chapters:*` (ID hợp lệ, tên tối đa 200 ký tự đã cắt khoảng trắng, `to` là số nguyên dương) và kênh tương ứng trong `shared/`
- [x] 1.2 Mở rộng `workPatchSchema` với `cover` (`null` để gỡ, vắng mặt để giữ) và kiểu `WorkPatch`

## 2. Repository chương

- [x] 2.1 Hàm chương trong tệp tác phẩm: liệt kê, thêm vào cuối, đổi tên, chuyển vị trí (`from → to` bằng hai câu lệnh dồn có điều kiện trong một transaction), xóa và dồn số thứ tự, mở chương (đặt chương gần nhất, `not-started` → `in-progress`, không đụng `paused`); mọi thao tác cập nhật `work.updated_at`
- [x] 2.2 `LibraryStore`: phơi các thao tác chương, tra chương trong đúng tệp tác phẩm (`not_found` cho ID lạ), làm mới chỉ mục thư viện sau mỗi thay đổi
- [x] 2.3 `library.update` nhận `cover` trong cùng transaction với các trường khác (lưu thông tin và bìa nguyên tử)
- [x] 2.4 Test bất biến: vị trí luôn là hoán vị liền mạch sau mỗi thao tác; số chương và chương gần nhất trong chỉ mục khớp; xóa chương gần nhất xóa con trỏ; chuyển tới vị trí ngoài phạm vi bị từ chối
- [x] 2.5 Test ngẫu nhiên so với mô hình mảng thuần: dãy thao tác thêm/đổi tên/chuyển/xóa ngẫu nhiên (cố định seed, in seed khi fail) cho kết quả kho bằng kết quả mô hình
- [x] 2.6 Mở rộng test kill tiến trình sang thêm, chuyển và xóa chương: sau khi kill, thứ tự vẫn liền mạch và mọi thay đổi đã xác nhận còn nguyên
- [x] 2.7 Đo ở tầng kho với 2.000 và 5.000 chương: thời gian liệt kê, thêm, chuyển, xóa; ghi kết quả vào design

## 3. IPC

- [x] 3.1 Handler `chapters:list|create|rename|move|delete|open` qua `createHandler` và `guardHandlers`; mở rộng preload và `DesktopApi`
- [x] 3.2 Test handler: đầu vào sai kiểu, ID chương của tác phẩm khác, `to` ngoài phạm vi, nguồn không tin cậy

## 4. Giao diện: nền dùng chung

- [x] 4.1 Tách `WorkForm` (tên, ngôn ngữ, tên gốc, tác giả, thể loại, mô tả, `CoverPicker`) khỏi `CreateWorkScreen`, có chế độ tạo và sửa (ngôn ngữ nguồn khóa khi sửa); màn tạo dùng lại và không đổi hành vi
- [x] 4.2 Hàm thuần lọc chương theo tên hiển thị không dấu (gồm "Chương N" của chương không tên), phân tích ô "tìm hoặc nhảy tới số" (cả chuỗi là số nguyên dương → nhảy, ngoài phạm vi → báo lỗi, còn lại → lọc), tính trang chứa một vị trí và cắt trang 50/100 hàng, kèm test
- [x] 4.3 Hook `useWorkDetail(workId)` cho đầu trang (nạp tác phẩm, sửa thông tin, đổi trạng thái/lưu trữ/bìa, thông báo lỗi, làm mới thư viện khi rời màn) và hook riêng của `ChaptersArea` (nạp chương, hành động chương, trả `work` mới cho đầu trang)
- [x] 4.4 Khung màn: kiểu `WorkArea`, danh mục khu vực có thứ tự (chỉ đăng ký Chương), `WorkAreaHost` render khu vực với `workId` và error boundary riêng; một khu vực thì render thẳng, từ hai khu vực thì thanh tab accessible mặc định Chương, focus chuyển tới tiêu đề khu vực khi đổi; test bằng danh mục thử 1, 2 và 4 khu vực (thứ tự, không thanh tab khi một mục, đúng `workId`, lỗi một khu vực không sập đầu trang, không ghi dữ liệu khi đổi khu vực)

## 5. Giao diện: màn chi tiết truyện

- [x] 5.1 `WorkDetailScreen` (đầu trang + `WorkAreaHost`): đầu màn (bìa, tên, tên gốc, tác giả, thể loại, mô tả thu gọn, trạng thái, ngôn ngữ, số chương, thời điểm sửa), nút chính "Tiếp tục" hoặc "Thêm chương", menu tác phẩm (tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa), nhãn "Đã lưu trữ"
- [x] 5.2 Hộp thoại "Sửa thông tin" dùng `WorkForm`; lỗi lưu giữ nguyên nội dung đã nhập; xóa trường tùy chọn thì dòng biến mất
- [x] 5.3 Danh sách chương: hàng số + tên + thời điểm sửa + menu; phân trang mặc định 50 hàng (cho chọn 100), hiển thị khoảng/tổng và điều khiển chuyển trang bằng bàn phím; `React.memo` cho hàng
- [x] 5.4 Thêm chương: hàng nhập ở đầu danh sách (dính khi cuộn), Enter thêm và giữ nhập, Esc đóng, cuộn tới và làm nổi bật chương mới, focus ở lại ô nhập
- [x] 5.5 Đổi tên tại chỗ (menu hoặc F2; Enter lưu, Esc hủy, rỗng → "Chương N")
- [x] 5.6 Chuyển vị trí qua menu (lên, xuống, đầu, cuối) và hộp thoại "Chuyển tới vị trí…" báo lỗi ngoài phạm vi
- [x] 5.7 Xóa chương với hộp xác nhận nêu tên chương và cảnh báo không hoàn tác
- [x] 5.8 Ô tìm/nhảy: lọc không dấu trên toàn bộ chương rồi phân trang kết quả, nhảy tới trang chứa số và làm nổi bật hàng, trạng thái không có kết quả kèm nút xóa bộ lọc; xử lý trang sau thêm/xóa/chuyển vị trí
- [x] 5.9 Trạng thái trống (kèm "Thêm chương"), đang tải và lỗi (kèm thử lại) của danh sách chương, và màn khi tác phẩm không mở được
- [x] 5.10 Cửa sổ hẹp (940 px) không tràn ngang; thứ tự Tab, focus nhìn thấy, thông báo trạng thái cho công nghệ hỗ trợ (`role="status"`/`alert`)
- [x] 5.11 Minh họa "Nhập từ .txt": danh mục `mockFeatures` (id, nhãn, mô tả, mục backlog), nút có nhãn "Sắp có" cạnh "Thêm chương" và trong trạng thái trống, hộp thoại minh họa chung với dữ liệu mẫu cố định (chọn tệp mẫu, quy tắc tách chương, xem trước chương mẫu, nút nhập vô hiệu kèm lý do); không IPC, không đọc tệp, không ghi dữ liệu; test mở/đóng bằng bàn phím không đổi dữ liệu, và test mỗi `id` minh họa có mục trong `delivery/backlog.md`

## 6. Điều hướng và chỗ giữ chỗ editor

- [x] 6.1 `View` thêm `work` (chi tiết) và `chapter` (chỗ giữ chỗ editor có nút về chi tiết); "Mở tác phẩm", mục thanh bên "Tác phẩm gần đây" và breadcrumb tới màn chi tiết
- [x] 6.2 "Tiếp tục" ở thư viện và ở màn chi tiết gọi `chapters:open` rồi tới chương; menu hàng "Tiếp tục dịch chương N" cũng vậy; thư viện tải lại khi quay về

## 7. Kiểm chứng và tài liệu

- [x] 7.1 Chạy trong Electron thật: tác phẩm 2.000 và 5.000 chương (tạo bằng script ngoài repo): đo thời gian mở màn, đổi trang, thêm chương, chuyển vị trí, lọc, nhảy; chụp màn hình các trạng thái chính; ghi số đo vào design và đổi sang ảo hóa nếu không đạt
- [x] 7.2 Kiểm tra bằng bàn phím toàn bộ luồng thêm, đổi tên, chuyển, xóa, sửa thông tin
- [x] 7.3 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `experience/first-run.md`
- [x] 7.4 Giữ `delivery/backlog.md` đúng với giao diện: mọi nút/mục "Sắp có" đang hiển thị đều có mục backlog (trạng thái "Chỉ minh họa"), mục đã triển khai thật thì chuyển trạng thái và gỡ nhãn
