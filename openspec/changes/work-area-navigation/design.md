## Context

Xem lý do ở [proposal](proposal.md) và hành vi ở [spec](specs/work-area-navigation/spec.md). `App.tsx` hiện giữ điều hướng trong `View`; `work-detail-screen` đang chuẩn bị thay `PendingScreen` bằng màn Chương, chưa có trang dữ liệu cho các tài nguyên khác. [Scope](../../../docs/handbook/product/scope.md) đặt job dịch/raw một chương trước glossary, xưng hô, rồi nhiều nguồn và văn phong. Bản vẽ năm tab trong [nghiên cứu](../../../docs/handbook/research/work-detail-screen.md) là mockup cũ, không phải trạng thái code.

## Goals / Non-Goals

**Goals:** Có một hợp đồng điều hướng ổn định cho bốn khu vực; thêm màn tính năng về sau mà không phải sửa lại cấu trúc cấp tác phẩm; bảo đảm không xuất hiện tab rỗng, không lẫn `workId`, dùng được bằng bàn phím và ở 940 px.

**Non-Goals:** Tạo bảng dữ liệu/IPC cho glossary, xưng hô, nguồn raw, job dịch; dựng trang giả để lấp tab; thay đổi phân trang chương hoặc thứ tự roadmap S1–S3.

## Decisions

### D1. Khung tác phẩm dùng danh mục khu vực có điều kiện

Khung (đầu trang tác phẩm tách khỏi vùng nội dung, `WorkAreaHost`) do `work-detail-screen` dựng. Danh mục khai báo thứ tự cố định `chapters → context → sources → jobs`; mỗi mục có nhãn, trạng thái sẵn sàng và renderer của màn thật. Danh mục sản phẩm chỉ đăng ký màn đã hoàn chỉnh ở mức người dùng thao tác được, kể cả khi tác phẩm chưa có dữ liệu (màn có empty state và hành động). `context` chỉ sẵn sàng khi có ít nhất một màn con; danh mục con theo thứ tự `glossary → pronouns → style`. Chỉ Chương có mặt lúc M0 nên khung không vẽ thanh tab. Khi có khu vực thứ hai, thanh điều hướng xuất hiện và lọc các mục đã đăng ký.

Phương án khác: vẽ đủ bốn tab rồi disable/chuyển tới `PendingScreen`. Cách đó tạo lời hứa tính năng không dùng được và tăng số bước vô ích; bỏ.

### D2. Điều hướng trong phạm vi tác phẩm, không gắn dữ liệu tạm vào storage

`View` vẫn xác định tác phẩm và chương. Chọn khu vực/mục con là trạng thái màn chi tiết của đúng `workId`; khi từ thư viện mở tác phẩm hoặc từ chương quay về, khởi tạo ở Chương. Trạng thái phân trang/lọc của Chương có thể giữ trong bộ nhớ khi chỉ đổi khu vực trong cùng phiên xem, nhưng không được lưu bền như tiến độ dịch. Mỗi màn con nhận `workId` trực tiếp từ khung, không lấy ngầm từ mục thư viện đang chọn. Khu vực sẵn sàng nhưng tác phẩm chưa có dữ liệu phải hiện empty state của chính màn đó.

Phương án khác: lưu tab cuối trong `.mira` hoặc mở lại tab cuối toàn app. Không có nhu cầu đã chốt, tạo thêm dữ liệu và có thể đưa người dùng vào một mục không còn sẵn sàng sau nâng cấp/hạ cấp; mặc định Chương.

### D3. Thứ tự mở tính năng đi theo scope, không theo số tab

Change `work-detail-screen` chỉ sở hữu Chương và vẫn không cần tab. Khi một change sau tạo màn `Tác vụ`, `Nguồn` hoặc một mục của `Ngữ cảnh`, change đó phải đăng ký vào danh mục sau khi hoàn tất dữ liệu, thao tác, lỗi và trạng thái trống. `Nguồn` cấp tác phẩm cần màn làm việc quản lý raw, không chỉ một nút nhập tệp trong editor chương. `Tác vụ` cần màn xem/xử lý job của tác phẩm, không chỉ tiến trình nhỏ trong editor. `Văn phong` không được hiện sớm chỉ vì đã có đoạn dịch cũ nếu chưa có chức năng xem/quản lý văn phong.

Phương án khác: triển khai đồng loạt toàn bộ khu vực trong change này. Nó vượt phạm vi IA và trái thứ tự một chương xuyên suốt trước của scope.

### D4. Tab thật và focus

Thanh khu vực dùng thành phần tab accessible theo design system/Base UI khi có từ hai mục; nhãn hiện trong vùng tab, panel tương ứng có trạng thái được chọn. Mục con Ngữ cảnh dùng cùng quy tắc và không cần thanh cấp hai nếu chỉ có một mục. Ở 940 px, thanh có thể cuộn trong chính nó hoặc xuống dòng mà không làm cả trang tràn ngang; kiểm tra thứ tự focus và tên đọc được. Khi đổi khu vực, đưa focus tới tiêu đề hoặc nội dung đầu của panel để người dùng bàn phím nhận biết đã chuyển.

Phương án khác: dùng các nút không có quan hệ tab/panel; phải tự bổ sung nhiều hành vi accessibility, dễ thiếu trạng thái đang chọn.

## Risks / Trade-offs

- Danh mục được thêm nhưng màn chưa có thao tác thật → chỉ đăng ký sau nghiệm thu màn con và test case empty state; review change tính năng phải kiểm tra điều này.
- Feature rollout ở nhiều mốc khiến số tab thay đổi → thứ tự cố định, chỉ chèn mục đã sẵn sàng; không đổi nhãn theo dữ liệu từng tác phẩm.
- Lưu trạng thái màn trong renderer có thể mất khi rời màn → chấp nhận; mặc định Chương khi mở lại được nói rõ trong spec.
- Hai cấp tab có thể chật ở 940 px → chỉ hiện thanh cấp hai trong Ngữ cảnh, kiểm tra layout/focus ở cỡ cửa sổ yêu cầu.

## Migration Plan

Không đổi dữ liệu hay IPC. Sau khi `work-detail-screen` có màn thật, tách khung/đăng ký Chương và giữ giao diện một khu vực như cũ. Những change tính năng về sau thêm màn vào danh mục khi sẵn sàng. Nếu cần hoàn tác khung, trả màn Chương về route cũ; dữ liệu tác phẩm không bị ảnh hưởng.
