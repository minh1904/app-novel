# ai-translate-chapter Specification

## Purpose
Dịch bản gốc của một chương đang mở bằng AI: cho người dùng biết trước chi phí, chạy theo đoạn có tiến độ và hủy được, ghi kết quả vào bản dịch kèm nguồn gốc, và không bao giờ ghi đè văn bản người dùng đã sửa. Đây là điểm gọi tối thiểu chứng minh kết nối AI hoạt động, không phải job dịch bền vững cho cả bộ truyện.

## Requirements

### Requirement: Mở được từ màn chương khi đã có kết nối

Màn chương SHALL có một hành động dịch bản gốc bằng AI. Khi chưa có kết nối nào đang bật, hành động đó SHALL giải thích lý do chưa dùng được và SHALL dẫn tới nơi khai kết nối, chứ SHALL NOT chỉ hiện ở trạng thái mờ không nói gì.

#### Scenario: Chưa khai kết nối
- **WHEN** người dùng mở hành động dịch bằng AI mà chưa có kết nối nào đang bật
- **THEN** thấy một câu giải thích và một đường dẫn tới nơi khai kết nối

#### Scenario: Chương chưa có bản gốc
- **WHEN** chương chưa có bản gốc
- **THEN** hành động dịch bằng AI không khả dụng và nêu rõ cần nhập bản gốc trước

### Requirement: Ước lượng trước khi chạy

Trước khi gửi bất cứ gì, hệ thống SHALL hiển thị model sẽ dùng, số segment sẽ dịch, và ước lượng lượng token cùng chi phí. Con số này SHALL được ghi rõ là ước lượng. Khi chưa biết giá của model, hệ thống SHALL nói là chưa biết giá thay vì hiển thị số không.

#### Scenario: Xem ước lượng rồi mới chạy
- **WHEN** người dùng mở hành động dịch bằng AI trên một chương có bản gốc
- **THEN** thấy model, số segment và ước lượng token cùng chi phí kèm chữ cho biết đây là ước lượng, và phải xác nhận mới bắt đầu gửi

#### Scenario: Model chưa biết giá
- **WHEN** model được chọn không có dữ liệu giá
- **THEN** phần chi phí nói rõ là chưa biết giá, và việc dịch vẫn chạy được

#### Scenario: Ghi lượng dùng thật sau khi chạy
- **WHEN** nhà cung cấp trả về lượng token đã dùng
- **THEN** hệ thống lưu lại con số thật đó cùng kết quả

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

### Requirement: Kết quả ghi vào bản dịch kèm nguồn gốc, không ghi đè bản người dùng đã sửa

Bản dịch do AI tạo SHALL được ghi vào bản dịch của chương theo đúng segment ID, kèm nguồn gốc gồm provider, model và thời điểm. Hệ thống SHALL NOT ghi đè một segment mà người dùng đã sửa; với những segment đó, hệ thống SHALL giữ bản của người dùng và cho họ xem so sánh để tự chọn.

#### Scenario: Chương chưa có bản dịch
- **WHEN** dịch một chương chưa có bản dịch nào
- **THEN** kết quả được ghi vào bản dịch theo đúng segment, mỗi segment có nguồn gốc là AI kèm model và thời điểm

#### Scenario: Chương đã có segment người dùng sửa
- **WHEN** dịch lại một chương có segment người dùng đã sửa
- **THEN** các segment đó không bị ghi đè, và người dùng thấy so sánh giữa bản của mình và bản AI đề xuất để chọn

#### Scenario: Cảnh báo trước khi dịch lại
- **WHEN** người dùng mở hành động dịch trên chương đã có bản dịch
- **THEN** hộp thoại nói rõ AI tạo đề xuất và không ghi đè phần đã sửa, trước khi người dùng xác nhận

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
