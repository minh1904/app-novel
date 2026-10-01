# work-detail Specification

## Purpose
Định nghĩa màn chi tiết một tác phẩm: khung màn, thông tin tác phẩm, danh sách chương và đường đi tiếp vào chương đang làm. Đây là điểm vào của mọi việc dịch thuật trên một tác phẩm. Chương ở giai đoạn này chỉ là mục trong danh sách (số thứ tự, tên); văn bản gốc/dịch nằm ở change sau. Các khu vực dài hạn (Ngữ cảnh, Nguồn, Tác vụ) gắn vào khung này khi có màn thật, theo [work-area-navigation](../../changes/work-area-navigation/proposal.md).

## Requirements

### Requirement: Mở màn chi tiết từ thư viện

Người dùng SHALL mở màn chi tiết của một tác phẩm bằng "Mở tác phẩm" ở danh sách, bằng mục "Tác phẩm gần đây" của thanh bên, hoặc bằng "Tiếp tục" (xem yêu cầu Tiếp tục chương gần nhất). Từ màn chi tiết, người dùng SHALL quay về thư viện bằng liên kết "Thư viện" ở đầu trang. Khi quay về, thư viện SHALL hiển thị số chương và thời điểm sửa mới nhất. Nếu tác phẩm không còn (bị xóa hoặc tệp không mở được), màn SHALL báo rõ lý do bằng lời dễ hiểu và cho quay về thư viện thay vì hiển thị trống hay lỗi kỹ thuật thô.

#### Scenario: Mở từ danh sách
- **WHEN** người dùng bấm "Mở tác phẩm" trên một hàng của thư viện
- **THEN** màn chi tiết của tác phẩm đó hiện ra với đúng thông tin và danh sách chương

#### Scenario: Tác phẩm không mở được
- **WHEN** tệp tác phẩm bị hỏng hoặc bị xóa ngoài ứng dụng trong lúc màn đang mở
- **THEN** màn hiển thị lý do bằng lời dễ hiểu và có nút về thư viện

### Requirement: Khung màn gồm đầu trang tác phẩm và vùng nội dung theo khu vực

Màn chi tiết SHALL gồm hai phần độc lập: đầu trang tác phẩm (breadcrumb, thông tin, hành động của tác phẩm) và vùng nội dung của khu vực đang chọn. Vùng nội dung SHALL lấy các khu vực từ một danh mục có thứ tự mà màn khác có thể đăng ký vào sau này mà không phải sửa đầu trang, điều hướng hay màn Chương. Khi danh mục chỉ có một khu vực, màn SHALL hiển thị khu vực đó trực tiếp, không vẽ thanh tab một mục. Khi danh mục có từ hai khu vực, màn SHALL hiển thị thanh khu vực dạng tab, đánh dấu khu vực đang chọn. Một khu vực chưa có chức năng thật MAY được đăng ký dưới dạng minh họa (xem yêu cầu về tính năng chưa triển khai); khu vực ấy SHALL mang nhãn "Sắp có" ngay trên tab và SHALL NOT dẫn tới màn giữ chỗ trống hay báo lỗi. Mỗi khu vực SHALL nhận `workId` từ khung (không lấy ngầm từ mục thư viện đang chọn); lỗi hay trạng thái tải của một khu vực SHALL không làm hỏng đầu trang hay khu vực khác. Mỗi lần mở màn chi tiết từ thư viện hoặc quay về từ chương SHALL bắt đầu ở Chương; chọn khu vực không ghi dữ liệu và trạng thái tạm của khu vực (bộ lọc, trang) chỉ giữ trong phiên xem màn hiện tại.

#### Scenario: Chỉ có Chương
- **WHEN** ứng dụng chỉ đăng ký khu vực Chương
- **THEN** danh sách chương hiện ngay dưới đầu trang và không có thanh tab hay tab vô hiệu

