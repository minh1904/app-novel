## Purpose

Cho người dùng mang một tác phẩm ra khỏi máy và khôi phục lại an toàn, để dữ liệu không phụ thuộc vào một thư mục ứng dụng duy nhất.

## ADDED Requirements

### Requirement: Sao lưu một tác phẩm thành một tệp

Người dùng SHALL sao lưu một tác phẩm thành đúng một tệp do họ chọn nơi lưu qua hộp thoại hệ thống. Tệp sao lưu SHALL là bản chụp nhất quán tại một thời điểm, có thể tạo khi tác phẩm đang mở, và SHALL chứa toàn bộ văn bản, segment, liên kết, nguồn gốc, thiết lập của tác phẩm đó.

#### Scenario: Sao lưu khi đang mở
- **WHEN** người dùng sao lưu tác phẩm đang có thay đổi vừa lưu
- **THEN** tệp sao lưu chứa các thay đổi đó và không chứa trạng thái nửa vời

#### Scenario: Không chọn nơi lưu
- **WHEN** người dùng hủy hộp thoại chọn nơi lưu
- **THEN** không tạo tệp nào và dữ liệu không đổi

### Requirement: Khôi phục thành tác phẩm mới

Người dùng SHALL khôi phục từ tệp sao lưu qua hộp thoại chọn tệp. Khôi phục SHALL tạo một tác phẩm mới trong thư viện và SHALL NOT ghi đè hay sửa tác phẩm đang tồn tại, kể cả khi tác phẩm đó cùng ID gốc.

#### Scenario: Khôi phục trên máy sạch
- **WHEN** khôi phục một tệp sao lưu hợp lệ trên hồ sơ người dùng mới
- **THEN** tác phẩm xuất hiện với nội dung, segment, liên kết và nguồn gốc giống bản gốc

#### Scenario: Khôi phục khi bản gốc còn tồn tại
- **WHEN** khôi phục tệp của một tác phẩm vẫn đang có trong thư viện
- **THEN** tạo thêm một tác phẩm mới độc lập và tác phẩm cũ không thay đổi

### Requirement: Kiểm tra toàn vẹn trước khi nhận

Trước khi thêm vào thư viện, hệ thống SHALL kiểm tra tệp sao lưu: đúng định dạng của Mira, toàn vẹn dữ liệu, phiên bản schema được hỗ trợ. Nếu không đạt, hệ thống SHALL từ chối, nêu lý do, và SHALL NOT thay đổi thư viện hiện có.

#### Scenario: Tệp không phải sao lưu Mira
- **WHEN** người dùng chọn một tệp khác định dạng
- **THEN** khôi phục bị từ chối kèm lý do và thư viện không đổi

#### Scenario: Tệp hỏng
- **WHEN** tệp sao lưu bị cắt cụt hoặc hỏng dữ liệu
- **THEN** khôi phục bị từ chối và không để lại tác phẩm dở dang

#### Scenario: Schema mới hơn
- **WHEN** tệp có phiên bản schema cao hơn bản Mira hiện tại hiểu
- **THEN** khôi phục bị từ chối kèm hướng dẫn cần cập nhật ứng dụng

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
