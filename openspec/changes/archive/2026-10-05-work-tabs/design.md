## Context

Xem [proposal](proposal.md) về mục tiêu và [đặc tả tab](specs/work-tabs/spec.md) về hành vi. `uiStore` hiện chỉ có một `view`; `App` dựng một màn tại một thời điểm. `WorkDetailScreen` giữ khu vực bằng state cục bộ và bắt đầu từ Chương mỗi lần dựng. `LeaveGuard` chỉ đăng ký một editor. `chapterStore` và `aiChatStore` đang giữ một `workId` hoạt động; riêng chat có listener nhận chunk ở cấp ứng dụng. Thanh tiêu đề Electron cao 42 px và dành mép phải cho nút cửa sổ.

## Goals / Non-Goals

**Goals:**

- Tách trạng thái điều hướng bền của từng tác phẩm khỏi màn toàn ứng dụng và khỏi dữ liệu nội dung `.mira`.
- Giữ `EditorState` của chương đang sửa trong phiên chạy, kể cả khi tab mất focus; mọi thao tác đóng/thoát đều xét đúng tab.
- Ngăn dữ liệu chương, phiên AI và kết quả bất đồng bộ của truyện A hiển thị trong truyện B.

**Non-Goals:**

- Nhiều tab cho cùng một tác phẩm, tab riêng từng chương, chia pane hay cửa sổ nổi.
- Lưu bền bản nháp chưa lưu sau crash; khả năng này cần thiết kế autosave riêng.
- Chạy, dừng hoặc phục hồi job trong renderer; đó là Module 7.

## Decisions

### 1. Tab là đối tượng định danh bằng `workId`

Trạng thái workspace gồm danh sách có thứ tự `{workId, location}`, `activeWorkId` và màn toàn ứng dụng (`library`/`create`/`settings`). `location` là màn chi tiết kèm `areaId`, hoặc một `chapterId`; không lưu cả object tác phẩm hay số thứ tự chương. Mọi lối mở truyện và chương đi qua cùng hành động điều hướng: mở tab mới nếu cần, hoặc kích hoạt tab có sẵn rồi cập nhật vị trí theo ý định người dùng. Đường quay về tác phẩm trong một tab chỉ đổi `location` của tab đó. Cài đặt quay lại đúng bối cảnh trước khi mở.

Phương án một `View` toàn cục cộng hàng tab đã loại vì không giữ được vị trí riêng. Phương án tab theo chương đã loại vì tăng số tab nhanh với truyện dài và trùng điều hướng chương hiện có.

### 2. Trạng thái tab lưu ở kho cấp ứng dụng

Main lưu một bản ghi workspace có version trong `library.db` qua IPC có kiểu. Mỗi cập nhật thứ tự, tab hoạt động hoặc `location` được tuần tự hóa và ghi trước khi coi là hoàn tất; lỗi lưu hiển thị thông báo nhưng không ngăn đọc/sửa tác phẩm. Khi nạp, loại ID tác phẩm/chương không còn; chỉ phục hồi tab hợp lệ và đưa chương mất về màn chi tiết. Nội dung truyện tiếp tục ở từng tệp `.mira`.

Phương án lưu vào `.mira` đã loại vì bố cục cửa sổ là lựa chọn của người dùng trên máy, không thuộc nội dung tác phẩm hay bản sao lưu từng truyện. `localStorage` ít phù hợp với hợp đồng lưu bền, kiểm tra schema và lỗi phục hồi vốn đã đi qua Main/SQLite.

### 3. Giữ editor đang mở và tách trạng thái theo truyện

Mỗi tab có một host ổn định trong cây React; tab ẩn không thể nhận focus hoặc thao tác nhưng editor của tab còn bản sửa vẫn giữ `EditorState`, selection và undo. Tab sạch có thể giải phóng màn nặng rồi dựng lại từ SQLite khi được chọn; điều kiện giải phóng dựa trên trạng thái dirty, không dựa riêng vào tab không hoạt động. `WorkDetailScreen` nhận và ghi `areaId` từ location của tab thay vì giữ state không bền.

