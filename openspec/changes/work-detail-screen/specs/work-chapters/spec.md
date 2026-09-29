## Purpose

Định nghĩa chương của một tác phẩm: thêm, đặt tên, sắp xếp, xóa và tìm, sao cho danh sách bền vững, đúng thứ tự và vẫn dùng được với hàng nghìn chương. Chương ở giai đoạn này chỉ là mục trong danh sách; văn bản nằm ở change sau.

## ADDED Requirements

### Requirement: Chương có thứ tự và số thứ tự suy ra từ vị trí

Mỗi tác phẩm SHALL có danh sách chương có thứ tự. Số thứ tự hiển thị của một chương SHALL suy ra từ vị trí hiện tại (bắt đầu từ 1) và SHALL NOT được lưu cứng. Tên chương là văn bản tự do, có thể để trống; chương không tên SHALL hiển thị là "Chương N". Việc đánh số theo nguồn (ví dụ bắt đầu từ chương 101, hay "Ngoại truyện") SHALL do người dùng ghi trong tên chương.

#### Scenario: Chương không tên
- **WHEN** người dùng thêm một chương mà không nhập tên
- **THEN** chương hiển thị là "Chương N" với N là vị trí của nó

#### Scenario: Số thứ tự đổi theo vị trí
- **WHEN** người dùng chuyển chương 5 lên trước chương 2
- **THEN** chương đó hiển thị là số 2, các chương 2–4 cũ thành 3–5, và thứ tự này còn nguyên sau khi mở lại ứng dụng

### Requirement: Thêm chương

Người dùng SHALL thêm chương mới vào cuối danh sách chỉ bằng một thao tác, có thể nhập tên ngay hoặc để trống. Thêm liên tiếp nhiều chương SHALL nhanh và không cần rời bàn phím. Chương mới SHALL được lưu bền trước khi hiển thị là đã thêm. Sau khi thêm, danh sách SHALL cuộn tới chương mới và đặt focus ở đó.

#### Scenario: Thêm một chương có tên
- **WHEN** người dùng nhập "Cuộc gặp gỡ" rồi xác nhận thêm chương
- **THEN** chương "Cuộc gặp gỡ" xuất hiện ở cuối danh sách với số thứ tự đúng và còn nguyên sau khi mở lại ứng dụng

#### Scenario: Thêm liên tiếp
- **WHEN** người dùng thêm năm chương liên tiếp mà không nhập tên
- **THEN** có thêm năm chương "Chương N" đúng thứ tự, không trùng, không thiếu

### Requirement: Đổi tên chương

Người dùng SHALL đổi tên chương tại chỗ. Tên được cắt khoảng trắng hai đầu, tối đa 200 ký tự, và tên rỗng SHALL đưa chương về dạng "Chương N". Đổi tên SHALL không ảnh hưởng vị trí hay dữ liệu khác của chương.

#### Scenario: Đổi tên rồi xóa tên
- **WHEN** người dùng đổi tên chương thành "Mở đầu" rồi sau đó xóa hết tên
- **THEN** chương hiển thị "Mở đầu" rồi trở lại "Chương N", và vị trí không đổi

### Requirement: Sắp xếp lại chương

Người dùng SHALL chuyển một chương lên một vị trí, xuống một vị trí, lên đầu, xuống cuối, hoặc tới một số thứ tự tùy ý, bằng menu của chương và bằng bàn phím, không cần kéo thả. Yêu cầu tới vị trí ngoài phạm vi SHALL bị từ chối kèm lý do và không đổi thứ tự. Việc sắp xếp SHALL nguyên tử: thứ tự luôn là một hoán vị đầy đủ của các chương, không có số thứ tự trùng hay thiếu.

#### Scenario: Chuyển tới vị trí
- **WHEN** người dùng chuyển chương 40 tới vị trí 3
- **THEN** chương đó ở vị trí 3, các chương 3–39 cũ dồn xuống một bậc, các chương còn lại giữ nguyên

#### Scenario: Vị trí không hợp lệ
- **WHEN** người dùng yêu cầu chuyển một chương tới vị trí 0 hoặc lớn hơn số chương
- **THEN** yêu cầu bị từ chối với lý do rõ ràng và thứ tự không đổi

### Requirement: Xóa chương

Người dùng SHALL xóa một chương sau khi xác nhận, trong hộp xác nhận nêu tên chương và cảnh báo việc này không hoàn tác được. Xóa SHALL loại chương khỏi danh sách và dồn số thứ tự các chương sau nó, và SHALL xóa mọi dữ liệu thuộc chương đó cùng lúc (không để lại dữ liệu mồ côi). Hủy hộp xác nhận SHALL không đổi gì.

#### Scenario: Xóa chương giữa danh sách
- **WHEN** người dùng xóa chương 4 trong danh sách 10 chương và xác nhận
- **THEN** còn 9 chương, các chương sau chương 4 cũ hiển thị số 4–9, và không còn dữ liệu nào của chương đã xóa

#### Scenario: Hủy xóa
- **WHEN** người dùng mở hộp xác nhận xóa rồi hủy
- **THEN** danh sách và dữ liệu không đổi

### Requirement: Tìm và nhảy tới chương

Người dùng SHALL lọc danh sách theo tên chương không phân biệt hoa thường và dấu tiếng Việt, và SHALL nhảy tới chương theo số thứ tự bằng cách nhập số. Khi bộ lọc không khớp chương nào, màn SHALL báo rõ và cho xóa bộ lọc.

#### Scenario: Lọc không dấu
- **WHEN** người dùng gõ "gap go" và có chương tên "Cuộc gặp gỡ"
- **THEN** chương đó nằm trong kết quả

#### Scenario: Nhảy tới số thứ tự
- **WHEN** người dùng nhập 1500 trong tác phẩm có 2.000 chương
- **THEN** danh sách hiển thị và làm nổi bật chương 1500 mà không phải cuộn tay

### Requirement: Dùng được với hàng nghìn chương

Màn chi tiết SHALL mở và phản hồi thao tác trong thời gian chấp nhận được với tác phẩm có ít nhất 2.000 chương: hiển thị ban đầu không chặn giao diện đáng kể và cuộn, lọc, thêm, đổi tên, sắp xếp không giật. Hệ thống SHALL không tải hoặc hiển thị đồng thời toàn bộ chương một cách làm giao diện đứng.

#### Scenario: Tác phẩm 2.000 chương
- **WHEN** người dùng mở màn chi tiết của tác phẩm có 2.000 chương
- **THEN** màn hiển thị được phần đầu danh sách ngay và các thao tác thêm, đổi tên, chuyển vị trí, lọc đều phản hồi mà không đứng hình

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