#### Scenario: Có thêm một khu vực
- **WHEN** một khu vực thứ hai được đăng ký vào danh mục
- **THEN** thanh tab xuất hiện với Chương trước, đầu trang không đổi và khu vực mới nhận đúng `workId`

#### Scenario: Khu vực lỗi
- **WHEN** nội dung của một khu vực không tải được
- **THEN** lỗi chỉ hiện trong vùng nội dung của khu vực đó, đầu trang và các khu vực khác vẫn dùng được

### Requirement: Hiển thị thông tin tác phẩm

Đầu trang SHALL hiển thị ảnh bìa (hoặc ký hiệu ngôn ngữ nguồn khi không có), tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả, ngôn ngữ nguồn → Việt, trạng thái, số chương và thời điểm sửa gần nhất. Trường tùy chọn để trống SHALL không chiếm chỗ hay hiện nhãn trống. Mô tả dài SHALL được thu gọn và mở rộng được.

#### Scenario: Tác phẩm đầy đủ thông tin
- **WHEN** tác phẩm có đủ tên gốc, tác giả, thể loại, mô tả và bìa
- **THEN** tất cả hiển thị ở đầu trang, đúng nội dung đã nhập

#### Scenario: Tác phẩm tối thiểu
- **WHEN** tác phẩm chỉ có tên và ngôn ngữ nguồn
- **THEN** đầu trang chỉ hiển thị tên, ngôn ngữ, trạng thái và số chương, không có dòng hay nhãn trống

### Requirement: Sửa thông tin tác phẩm

Người dùng SHALL sửa tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả và ảnh bìa từ màn chi tiết, dùng cùng quy tắc kiểm tra như khi tạo. Ngôn ngữ nguồn SHALL hiển thị nhưng không sửa được. Thông tin và ảnh bìa SHALL được lưu nguyên tử trong một lần lưu. Lưu thất bại SHALL giữ nguyên dữ liệu cũ và giữ lại những gì người dùng đã nhập trong form để thử lại. Hủy SHALL không đổi gì.

#### Scenario: Sửa thành công
- **WHEN** người dùng đổi tác giả và thể loại rồi lưu
- **THEN** đầu trang cập nhật ngay, thời điểm sửa đổi mới, và thư viện hiển thị giá trị mới

#### Scenario: Xóa một trường tùy chọn
- **WHEN** người dùng xóa hết nội dung ô tác giả rồi lưu
- **THEN** tác phẩm không còn tác giả và dòng đó biến mất khỏi màn chi tiết và thư viện

#### Scenario: Tên không hợp lệ
- **WHEN** người dùng xóa hết tên rồi lưu
- **THEN** không lưu, form báo lỗi tại trường tên và giữ nguyên các thay đổi khác đã nhập

#### Scenario: Lưu thông tin kèm bìa thất bại
- **WHEN** người dùng đổi tác giả và chọn bìa mới, nhưng việc lưu thất bại
- **THEN** cả tác giả lẫn bìa của tác phẩm giữ nguyên như cũ và form còn nội dung vừa nhập

### Requirement: Đổi trạng thái và lưu trữ từ màn chi tiết

Người dùng SHALL tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ, đổi hoặc gỡ bìa tác phẩm từ menu của màn chi tiết với cùng hành vi như ở thư viện. Tác phẩm đã lưu trữ SHALL vẫn mở và xem được ở màn chi tiết, kèm nhãn "Đã lưu trữ".

#### Scenario: Lưu trữ từ màn chi tiết
- **WHEN** người dùng chọn Lưu trữ trong menu của màn chi tiết
- **THEN** tác phẩm chuyển sang mục Lưu trữ ở thư viện, màn chi tiết hiển thị nhãn "Đã lưu trữ" và các chương vẫn còn nguyên

### Requirement: Tiếp tục chương gần nhất

