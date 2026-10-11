## Purpose

Quản lý nạp chương thưa từ catalog raw, đảm bảo trật tự tương đối hai chiều bảo toàn theo ordinal key, hỗ trợ tải chọn lọc theo dải qua backend job, cho phép khôi phục trật tự chuẩn theo nguồn raw và cung cấp điều hướng qua khoảng khuyết mượt mà trong màn soạn thảo.

## ADDED Requirements

### Requirement: Bi-directional relative ordinal insertion for downloaded chapters
Hệ thống SHALL xác định vị trí chèn (`position`) của chương được tải từ catalog dựa trên trật tự hai chiều (tiền nhiệm $P$ và kế nhiệm $S$) của các mục catalog đã tải thuộc cùng binding, đảm bảo các chương tải sau không làm đảo lộn thứ tự, không đè lên các chương dẫn nhập thủ công, và ưu tiên bám theo tiền nhiệm khi phát hiện người dùng đã tự đảo ngược vị trí mốc kẹp.

#### Scenario: Tải chương ngược thứ tự thời gian
- **WHEN** người dùng tải Chương 10 trước (nằm ở vị trí 0), sau đó tải tiếp Chương 1
- **THEN** hệ thống xác định Chương 10 là kế nhiệm $S$, chèn Chương 1 vào vị trí 0 và tự động dịch chuyển Chương 10 sang vị trí 1

#### Scenario: Bảo toàn chương dẫn nhập thủ công khi nạp thưa
- **WHEN** tác phẩm có chương thủ công "Lời mở đầu" ở vị trí 0 và Chương 10 ở vị trí 1, người dùng tải tiếp Chương 5
- **THEN** hệ thống chèn Chương 5 vào vị trí 1 (ngay trước kế nhiệm Chương 10) và dịch chuyển Chương 10 sang vị trí 2, giữ nguyên "Lời mở đầu" ở vị trí 0

#### Scenario: Tải chương xen vào giữa khoảng khuyết
- **WHEN** tác phẩm đã có Chương 1 (vị trí 0) và Chương 10 (vị trí 1), người dùng tải tiếp Chương 5
- **THEN** hệ thống chèn Chương 5 vào vị trí 1 (sau tiền nhiệm Chương 1 và trước kế nhiệm Chương 10) và dịch chuyển Chương 10 sang vị trí 2

#### Scenario: Xử lý khi người dùng đã tự đảo ngược vị trí hai mốc kẹp
- **WHEN** người dùng đã kéo Chương 10 lên vị trí 0 và Chương 1 ra vị trí 1, sau đó tải tiếp Chương 5
- **THEN** hệ thống phát hiện $P.position \ge S.position$, ưu tiên bám theo tiền nhiệm Chương 1 và chèn Chương 5 ngay sau Chương 1 (tại vị trí 2)

### Requirement: Reorder chapters by source catalog order
Hệ thống SHALL cho phép người dùng khôi phục trật tự toàn bộ danh sách chương theo đúng `ordinal_key` của nguồn raw đã liên kết, đồng thời bảo toàn các chương thủ công không thuộc nguồn raw.

#### Scenario: Khôi phục trật tự danh mục gốc
- **WHEN** danh sách chương bị xáo trộn do thao tác thủ công, người dùng chọn "Sắp xếp theo nguồn raw" và xác nhận
- **THEN** hệ thống thực thi transaction sắp xếp lại toàn bộ các chương đã gắn kết theo thứ tự tăng dần của `ordinal_key`, đánh lại chỉ số `position` liên tục từ 0 đến $N-1$

### Requirement: Backend-driven multi-chapter and range download
Hệ thống SHALL cung cấp API tải hàng loạt hoặc theo dải (ví dụ `1, 5, 10-25`) xử lý ở Main process, truy vấn trực tiếp cơ sở dữ liệu `source_catalog_item` độc lập với phân trang hiển thị của giao diện và báo cáo tiến độ tuần tự qua sự kiện IPC.

#### Scenario: Nhập dải chương hợp lệ và tải tuần tự
- **WHEN** người dùng nhập dải `10-15` trong công cụ chọn nhanh của danh mục
- **THEN** hệ thống truy vấn các mục catalog tương ứng trong database, lần lượt tải từng chương tuân thủ rate-limit 1 req/giây, lưu từng chương vào DB và phát sự kiện tiến độ

