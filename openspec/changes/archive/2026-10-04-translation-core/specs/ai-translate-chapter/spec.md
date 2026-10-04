## MODIFIED Requirements

### Requirement: Chạy theo đoạn, có tiến độ và hủy

Việc dịch một chương SHALL được chia thành các lô gửi liên tiếp qua lõi dịch, cắt ở ranh giới đoạn hoặc câu an toàn. Trong lúc chạy, hệ thống SHALL hiển thị tiến độ theo số segment đã xong trên tổng số, và SHALL cho hủy ở bất kỳ lúc nào. Khi hủy, mọi segment đã qua kiểm tra trước đó SHALL được giữ, và hệ thống SHALL nói rõ đã lưu bao nhiêu.

#### Scenario: Tiến độ theo segment
- **WHEN** việc dịch đang chạy
- **THEN** người dùng thấy số segment đã xong trên tổng số, không chỉ thấy một chỉ báo chờ

#### Scenario: Hủy giữa chừng
- **WHEN** người dùng hủy lúc đang chạy
- **THEN** việc dịch dừng, các segment đã xong vẫn được giữ, và thông báo nói rõ số segment đã lưu

#### Scenario: Chuyển khóa không làm dừng
- **WHEN** một khóa hết hạn mức giữa lúc đang chạy và kết nối còn khóa khác
- **THEN** việc dịch tiếp tục bằng khóa sau và người dùng thấy thông báo đã chuyển khóa

### Requirement: Một phần lỗi không làm hỏng cả chương

Khi một số lô hoặc một số segment không dịch được sau khi đã qua xử lý sửa lỗi của lõi dịch, hệ thống SHALL giữ toàn bộ phần đã thành công, SHALL liệt kê phần lỗi kèm lý do đã phân loại từ lõi dịch, và SHALL cho chạy lại riêng phần lỗi.

#### Scenario: Một lô lỗi, phần còn lại xong
- **WHEN** một lô thất bại sau khi đã thử lại tới trần
- **THEN** các segment còn lại vẫn được lưu, phần lỗi được liệt kê kèm lý do, và có hành động chạy lại riêng phần lỗi

#### Scenario: Chạy lại phần lỗi
- **WHEN** người dùng chạy lại phần lỗi
- **THEN** chỉ các segment lỗi được gửi lại, các segment đã xong không bị gửi lại và không bị đổi

#### Scenario: Hết mọi khóa giữa job
- **WHEN** mọi khóa của kết nối đều bị đóng băng lúc đang chạy
- **THEN** việc dịch dừng với thông báo nêu thời điểm khóa sớm nhất hồi phục, phần đã xong được giữ, và phần còn lại nằm trong nhóm chạy lại được