Hệ thống SHALL ghi nhớ chương làm việc gần nhất của mỗi tác phẩm: đó là chương người dùng mở gần đây nhất. Nút chính "Tiếp tục" ở màn chi tiết và ở thư viện SHALL đưa người dùng tới chương đó. Khi tác phẩm chưa có chương nào, nút chính SHALL là "Thêm chương" và "Tiếp tục" SHALL không hiển thị. Khi chương gần nhất bị xóa, hệ thống SHALL quên nó thay vì trỏ vào chương không tồn tại. Khi người dùng mở chương của một tác phẩm đang ở trạng thái "Chưa bắt đầu", trạng thái SHALL chuyển thành "Đang dịch"; trạng thái "Tạm dừng" SHALL giữ nguyên vì đó là lựa chọn có chủ ý của người dùng.

#### Scenario: Có chương gần nhất
- **WHEN** người dùng đã mở chương 3 rồi quay lại màn chi tiết hoặc thư viện và bấm "Tiếp tục"
- **THEN** ứng dụng mở chương 3

#### Scenario: Mở chương đầu tiên
- **WHEN** người dùng mở một chương của tác phẩm đang ở trạng thái "Chưa bắt đầu"
- **THEN** trạng thái thành "Đang dịch" và khung "Tiếp tục" của thư viện hiển thị tác phẩm này

#### Scenario: Mở chương của tác phẩm tạm dừng
- **WHEN** người dùng mở một chương của tác phẩm đang "Tạm dừng"
- **THEN** chương gần nhất được cập nhật nhưng trạng thái vẫn là "Tạm dừng"

#### Scenario: Chưa có chương
- **WHEN** tác phẩm chưa có chương nào
- **THEN** màn chi tiết hiển thị "Thêm chương" là hành động chính và không có nút "Tiếp tục"

#### Scenario: Chương gần nhất bị xóa
- **WHEN** người dùng xóa chương đang là chương gần nhất
- **THEN** "Tiếp tục" không còn trỏ vào chương đó và không có lỗi

### Requirement: Mở một chương

Người dùng SHALL mở một chương bằng cách bấm tên chương hoặc nhấn Enter khi hàng đang được chọn. Việc mở SHALL ghi chương đó là chương gần nhất (theo yêu cầu Tiếp tục chương gần nhất) trước khi chuyển màn. Chương mở ra SHALL hiển thị màn chương (đặc tả `chapter-screen`), kèm đường quay về màn chi tiết của cùng tác phẩm. Việc mở chương thất bại SHALL báo lỗi và ở lại màn chi tiết.

#### Scenario: Mở chương từ danh sách
- **WHEN** người dùng bấm tên chương 7
- **THEN** màn chương 7 hiện ra, và quay về sẽ tới màn chi tiết của cùng tác phẩm với "Tiếp tục" trỏ vào chương 7

#### Scenario: Chương lỗi khi mở
- **WHEN** việc ghi chương gần nhất thất bại lúc mở chương
- **THEN** màn chi tiết báo lỗi và người dùng vẫn ở màn chi tiết

### Requirement: Chương có thứ tự và số thứ tự suy ra từ vị trí

Mỗi tác phẩm SHALL có danh sách chương có thứ tự. Số thứ tự hiển thị của một chương SHALL suy ra từ vị trí hiện tại (bắt đầu từ 1) và SHALL NOT được lưu cứng; mỗi chương SHALL có định danh ổn định không đổi khi đổi tên hay vị trí. Tên chương là văn bản một dòng tự do, có thể để trống; chương không tên SHALL hiển thị là "Chương N". Việc đánh số theo nguồn (ví dụ bắt đầu từ chương 101, hay "Ngoại truyện") SHALL do người dùng ghi trong tên chương.

#### Scenario: Chương không tên
- **WHEN** người dùng thêm một chương mà không nhập tên
- **THEN** chương hiển thị là "Chương N" với N là vị trí của nó

