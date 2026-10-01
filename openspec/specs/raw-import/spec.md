# raw-import Specification

## Purpose
Cho người dùng đưa văn bản gốc (raw) vào một chương: từ ô dán hoặc từ tệp `.txt`/`.md`, đọc đúng bảng mã, chuẩn hóa tối thiểu và nói rõ đã đổi gì, cho xem trước, rồi lưu kèm segment. Đây là cửa vào của luồng dịch; mọi thay đổi văn bản ở đây phải minh bạch vì bản gốc là thứ AI và người soát dựa vào.

## Requirements

### Requirement: Nhập bản gốc từ ô dán hoặc từ tệp

Người dùng SHALL nhập bản gốc cho một chương bằng cách dán văn bản vào ô nhập hoặc chọn một tệp `.txt` hay `.md` (chọn bằng hộp thoại hoặc kéo thả). Tệp SHALL được đọc ở máy người dùng, không gửi đi đâu. Tệp lớn hơn 8 MB, tệp rỗng hoặc chỉ gồm khoảng trắng SHALL bị từ chối kèm lý do và không đổi gì. Nhập một chương SHALL không đòi tài khoản hay mạng.

#### Scenario: Dán văn bản
- **WHEN** người dùng dán một đoạn văn vào ô nhập của chương chưa có bản gốc
- **THEN** màn xem trước hiện ra với văn bản đó và số segment

#### Scenario: Chọn tệp
- **WHEN** người dùng chọn một tệp `.txt` UTF-8 hợp lệ
- **THEN** màn xem trước hiện ra với nội dung tệp và tên tệp

#### Scenario: Tệp rỗng
- **WHEN** người dùng chọn một tệp không có chữ nào
- **THEN** nhập bị từ chối kèm lý do và chương không đổi

#### Scenario: Tệp quá lớn
- **WHEN** người dùng chọn một tệp 12 MB
- **THEN** nhập bị từ chối kèm giới hạn 8 MB và chương không đổi

### Requirement: Nhận đúng bảng mã của tệp

Hệ thống SHALL xác định bảng mã theo thứ tự: dấu thứ tự byte (BOM) UTF-8 hoặc UTF-16; nếu không có, UTF-8 nghiêm ngặt (không ký tự thay thế); nếu không đạt, lần lượt các bảng mã cũ hợp với ngôn ngữ nguồn của tác phẩm (Trung giản thể: GB18030; Trung phồn thể: Big5 rồi GB18030; Nhật: Shift_JIS rồi EUC-JP; Anh: Windows-1252) và chọn bảng mã giải mã không lỗi; khi nhiều bảng mã cùng giải mã được tệp tiếng Nhật, chọn bảng mã cho ít ký tự katakana nửa chiều rộng nhất, vì byte EUC-JP cũng là Shift_JIS hợp lệ nhưng cho ra chuỗi katakana nửa chiều rộng mà văn bản thật hiếm có. Màn xem trước SHALL nêu bảng mã đã dùng và cho người dùng đổi sang bảng mã khác trong danh sách hỗ trợ; kết quả SHALL cập nhật ngay. Văn bản dán SHALL không qua bước nhận bảng mã. Nếu kết quả có ký tự thay thế (U+FFFD), màn xem trước SHALL cảnh báo là có thể sai bảng mã.

#### Scenario: Tệp UTF-8 có BOM
- **WHEN** người dùng chọn tệp UTF-8 có BOM
- **THEN** văn bản hiện đúng, BOM không nằm trong văn bản và bảng mã hiển thị là UTF-8

#### Scenario: Tệp tiếng Nhật Shift_JIS
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật và người dùng chọn tệp Shift_JIS không có BOM
- **THEN** văn bản hiện đúng chữ Nhật và bảng mã hiển thị là Shift_JIS

#### Scenario: Đổi bảng mã bằng tay
- **WHEN** xem trước hiện chữ loạn vì bảng mã đoán sai và người dùng chọn bảng mã khác
- **THEN** văn bản và số segment tính lại theo bảng mã mới

#### Scenario: EUC-JP bị nhầm với Shift_JIS
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật và người dùng chọn tệp EUC-JP không có BOM mà các byte cũng là Shift_JIS hợp lệ
- **THEN** văn bản hiện đúng chữ Nhật và bảng mã hiển thị là EUC-JP

#### Scenario: Nhận sai
- **WHEN** không bảng mã nào giải mã sạch tệp
- **THEN** xem trước dùng bảng mã ít ký tự thay thế nhất, hiện cảnh báo, và vẫn cho người dùng đổi bảng mã hoặc hủy

### Requirement: Chuẩn hóa tối thiểu và báo lại những gì đã đổi

Khi nhập, hệ thống SHALL chỉ thực hiện các thay đổi sau: bỏ BOM; đổi mọi kiểu xuống dòng (CRLF, CR, U+2028, U+2029) thành LF; bỏ ký tự điều khiển (NUL và các ký tự C0 khác, trừ tab và LF); bỏ các dòng trống ở đầu văn bản (dòng đầu tiên có chữ giữ nguyên thụt đầu dòng của nó) và khoảng trắng, dòng trống ở cuối văn bản. Hệ thống SHALL NOT đổi dấu câu, khoảng trắng trong dòng, khoảng trắng đầu dòng (kể cả U+3000), chữ hoa/thường, dạng chữ Hán hay chuẩn Unicode (NFC/NFD). Màn xem trước SHALL liệt kê số lượng từng loại thay đổi đã áp dụng; nếu không đổi gì thì nói là không đổi.

