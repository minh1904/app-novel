# context-compliance Specification

## Purpose
Kiểm tra một bản dịch có tuân thủ ngữ cảnh đã gửi hay không bằng luật thuần, không gọi model: thuật ngữ đã khớp có được dùng, thuật ngữ bị cấm có lọt vào, và cặp xưng hô có nằm trong ma trận đang hiệu lực — trả về cờ theo đoạn để người dịch soát hoặc để job dịch thử lại.

## ADDED Requirements

### Requirement: Kiểm tra bằng luật, không gọi model và không sửa văn bản

Việc kiểm tra tuân thủ SHALL chạy hoàn toàn trên máy, SHALL NOT gọi nhà cung cấp AI và SHALL NOT truy cập mạng. Kết quả SHALL là cờ gắn theo đoạn kèm loại vi phạm và mục ngữ cảnh liên quan. Việc kiểm tra SHALL NOT tự sửa bản dịch và SHALL NOT thay đổi dữ liệu tác phẩm.

#### Scenario: Chạy khi không có mạng
- **WHEN** kiểm tra một chương trong lúc máy không có mạng
- **THEN** kiểm tra hoàn tất và trả về đầy đủ cờ

#### Scenario: Không tự sửa
- **WHEN** kiểm tra phát hiện một vi phạm
- **THEN** bản dịch không bị thay đổi và người dùng là người quyết định sửa hay bỏ qua

### Requirement: Thuật ngữ đã gửi mà bản dịch không dùng

Với mỗi mục thuật ngữ đã nằm trong ngữ cảnh gửi cho một đoạn, nếu bản dịch của đoạn đó **không chứa** cách dịch đã duyệt của mục, hệ thống SHALL gắn cờ cho đoạn đó kèm mục liên quan. So khớp phía đích SHALL phân biệt dấu tiếng Việt và SHALL phân biệt chữ hoa đầu từ đối với tên riêng.

#### Scenario: Thiếu cách dịch đã duyệt
- **WHEN** ngữ cảnh gửi mục "Thiên Lam Tông" cho một đoạn và bản dịch của đoạn đó không chứa cụm đó
- **THEN** đoạn được gắn cờ thiếu thuật ngữ, kèm tên mục

#### Scenario: Khác dấu tính là không khớp
- **WHEN** cách dịch đã duyệt là "linh khí" và bản dịch chứa "linh khi"
- **THEN** đoạn được gắn cờ thiếu thuật ngữ

#### Scenario: Mục không gửi thì không kiểm
- **WHEN** một mục thuật ngữ không nằm trong ngữ cảnh đã gửi cho đoạn đó
- **THEN** đoạn đó không bị gắn cờ vì mục đó

### Requirement: Thuật ngữ bị cấm xuất hiện trong bản dịch

Nếu bản dịch của một đoạn chứa một cách dịch đã được đánh dấu là **bị cấm**, hệ thống SHALL gắn cờ cho đoạn đó kèm mục bị cấm và cách dịch được khuyến nghị thay thế nếu mục có khai.

#### Scenario: Cách dịch bị cấm lọt vào
- **WHEN** mục khai "khí linh" là cách dịch bị cấm và bản dịch chứa "khí linh"
- **THEN** đoạn được gắn cờ dùng thuật ngữ bị cấm, kèm cách dịch khuyến nghị

### Requirement: Cặp xưng hô ngoài ma trận đang hiệu lực

Với một chương có cặp xưng hô đang hiệu lực, nếu bản dịch của một đoạn dùng một cặp đại từ **không có** trong ma trận hiệu lực của chương đó, hệ thống SHALL gắn cờ cho đoạn đó. Khi chương có cặp nhân vật chưa khai xưng hô, hệ thống SHALL gắn cờ loại *chưa khai* thay vì coi mọi cách gọi là hợp lệ.

#### Scenario: Dùng cặp đại từ lạ
- **WHEN** ma trận hiệu lực của chương chỉ có "tớ – cậu" cho một cặp và bản dịch dùng "anh – em" cho cặp đó
- **THEN** đoạn được gắn cờ xưng hô ngoài ma trận, kèm cặp đang hiệu lực

#### Scenario: Cặp chưa khai
- **WHEN** chương có hai nhân vật đối thoại nhưng chưa khai cặp xưng hô nào giữa họ
- **THEN** các đoạn thoại của chương được gắn cờ chưa khai xưng hô

### Requirement: Kết quả kiểm tra dùng được cho cả soát tay và tự động

Kết quả kiểm tra SHALL liệt kê được theo chương và theo đoạn, và SHALL phân biệt được cờ **có thể thử lại tự động** (thiếu thuật ngữ, dùng thuật ngữ bị cấm) với cờ **cần người xem** (xưng hô ngoài ma trận, cặp chưa khai).

#### Scenario: Lọc theo nhóm cờ
- **WHEN** một chương có cả hai nhóm cờ
- **THEN** người gọi lấy riêng được nhóm có thể thử lại tự động và nhóm cần người xem