#### Scenario: Số thứ tự đổi theo vị trí
- **WHEN** người dùng chuyển chương 5 lên trước chương 2
- **THEN** chương đó hiển thị là số 2, các chương 2–4 cũ thành 3–5, và thứ tự này còn nguyên sau khi mở lại ứng dụng

### Requirement: Thêm chương

Người dùng SHALL thêm chương mới vào cuối danh sách chỉ bằng một thao tác, có thể nhập tên ngay hoặc để trống. Thêm liên tiếp nhiều chương SHALL nhanh và không cần rời bàn phím. Chương mới SHALL được lưu bền trước khi hiển thị là đã thêm. Sau khi thêm, danh sách SHALL xóa bộ lọc đang bật nếu cần, chuyển tới trang chứa chương mới và làm nổi bật chương đó; focus SHALL ở lại ô nhập để thêm tiếp, và việc thêm SHALL được thông báo cho công nghệ hỗ trợ.

#### Scenario: Thêm một chương có tên
- **WHEN** người dùng nhập "Cuộc gặp gỡ" rồi xác nhận thêm chương
- **THEN** chương "Cuộc gặp gỡ" xuất hiện ở cuối danh sách với số thứ tự đúng và còn nguyên sau khi mở lại ứng dụng

#### Scenario: Thêm liên tiếp
- **WHEN** người dùng thêm năm chương liên tiếp mà không nhập tên
- **THEN** có thêm năm chương "Chương N" đúng thứ tự, không trùng, không thiếu

### Requirement: Đổi tên chương

Người dùng SHALL đổi tên chương tại chỗ, từ menu của chương hoặc bằng phím F2 khi đang ở tên chương. Tên được cắt khoảng trắng hai đầu, xuống dòng được thay bằng khoảng trắng, tối đa 200 ký tự, và tên rỗng SHALL đưa chương về dạng "Chương N". Đổi tên SHALL không ảnh hưởng vị trí hay dữ liệu khác của chương. Hủy đổi tên SHALL giữ tên cũ.

#### Scenario: Đổi tên rồi xóa tên
- **WHEN** người dùng đổi tên chương thành "Mở đầu" rồi sau đó xóa hết tên
- **THEN** chương hiển thị "Mở đầu" rồi trở lại "Chương N", và vị trí không đổi

### Requirement: Sắp xếp lại chương

Người dùng SHALL chuyển một chương lên một vị trí, xuống một vị trí, lên đầu, xuống cuối, hoặc tới một số thứ tự tùy ý, bằng menu của chương và bằng bàn phím, không cần kéo thả. Yêu cầu tới vị trí ngoài phạm vi SHALL bị từ chối kèm lý do và không đổi thứ tự. Việc sắp xếp SHALL nguyên tử: thứ tự luôn là một hoán vị đầy đủ của các chương, không có số thứ tự trùng hay thiếu. Sau khi chuyển, màn SHALL mở trang chứa vị trí mới và đặt focus vào chương vừa chuyển.

#### Scenario: Chuyển tới vị trí
- **WHEN** người dùng chuyển chương 40 tới vị trí 3
- **THEN** chương đó ở vị trí 3, các chương 3–39 cũ dồn xuống một bậc, các chương còn lại giữ nguyên

#### Scenario: Vị trí không hợp lệ
- **WHEN** người dùng yêu cầu chuyển một chương tới vị trí 0 hoặc lớn hơn số chương
- **THEN** yêu cầu bị từ chối với lý do rõ ràng và thứ tự không đổi

### Requirement: Xóa chương

Người dùng SHALL xóa một chương sau khi xác nhận, trong hộp xác nhận nêu tên chương và cảnh báo việc này không hoàn tác được. Khi chương đã có văn bản gốc hoặc bản dịch, hộp xác nhận SHALL nói rõ bên nào sẽ mất và gợi ý sao lưu tác phẩm trước. Xóa SHALL loại chương khỏi danh sách và dồn số thứ tự các chương sau nó, và SHALL xóa mọi dữ liệu thuộc chương đó cùng lúc (không để lại dữ liệu mồ côi). Hủy hộp xác nhận SHALL không đổi gì.