#### Scenario: Đóng giao diện trong lúc tải
- **WHEN** người dùng bắt đầu tiến trình tải dải chương rồi đóng modal danh mục hoặc chuyển sang tác phẩm khác
- **THEN** tiến trình tải ở Main process vẫn tiếp tục thực thi an toàn mà không bị hủy lỗi do DOM unmount

### Requirement: Non-drifting multi-source matching with character normalization
Hệ thống SHALL chuẩn hóa ký tự số full-width và so khớp nguồn raw với các chương Mira dựa trên số hiệu trích xuất nghiêm ngặt từ tiêu đề chương, có tầng fallback an toàn khi tiêu đề không chứa số hiệu.

#### Scenario: So khớp số full-width tiếng Nhật
- **WHEN** nguồn Kakuyomu có chương với tiêu đề `第１０話　旅立ち`, tác phẩm Mira có chương với tiêu đề `Chương 10: Khởi hành`
- **THEN** hệ thống chuẩn hóa chữ số full-width `１０` thành `10` và tự động ghép nối với độ tin cậy cao

#### Scenario: Tránh bắt nhầm số lượng và năm trong tiêu đề
- **WHEN** tác phẩm có chương với tiêu đề `2024: Khởi đầu mới` và `3 cô gái nhỏ`
- **THEN** hệ thống không tự động coi `2024` hay `3` là số thứ tự chương nếu không có tiền tố chỉ số chương rõ ràng

#### Scenario: Fallback khi tiêu đề không chứa số
- **WHEN** danh sách chương trong Mira chỉ có tiêu đề chữ như `Khởi hành`, `Tái ngộ`
- **THEN** hệ thống đối chiếu theo thứ tự tương đối của danh mục và hiển thị trên màn hình xem trước để người dùng xác nhận, không đánh dấu lỗi toàn bộ

### Requirement: Visual gap indicators and unified chapter numbering
Hệ thống SHALL loại bỏ tiền tố số thứ tự lặp lại `{chapter.number}.` khi tiêu đề chương đã tự định danh số hiệu, hỗ trợ nhảy chương (Jump) linh hoạt theo cả số danh sách lẫn số tiêu đề, và hiển thị thanh ngăn cách khoảng khuyết giữa các chương cách quãng.

#### Scenario: Loại bỏ tiền tố số lặp trong tiêu đề chương
- **WHEN** chương có tiêu đề `Chương 10: Khởi hành` và đứng ở vị trí đầu tiên trong danh sách Mira (`position = 0, number = 1`)
- **THEN** thanh điều hướng và bảng danh sách chương hiển thị nhãn `Chương 10: Khởi hành` thay vì `1. Chương 10: Khởi hành`

#### Scenario: Nhảy chương thông minh theo số tiêu đề
- **WHEN** tác phẩm chỉ có Chương 10 ở vị trí danh sách 1, người dùng gõ `10` vào ô tìm kiếm/nhảy chương
- **THEN** hệ thống nhận diện số 10 từ tiêu đề và chuyển tiêu điểm tới đúng Chương 10

#### Scenario: Hiển thị chỉ báo khoảng khuyết
- **WHEN** danh sách chương có Chương 2 và tiếp theo là Chương 10
- **THEN** giao diện hiển thị thanh ngăn cách thông báo khuyết 7 chương giữa Chương 2 và Chương 10

### Requirement: In-editor gap-aware navigation
Hệ thống SHALL cung cấp phím tắt chuyển chương trong màn soạn thảo (`Alt+Down` cho chương kế, `Alt+Up` cho chương trước); khi phát hiện khoảng khuyết mà nguồn raw có chương liền kề chưa nạp, hệ thống SHALL hiển thị lựa chọn cho người dùng tải & mở chương liền kề hoặc bỏ qua để mở chương có sẵn tiếp theo.

#### Scenario: Điều hướng gặp khoảng khuyết và lựa chọn tải chương liền kề
- **WHEN** người dùng đang soạn thảo ở Chương 1 và bấm `Alt+Down`, trong khi tác phẩm chỉ có sẵn tiếp theo là Chương 10 nhưng bản raw có Chương 2 chưa tải
- **THEN** hệ thống hiển thị thông báo lựa chọn: cho phép tải & mở ngay Chương 2 từ bản raw hoặc tiếp tục chuyển sang Chương 10