`chapterStore` và `aiChatStore` cần dữ liệu theo `workId` hoặc một lớp instance theo tab. Các lệnh thay đổi chương truyền `workId` rõ ràng; phản hồi IPC/stream xác định đúng `workId`/`requestId` trước khi cập nhật. Lịch sử phiên vẫn đọc từ kho khi cần. Không nhân bản một phiên chat toàn cục sang các tab.

Phương án tháo toàn bộ tab ẩn đã loại vì làm mất bản sửa và undo. Phương án giữ mọi editor sạch lẫn bẩn luôn mounted đơn giản hơn nhưng có thể giữ quá nhiều CodeMirror/DOM khi mở nhiều truyện.

### 4. Guard theo tab, chuyển tab không đồng nghĩa rời editor

Registry guard chuyển từ một mục sang tập theo `workId` và editor/chương. Chuyển tab chỉ đổi focus; đóng tab kiểm tra guard của tab đó, điều hướng rời chương trong cùng tab kiểm tra guard chương đó, còn đóng cửa sổ kiểm tra toàn bộ dirty guards. Quy trình lưu/ở lại/bỏ thay đổi chỉ đóng khi các guard liên quan trả kết quả thành công; thất bại giữ nguyên tab và dữ liệu. Guard của màn ẩn vẫn đăng ký. Các đường `beforeunload` và đóng cửa sổ Electron phải dùng cùng nguồn dirty để không bỏ sót tab ẩn.

Phương án hỏi lưu mỗi lần chuyển tab đã loại vì biến tab thành điều hướng rời màn và không đáp ứng cảm giác làm việc liên tục mà người dùng đã chọn.

### 5. Thanh tab dùng phần an toàn của titlebar

Đặt tab trong vùng giữa logo và hành động toàn ứng dụng, trước phần dành cho window controls overlay. Mỗi tab có tên rút gọn, tooltip/tên truy cập đầy đủ, trạng thái chọn và nút đóng; danh sách cuộn ngang khi chật. Phím Ctrl+Tab/Ctrl+Shift+Tab chỉ được xử lý nếu control/editor gần hơn chưa nhận phím. Khi tab ẩn, nội dung phải bị loại khỏi thứ tự focus. Khu vực bên trong tác phẩm tiếp tục dùng `WorkAreaHost`.

Phương án thêm một hàng cố định dưới titlebar đã loại vì giảm chiều cao editor trên cửa sổ nhỏ; có thể xem lại sau kiểm thử giao diện thực nếu vùng titlebar quá chật.

## Risks / Trade-offs

- [Nhiều editor giữ trong bộ nhớ] → Chỉ giữ host nặng của tab dirty; kiểm thử nhiều tab và chương dài trước nghiệm thu.
- [Phản hồi async đến sau khi đổi tab] → Khóa cập nhật theo `workId`, `chapterId` hoặc `requestId`; kiểm thử stream và tải chương xen kẽ.
- [Lưu workspace thất bại hoặc trạng thái cũ] → Bản ghi có version, đọc có kiểm tra, rơi về Thư viện; lỗi hiển thị mà không sửa nội dung truyện.
- [Crash mất bản nháp chưa lưu] → Nêu rõ giới hạn; guard bao phủ đóng tab/thoát bình thường. Autosave là change khác.
- [Nội dung tab ẩn vẫn nhận focus/sự kiện] → Dùng thuộc tính ẩn/inert phù hợp và kiểm thử bàn phím, screen reader.

## Migration Plan

1. Thêm schema và IPC lưu workspace cấp ứng dụng; bản cài cũ không có bản ghi sẽ mở Thư viện với không tab.
2. Chuyển điều hướng hiện tại sang state theo tab, giữ đường mở từ Thư viện/Chương/Cài đặt.
3. Đổi guard và store phụ thuộc `workId`, sau đó dựng thanh tab và phục hồi phiên.
4. Nếu phải quay lại bản cũ, bản ghi workspace mới có thể bị bỏ qua; dữ liệu `.mira` và tác vụ không đổi.