#### Scenario: Xóa chương giữa danh sách
- **WHEN** người dùng xóa chương 4 trong danh sách 10 chương và xác nhận
- **THEN** còn 9 chương, các chương sau chương 4 cũ hiển thị số 4–9, và không còn dữ liệu nào của chương đã xóa

#### Scenario: Hủy xóa
- **WHEN** người dùng mở hộp xác nhận xóa rồi hủy
- **THEN** danh sách và dữ liệu không đổi

#### Scenario: Xóa chương đã có nội dung
- **WHEN** người dùng xóa một chương có cả văn bản gốc và bản dịch
- **THEN** hộp xác nhận nêu chương sẽ mất cả bản gốc lẫn bản dịch, gợi ý sao lưu trước, và sau khi xác nhận không còn văn bản hay segment nào của chương đó

#### Scenario: Xóa chương chỉ có bản gốc
- **WHEN** người dùng xóa một chương chỉ có văn bản gốc
- **THEN** hộp xác nhận chỉ nêu mất bản gốc, không nhắc bản dịch

### Requirement: Tìm và nhảy tới chương

Ô tìm của danh sách chương SHALL nhận một chuỗi và xử lý như sau: nếu toàn bộ chuỗi (sau khi cắt khoảng trắng) là một số nguyên dương, người dùng SHALL nhảy tới chương có số thứ tự đó khi xác nhận; mọi chuỗi khác SHALL lọc toàn bộ danh sách theo tên hiển thị của chương (gồm cả "Chương N" của chương không tên), không phân biệt hoa thường và dấu tiếng Việt. Số ngoài phạm vi SHALL báo rõ kèm số chương hiện có và không đổi danh sách. Khi bộ lọc không khớp chương nào, màn SHALL báo rõ và cho xóa bộ lọc.

#### Scenario: Lọc không dấu
- **WHEN** người dùng gõ "gap go" và có chương tên "Cuộc gặp gỡ"
- **THEN** chương đó nằm trong kết quả

#### Scenario: Lọc chương không tên
- **WHEN** người dùng gõ "chuong 12" và chương 12 không có tên
- **THEN** chương 12 nằm trong kết quả

#### Scenario: Nhảy tới số thứ tự
- **WHEN** người dùng nhập 1500 trong tác phẩm có 2.000 chương và xác nhận
- **THEN** danh sách chuyển tới trang chứa chương 1500 và làm nổi bật nó mà không phải cuộn tay

#### Scenario: Số ngoài phạm vi
- **WHEN** người dùng nhập 3000 trong tác phẩm có 2.000 chương
- **THEN** màn báo chỉ có 2.000 chương và danh sách giữ nguyên

### Requirement: Phân trang danh sách chương

Danh sách SHALL hiển thị mặc định 50 chương mỗi trang và cho chọn 100 chương mỗi trang. Màn SHALL hiển thị khoảng chương đang xem, tổng kết quả và điều khiển chuyển trang dùng được bằng bàn phím. Tìm theo tên SHALL lọc trên toàn tác phẩm trước khi phân trang; đổi bộ lọc hoặc cỡ trang SHALL về trang 1. Sau khi xóa chương cuối của một trang, màn SHALL chuyển về trang hợp lệ gần nhất.

#### Scenario: Duyệt tác phẩm dài
- **WHEN** tác phẩm có 248 chương và cỡ trang là 50
- **THEN** trang đầu hiển thị chương 1–50, tổng 248 và điều khiển tới trang 2–5

#### Scenario: Lọc qua các trang
- **WHEN** người dùng đang ở trang 4 rồi tìm tên một chương nằm ở cuối tác phẩm
- **THEN** kết quả vẫn chứa chương đó và phân trang bắt đầu lại từ trang 1 của kết quả lọc

