# work-backup Specification

## Purpose
Cho người dùng mang một tác phẩm ra khỏi máy và khôi phục lại an toàn, để dữ liệu không phụ thuộc vào một thư mục ứng dụng duy nhất.

## Requirements

### Requirement: Sao lưu một tác phẩm thành một tệp

Người dùng SHALL sao lưu một tác phẩm thành đúng một tệp do họ chọn nơi lưu qua hộp thoại hệ thống, từ menu tác phẩm ở thư viện và ở màn chi tiết. Tệp sao lưu SHALL là bản chụp nhất quán tại một thời điểm, có thể tạo khi tác phẩm đang mở, và SHALL chứa toàn bộ văn bản, segment, liên kết, nguồn gốc, ảnh bìa và thiết lập của tác phẩm đó. Hộp thoại SHALL gợi ý tên tệp theo tên tác phẩm và ngày, bỏ các ký tự Windows không cho phép trong tên tệp. Sao lưu SHALL báo kết quả rõ ràng (đã lưu ở đâu, hoặc lý do thất bại) và SHALL NOT thay đổi tác phẩm.

#### Scenario: Sao lưu khi đang mở
- **WHEN** người dùng sao lưu tác phẩm đang có thay đổi vừa lưu
- **THEN** tệp sao lưu chứa các thay đổi đó và không chứa trạng thái nửa vời

#### Scenario: Không chọn nơi lưu
- **WHEN** người dùng hủy hộp thoại chọn nơi lưu
- **THEN** không tạo tệp nào, không báo lỗi và dữ liệu không đổi

#### Scenario: Tên tác phẩm có ký tự không hợp lệ
- **WHEN** tên tác phẩm chứa các ký tự như `:` hoặc `?`
- **THEN** tên tệp gợi ý không chứa các ký tự đó và vẫn nhận ra được tác phẩm

#### Scenario: Không ghi được vào nơi đã chọn
- **WHEN** nơi lưu bị khóa hoặc hết dung lượng
- **THEN** sao lưu báo lỗi dễ hiểu, không để lại tệp dở dang ở nơi đã chọn và tác phẩm không đổi

### Requirement: Khôi phục thành tác phẩm mới

Người dùng SHALL khôi phục từ tệp sao lưu qua hộp thoại chọn tệp, bằng nút "Mở tác phẩm có sẵn" ở thư viện. Khôi phục SHALL tạo một tác phẩm mới trong thư viện và SHALL NOT ghi đè hay sửa tác phẩm đang tồn tại, kể cả khi tác phẩm đó cùng ID gốc. Tác phẩm khôi phục SHALL giữ nguyên nội dung, trạng thái, chương làm gần nhất và các mốc thời gian của bản sao lưu.

#### Scenario: Khôi phục trên máy sạch
- **WHEN** khôi phục một tệp sao lưu hợp lệ trên hồ sơ người dùng mới
- **THEN** tác phẩm xuất hiện với nội dung, segment, liên kết, nguồn gốc và ảnh bìa giống bản gốc

#### Scenario: Khôi phục khi bản gốc còn tồn tại
- **WHEN** khôi phục tệp của một tác phẩm vẫn đang có trong thư viện
- **THEN** tạo thêm một tác phẩm mới độc lập và tác phẩm cũ không thay đổi

#### Scenario: Giữ trạng thái và chương gần nhất
- **WHEN** khôi phục bản sao lưu của tác phẩm đang "Tạm dừng" với chương gần nhất là chương 7
- **THEN** tác phẩm mới cũng "Tạm dừng" và "Tiếp tục" trỏ vào chương 7 của nó

### Requirement: Phản hồi sau khi khôi phục

Khi khôi phục thành công, hệ thống SHALL thông báo tên tác phẩm đã khôi phục và cho mở ngay màn chi tiết của nó, vì tác phẩm giữ mốc thời gian cũ nên có thể không nằm đầu danh sách. Khi bị từ chối hoặc thất bại, hệ thống SHALL nêu lý do và SHALL NOT đổi thư viện.

#### Scenario: Khôi phục thành công
- **WHEN** khôi phục một tệp hợp lệ
- **THEN** thư viện hiện thông báo kèm nút mở tác phẩm vừa khôi phục, và nút đó dẫn tới màn chi tiết của nó

#### Scenario: Hủy chọn tệp
- **WHEN** người dùng hủy hộp thoại chọn tệp
- **THEN** không có thông báo lỗi và thư viện không đổi

### Requirement: Kiểm tra toàn vẹn trước khi nhận

Trước khi thêm vào thư viện, hệ thống SHALL kiểm tra tệp sao lưu: đúng định dạng của Mira, toàn vẹn dữ liệu, phiên bản schema được hỗ trợ. Hệ thống SHALL làm việc trên bản sao và SHALL NOT sửa tệp gốc của người dùng. Nếu không đạt, hệ thống SHALL từ chối, nêu lý do, và SHALL NOT thay đổi thư viện hiện có.

#### Scenario: Tệp không phải sao lưu Mira
- **WHEN** người dùng chọn một tệp khác định dạng
- **THEN** khôi phục bị từ chối kèm lý do và thư viện không đổi

#### Scenario: Tệp hỏng
- **WHEN** tệp sao lưu bị cắt cụt hoặc hỏng dữ liệu
- **THEN** khôi phục bị từ chối và không để lại tác phẩm dở dang

#### Scenario: Schema mới hơn
- **WHEN** tệp có phiên bản schema cao hơn bản Mira hiện tại hiểu
- **THEN** khôi phục bị từ chối kèm hướng dẫn cần cập nhật ứng dụng

#### Scenario: Tệp gốc không bị đụng tới
- **WHEN** khôi phục một tệp sao lưu hợp lệ
- **THEN** tệp sao lưu của người dùng giữ nguyên nội dung và không bị khóa sau khi khôi phục xong

### Requirement: Khôi phục nguyên tử

Khôi phục SHALL hoặc thêm trọn vẹn tác phẩm mới hoặc không thêm gì. Nếu bị gián đoạn, lần mở sau SHALL không thấy tác phẩm dở dang trong thư viện.

#### Scenario: Gián đoạn giữa lúc khôi phục
- **WHEN** ứng dụng bị tắt đột ngột giữa lúc khôi phục
- **THEN** lần mở sau thư viện không có tác phẩm dở dang và các tác phẩm khác không đổi

### Requirement: Sao lưu và khôi phục không cần mạng

Sao lưu và khôi phục SHALL hoạt động khi không có mạng và SHALL NOT yêu cầu tài khoản.

#### Scenario: Ngoại tuyến
- **WHEN** máy không có mạng
- **THEN** sao lưu và khôi phục vẫn thành công
