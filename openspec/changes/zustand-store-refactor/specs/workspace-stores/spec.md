## Purpose

Cung cấp kiến trúc quản lý trạng thái tập trung và phản ứng hạt mịn (fine-grained reactivity) cho giao diện desktop bằng các store chuyên biệt theo từng miền nghiệp vụ, đồng bộ trạng thái IPC và tách biệt hoàn toàn khỏi vòng đời linh kiện React.

## ADDED Requirements

### Requirement: Điều hướng và trạng thái giao diện tập trung
Hệ thống UI SHALL quản lý trạng thái màn hình hiện tại (`view`), đóng/mở thanh bên (`sidebarOpen`), chủ đề giao diện (`theme`) và trạng thái màn hình trước khi mở Cài đặt thông qua một store giao diện tập trung (`useUiStore`).

#### Scenario: Chuyển màn hình với cơ chế bảo vệ thay đổi chưa lưu
- **WHEN** người dùng yêu cầu điều hướng sang màn hình khác khi có nội dung chưa lưu trong editor
- **THEN** hệ thống kích hoạt xác nhận rời đi qua LeaveGuard và chỉ cập nhật trạng thái view trong UI store khi người dùng xác nhận tiếp tục

#### Scenario: Đóng màn hình Cài đặt quay lại đúng vị trí cũ
- **WHEN** người dùng mở màn hình Cài đặt và sau đó bấm quay lại
- **THEN** UI store khôi phục lại màn hình đã lưu trong `beforeSettings` hoặc quay về màn hình Thư viện mặc định

### Requirement: Đồng bộ dữ liệu Thư viện và Tác phẩm
Hệ thống SHALL cung cấp `useLibraryStore` để lưu trữ danh sách tác phẩm, các lỗi phát hiện trên đĩa, và các thông báo phản hồi thao tác sao lưu/khôi phục.

#### Scenario: Cập nhật thông tin tác phẩm từ màn hình chi tiết hoặc chương
- **WHEN** một tác phẩm được cập nhật tiêu đề, ảnh bìa, hoặc trạng thái từ bất kỳ thành phần con nào
- **THEN** `useLibraryStore` cập nhật bản ghi tác phẩm tương ứng mà không yêu cầu truyền callback qua các cấp component trung gian

#### Scenario: Tải lại thư viện khi có yêu cầu
- **WHEN** hành động reload được kích hoạt từ giao diện hoặc sau khi phục hồi bản sao lưu
- **THEN** store gọi IPC `window.mira.library.list` và cập nhật danh sách tác phẩm mới nhất vào bộ nhớ

### Requirement: Chia sẻ danh sách chương của tác phẩm đang hoạt động
Hệ thống SHALL duy trì danh sách chương của tác phẩm hiện tại qua `useChapterStore`, cho phép cả màn hình danh sách chương và thanh điều hướng chương của Editor cùng truy xuất và đồng bộ một nguồn sự thật.

#### Scenario: Mở tác phẩm và nạp danh sách chương
- **WHEN** người dùng mở một tác phẩm cụ thể
- **THEN** `useChapterStore` nạp danh sách chương từ IPC và cung cấp cho cả `ChaptersArea` và `ChapterNavSidebar`

#### Scenario: Đổi tên hoặc sắp xếp lại chương
- **WHEN** người dùng đổi tên chương hoặc di chuyển thứ tự chương trong thanh bên
- **THEN** thay đổi được lưu xuống kho qua IPC và danh sách chương trong store tự động cập nhật phản ánh đúng vị trí mới

### Requirement: Đệm cấu hình kết nối AI toàn cục
Hệ thống SHALL lưu trữ danh sách kết nối AI, khóa truy cập và danh mục mục model qua `useConnectionStore` để phục vụ đồng thời cho màn hình Cài đặt, menu chọn model trong Chat và hộp thoại Dịch chương.

#### Scenario: Truy cập danh sách model từ nhiều thành phần giao diện
- **WHEN** người dùng mở menu chọn model tại panel Hỏi AI hoặc hộp thoại Dịch chương
- **THEN** các thành phần đọc danh sách mục model trực tiếp từ `useConnectionStore` mà không cần gọi lại IPC lấy danh sách kết nối

### Requirement: Độc lập hóa phiên trò chuyện và dòng chảy dữ liệu AI
Hệ thống SHALL duy trì phiên hội thoại AI, trạng thái streaming chunks và các đề xuất chỉnh sửa văn bản qua `useAiChatStore`, tách biệt bộ lắng nghe IPC khỏi vòng đời hiển thị của component `AiPanel`.

#### Scenario: Giữ nguyên tiến trình stream khi ẩn thanh bên hoặc chuyển tab
- **WHEN** AI đang tạo nội dung trả lời (streaming chunk) và người dùng tạm thời ẩn panel hoặc chuyển chế độ Focus
- **THEN** các chunk dữ liệu từ kênh IPC tiếp tục được ghi nhận vào `useAiChatStore` mà không bị gián đoạn hay mất dữ liệu khi mở lại panel

### Requirement: Cô lập trạng thái văn bản biên tập khỏi Zustand
Hệ thống SHALL KHÔNG lưu trữ chuỗi văn bản thô, lịch sử undo/redo và selections của trình soạn thảo trong bất kỳ Zustand store nào, mà giữ nguyên vẹn trong `EditorState` của CodeMirror 6 để đảm bảo hiệu năng gõ phím.

#### Scenario: Người dùng gõ phím liên tục với bộ gõ tiếng Việt
- **WHEN** người dùng gõ văn bản nhanh với bộ gõ Telex/VNI trong pane bản dịch
- **THEN** các giao dịch soạn thảo chỉ diễn ra cục bộ trong CodeMirror 6 và không kích hoạt re-render ngoài ý muốn trên các component đăng ký Zustand