#### Scenario: Xóa hàng cuối trang cuối
- **WHEN** người dùng xóa chương duy nhất trên trang cuối
- **THEN** màn chuyển về trang trước, giữ danh sách có thể thao tác được

### Requirement: Trạng thái tải, trống và lỗi của danh sách chương

Danh sách chương SHALL có trạng thái đang tải (không để khung trống không giải thích), trạng thái trống khi tác phẩm chưa có chương (kèm hành động "Thêm chương") và trạng thái lỗi bằng lời dễ hiểu kèm nút thử lại khi không tải được. Thao tác chương thất bại SHALL báo lỗi gần chỗ thao tác và giữ nguyên danh sách đang hiển thị.

#### Scenario: Chưa có chương
- **WHEN** người dùng mở tác phẩm chưa có chương
- **THEN** vùng danh sách hiển thị trạng thái trống với nút "Thêm chương"

#### Scenario: Không tải được danh sách
- **WHEN** việc nạp danh sách chương thất bại
- **THEN** vùng danh sách hiển thị lỗi và nút thử lại, đầu trang tác phẩm vẫn dùng được

### Requirement: Dùng được với hàng nghìn chương

Màn chi tiết SHALL mở và phản hồi thao tác trong thời gian chấp nhận được với tác phẩm có ít nhất 2.000 chương: hiển thị ban đầu không chặn giao diện đáng kể và đổi trang, lọc, thêm, đổi tên, sắp xếp không giật. Hệ thống SHALL không hiển thị đồng thời toàn bộ chương một cách làm giao diện đứng.

#### Scenario: Tác phẩm 2.000 chương
- **WHEN** người dùng mở màn chi tiết của tác phẩm có 2.000 chương
- **THEN** màn hiển thị được trang đầu ngay và các thao tác thêm, đổi tên, chuyển vị trí, lọc, đổi trang đều phản hồi mà không đứng hình

### Requirement: Chương được lưu bền và chỉ mục luôn đúng

Mọi thay đổi chương SHALL được ghi bền trước khi báo thành công, cùng một giao dịch với những thay đổi phụ thuộc (dồn số thứ tự, cập nhật chương gần nhất). Số chương và chương gần nhất trong chỉ mục thư viện SHALL phản ánh đúng sau mỗi thay đổi và sau khi mở lại ứng dụng. Thao tác thất bại SHALL không để lại trạng thái nửa vời.

#### Scenario: Ngắt giữa lúc thêm chương
- **WHEN** ứng dụng bị tắt đột ngột trong lúc thêm chương
- **THEN** lần mở sau, chương đó hoặc có đầy đủ hoặc không có, danh sách vẫn hợp lệ và không trùng số thứ tự

#### Scenario: Thư viện phản ánh số chương
- **WHEN** người dùng thêm ba chương rồi quay về thư viện
- **THEN** hàng của tác phẩm hiển thị "3 chương" và cùng số này sau khi mở lại ứng dụng

### Requirement: Không làm mất dữ liệu ngoài phạm vi thao tác

Thêm, đổi tên và sắp xếp chương SHALL không thay đổi thông tin tác phẩm, ảnh bìa hay các chương khác ngoài phần bị tác động trực tiếp. Yêu cầu chương từ một tác phẩm khác hoặc ID không hợp lệ SHALL bị từ chối mà không đổi dữ liệu nào.

#### Scenario: ID chương thuộc tác phẩm khác
- **WHEN** một yêu cầu đổi tên dùng ID chương không thuộc tác phẩm được chỉ định
- **THEN** yêu cầu bị từ chối và không có dữ liệu nào thay đổi

### Requirement: Tính năng chưa triển khai chỉ hiện dưới dạng minh họa trên giao diện