#### Scenario: Xuống dòng kiểu Windows
- **WHEN** văn bản có 120 dòng kết thúc bằng CRLF
- **THEN** văn bản lưu dùng LF và xem trước ghi "đổi 120 xuống dòng CRLF thành LF"

#### Scenario: Giữ thụt đầu dòng tiếng Nhật
- **WHEN** các đoạn bắt đầu bằng khoảng trắng toàn chiều rộng (U+3000)
- **THEN** khoảng trắng đó được giữ nguyên

#### Scenario: Không đổi gì
- **WHEN** văn bản đã dùng LF, không có ký tự điều khiển và không có khoảng trắng thừa ở hai đầu
- **THEN** xem trước nói rằng văn bản được giữ nguyên

#### Scenario: Ký tự điều khiển
- **WHEN** văn bản có hai ký tự NUL
- **THEN** chúng bị bỏ và xem trước ghi "bỏ 2 ký tự điều khiển"

### Requirement: Xem trước trước khi lưu

Trước khi ghi vào chương, hệ thống SHALL hiển thị: tên tệp (nếu có), bảng mã, số ký tự, số segment, danh sách chuẩn hóa đã áp dụng, phần đầu của văn bản và vài segment đầu và cuối. Người dùng SHALL có thể hủy mà không đổi gì. Nhập SHALL chỉ ghi vào chương khi người dùng xác nhận.

#### Scenario: Hủy ở màn xem trước
- **WHEN** người dùng bấm hủy ở màn xem trước
- **THEN** chương không có thay đổi nào và không có dữ liệu nào được lưu

### Requirement: Lưu bản gốc cùng segment

Khi xác nhận, hệ thống SHALL ghi văn bản đã chuẩn hóa và danh sách segment vào bên nguồn của chương trong một lần lưu (cùng giao dịch), dùng revision hiện tại làm điều kiện. Kết quả SHALL bền: đóng và mở lại ứng dụng cho cùng văn bản, cùng số segment, cùng vùng. Nếu việc lưu thất bại hoặc revision đã đổi, hệ thống SHALL báo rõ, giữ nguyên bản gốc cũ của chương, và giữ lại những gì người dùng đã nhập trong màn nhập để thử lại.

#### Scenario: Lưu thành công
- **WHEN** người dùng xác nhận nhập một văn bản chia được 40 segment
- **THEN** chương có bản gốc đó với 40 segment, và sau khi mở lại ứng dụng vẫn đúng như vậy

#### Scenario: Chương đổi ở nơi khác
- **WHEN** bản gốc của chương đã đổi giữa lúc mở màn nhập và lúc xác nhận
- **THEN** lần lưu bị từ chối, bản gốc hiện có không đổi, và người dùng được báo để tải lại rồi quyết định

#### Scenario: Văn bản quá dài
- **WHEN** văn bản sau chuẩn hóa vượt giới hạn kích thước của chương
- **THEN** nhập bị từ chối kèm giới hạn, chương không đổi và nội dung nhập vẫn còn để cắt bớt

### Requirement: Thay bản gốc của chương đã có nội dung

Chương đã có bản gốc SHALL cho thay bằng một lần nhập mới sau khi xác nhận. Hộp xác nhận SHALL nêu rõ hệ quả với dữ liệu hiện có: bản gốc cũ và segment cũ bị thay (ID segment mới); các liên kết với segment cũ được đánh dấu cần kiểm tra; bản dịch, nếu có, được giữ nguyên. Khi chương có bản dịch hoặc liên kết, hộp xác nhận SHALL gợi ý sao lưu trước. Việc thay SHALL không chạm tới bản dịch.

#### Scenario: Thay khi chưa có bản dịch
- **WHEN** chương chỉ có bản gốc và người dùng nhập bản mới rồi xác nhận
- **THEN** bản gốc và segment được thay, không có cảnh báo về bản dịch

#### Scenario: Thay khi đã có bản dịch và liên kết
- **WHEN** chương có bản dịch và các liên kết, và người dùng thay bản gốc
- **THEN** hộp xác nhận nêu bản dịch được giữ và các liên kết sẽ cần kiểm tra; sau khi xác nhận bản dịch nguyên vẹn và các liên kết ở trạng thái cần kiểm tra

#### Scenario: Hủy việc thay
- **WHEN** người dùng hủy ở hộp xác nhận thay
- **THEN** bản gốc, segment, bản dịch và liên kết hiện có không đổi

### Requirement: Nhập dùng được bằng bàn phím và không chặn giao diện

Toàn bộ luồng nhập (dán, chọn tệp, đổi bảng mã, xác nhận, hủy) SHALL dùng được chỉ bằng bàn phím, có dấu hiệu focus và thông báo trạng thái cho công nghệ hỗ trợ. Với văn bản 300.000 ký tự, màn xem trước SHALL hiện trong chưa đầy 1 giây và giao diện SHALL không đứng.

#### Scenario: Chỉ dùng bàn phím
- **WHEN** người dùng chỉ dùng bàn phím để dán văn bản, xem trước và xác nhận
- **THEN** hoàn tất được mà không cần chuột

#### Scenario: Chương dài
- **WHEN** người dùng dán văn bản 300.000 ký tự
- **THEN** xem trước hiện trong chưa đầy 1 giây và các nút vẫn phản hồi