Để chủ sản phẩm thấy được luồng sẽ có, màn chi tiết MAY hiển thị hành động của tính năng chưa triển khai dưới dạng minh họa. Mỗi hành động minh họa SHALL mang nhãn "Sắp có" nhìn thấy được, SHALL mở một hộp thoại minh họa dùng dữ liệu mẫu cố định ghi rõ không phải dữ liệu của tác phẩm, và SHALL NOT đọc tệp, gọi IPC, ghi dữ liệu hay đổi số chương, thời điểm sửa hoặc chương gần nhất. Nút thực hiện trong hộp thoại minh họa SHALL bị vô hiệu kèm lý do. Minh họa dạng hành động (nút, mục menu) SHALL nằm trong ngữ cảnh của màn đang xem; minh họa dạng khu vực SHALL đi qua danh mục khu vực của khung. Mỗi minh họa SHALL có một mục tương ứng trong backlog của handbook. Ở bản này minh họa gồm **Nhập chương từ tệp .txt** và ba khu vực **Ngữ cảnh**, **Nguồn**, **Tác vụ**. Mỗi khu vực minh họa SHALL hiển thị bảng mô tả những gì nó sẽ chứa, không có hành động nào có hiệu lực, và không đọc hay ghi dữ liệu.

#### Scenario: Mở minh họa nhập .txt
- **WHEN** người dùng bấm "Nhập từ .txt" cạnh "Thêm chương"
- **THEN** hộp thoại minh họa hiện với nhãn "Sắp có", danh sách chương mẫu và nút nhập bị vô hiệu kèm lý do, không có hộp chọn tệp thật

#### Scenario: Minh họa không đổi dữ liệu
- **WHEN** người dùng mở rồi đóng hộp thoại minh họa, bằng chuột hoặc bàn phím
- **THEN** số chương, danh sách chương, chương gần nhất và thời điểm sửa của tác phẩm không đổi

#### Scenario: Thanh tab hiện các khu vực dài hạn
- **WHEN** người dùng mở màn chi tiết của một tác phẩm
- **THEN** thanh tab hiện Chương (đang chọn), Ngữ cảnh, Nguồn, Tác vụ theo thứ tự, ba tab sau mang nhãn "Sắp có"

#### Scenario: Mở khu vực minh họa
- **WHEN** người dùng chọn tab Ngữ cảnh
- **THEN** vùng nội dung hiện bảng mô tả khu vực với nhãn "Sắp có", không có nút nào thay đổi dữ liệu, và đầu trang cùng danh sách chương không bị ảnh hưởng khi quay lại tab Chương

#### Scenario: Tác phẩm chưa có chương
- **WHEN** tác phẩm chưa có chương
- **THEN** trạng thái trống hiển thị "Thêm chương" là hành động chính và "Nhập từ .txt" là hành động phụ có nhãn "Sắp có"

### Requirement: Màn chi tiết dùng được khi cửa sổ hẹp và khi làm việc bằng bàn phím

Bố cục SHALL không tràn ngang ở chiều rộng cửa sổ tối thiểu của ứng dụng (940 px), kể cả khi thanh khu vực có nhiều mục (thanh cuộn trong chính nó hoặc xuống dòng). Mọi hành động trên màn SHALL thao tác được bằng bàn phím, có thứ tự Tab hợp lý và dấu hiệu focus nhìn thấy được. Thanh khu vực, khi hiện, SHALL là tab accessible có tên và trạng thái đang chọn mà công nghệ hỗ trợ nhận biết được, và đổi khu vực SHALL đưa focus tới tiêu đề hoặc nội dung đầu của khu vực mới. Thay đổi trạng thái quan trọng (đã lưu, lỗi) SHALL được thông báo cho công nghệ hỗ trợ.

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ ứng dụng ở chiều rộng tối thiểu
- **THEN** đầu trang xếp lại (bìa trên hoặc cạnh thông tin) mà không cuộn ngang

#### Scenario: Chỉ dùng bàn phím
- **WHEN** người dùng chỉ dùng bàn phím để sửa thông tin, thêm chương, đổi tên, chuyển vị trí và xóa chương
- **THEN** hoàn tất được mà không cần chuột
