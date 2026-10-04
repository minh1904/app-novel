## Purpose

Định dạng và kiểm tra bộ chương mẫu (fixture) mà Bộ đo dùng để đo chất lượng bản dịch: văn bản nguồn, glossary, ma trận xưng hô, quy tắc kiểm viết tay và bản tham chiếu; tách phần công khai khỏi phần có bản quyền.

## ADDED Requirements

### Requirement: Cấu trúc một tác phẩm fixture

Mỗi tác phẩm fixture SHALL là một thư mục gồm:
- `work.json`: ngôn ngữ nguồn, một trong `en`, `zh-Hans`, `zh-Hant`, `ja`; tên, nguồn và quyền sử dụng;
- `glossary.json`: các mục `src` → `tgt`, tùy chọn `aliases`, `alternatives` (cách dịch chấp nhận được), `forbidden`, `decision`;
- `pronouns.json`: ngôi kể theo điểm nhìn, và các cặp người nói → người nghe với cách tự xưng, cách gọi, chương bắt đầu hiệu lực;
- một thư mục cho mỗi chương: `source.txt`, `meta.json`, `assertions.json`, tùy chọn `reference.vi.txt`.

Bộ nạp SHALL từ chối một tác phẩm thiếu tệp bắt buộc hoặc có tệp sai hình dạng, và SHALL nói rõ tệp nào, trường nào.

#### Scenario: Fixture đúng hình dạng
- **WHEN** một tác phẩm có đủ tệp và mọi trường đúng kiểu
- **THEN** bộ nạp trả về tác phẩm với danh sách chương theo thứ tự tên thư mục

#### Scenario: Thiếu văn bản nguồn
- **WHEN** một thư mục chương không có `source.txt`
- **THEN** bộ nạp từ chối tác phẩm và báo đường dẫn chương thiếu tệp

#### Scenario: Ngôn ngữ không hỗ trợ
- **WHEN** `work.json` khai ngôn ngữ `ko`
- **THEN** bộ nạp từ chối tác phẩm và nêu các ngôn ngữ được nhận

### Requirement: Phần công khai và phần riêng tư

Fixture SHALL nằm ở hai nơi:
- `fixtures/public/`: được đưa vào repo. Mỗi tác phẩm ở đây SHALL khai nguồn và quyền sử dụng (phạm vi công cộng hoặc giấy phép mở), và SHALL kèm văn bản giấy phép khi giấy phép đòi hỏi.
- `fixtures/private/`: không bao giờ được theo dõi bởi Git; dùng cho raw có bản quyền.

Thiếu thư mục riêng tư SHALL không làm lần chạy thất bại. Báo cáo của mỗi lần chạy SHALL liệt kê các tác phẩm đã dùng.

#### Scenario: Máy không có fixture riêng tư
- **WHEN** chạy Bộ đo trên một bản checkout sạch, không có `fixtures/private/`
- **THEN** lần chạy dùng các tác phẩm công khai, và báo cáo liệt kê đúng các tác phẩm đó

#### Scenario: Tác phẩm công khai thiếu quyền sử dụng
- **WHEN** một tác phẩm trong `fixtures/public/` không khai quyền sử dụng
- **THEN** bộ nạp từ chối tác phẩm đó

#### Scenario: Raw riêng tư không vào repo
- **WHEN** một tệp được tạo trong `fixtures/private/`
- **THEN** Git coi tệp đó là bị bỏ qua, và lệnh thêm toàn bộ thư mục `fixtures/` không đưa nó vào

### Requirement: Đoạn của văn bản nguồn

Đoạn của `source.txt` SHALL là mỗi dòng không trống, theo quyết định 3 của ADR-005. Dòng chỉ có khoảng trắng, kể cả U+3000, SHALL là dòng trống. Kiểu xuống dòng (LF, CRLF, CR) SHALL không đổi số đoạn.

#### Scenario: Tệp được checkout ra CRLF
- **WHEN** cùng một `source.txt` được đọc với xuống dòng LF và với CRLF
- **THEN** số đoạn và nội dung từng đoạn giống hệt nhau

#### Scenario: Dòng chỉ có U+3000
- **WHEN** dòng cuối của chương chỉ gồm một ký tự U+3000
- **THEN** dòng đó không được tính là một đoạn

### Requirement: Quy tắc kiểm viết tay neo theo nội dung

Mỗi quy tắc trong `assertions.json` SHALL neo vào một đoạn nguồn bằng nội dung, không bằng số thứ tự. Có hai cách neo:
- `where`: một chuỗi SHALL khớp đúng một đoạn nguồn;
- `line`: SHALL bằng đúng một đoạn nguồn, sau khi bỏ khoảng trắng hai đầu.

Quy tắc có `pair` SHALL trỏ tới một cặp có trong `pronouns.json` của tác phẩm. Bộ nạp SHALL từ chối quy tắc vi phạm một trong các điều trên và nêu quy tắc đó.

#### Scenario: Chuỗi neo khớp hai đoạn
- **WHEN** một quy tắc có `where` khớp hai đoạn nguồn
- **THEN** bộ nạp từ chối, nêu chuỗi neo và số đoạn đã khớp

#### Scenario: Cặp xưng hô không có trong ma trận
- **WHEN** một quy tắc có `pair` là một cặp không khai trong `pronouns.json`
- **THEN** bộ nạp từ chối và nêu cặp đó

### Requirement: Glossary có xuất hiện và có trạng thái duyệt

Mỗi mục glossary SHALL xuất hiện ít nhất một lần trong các chương của tác phẩm. Cách đếm SHALL là khớp dài trước (một dạng viết đã nằm trong mục dài hơn thì không tính cho mục ngắn), tính cả `aliases`, và không phân biệt hoa thường khi nguồn là tiếng Anh. Mục không xuất hiện SHALL bị báo.

Glossary và ma trận xưng hô SHALL ghi trạng thái duyệt (`draft` hoặc `approved`, kèm ngày và người duyệt). Báo cáo đo SHALL hiện trạng thái này cạnh các số tuân thủ glossary.

#### Scenario: Họ chỉ nằm trong tên đầy đủ
- **WHEN** mục "シュテルンハイム" chỉ xuất hiện bên trong "イレーヌ・フォン・シュテルンハイム", và tên đầy đủ có mục riêng
- **THEN** bộ nạp báo mục "シュテルンハイム" không xuất hiện

#### Scenario: Lời in hoa trong nguồn tiếng Anh
- **WHEN** nguồn tiếng Anh viết "YISINI" và glossary có mục "Yisini"
- **THEN** mục đó được tính là có xuất hiện

#### Scenario: Glossary chưa duyệt
- **WHEN** báo cáo dùng một glossary có trạng thái `draft`
- **THEN** cột tuân thủ glossary ghi rõ số đo dựa trên glossary chưa duyệt

### Requirement: Bản tham chiếu tùy chọn

Khi có `reference.vi.txt`, tệp này SHALL có cùng số đoạn với `source.txt`, đoạn thứ *i* là bản dịch của đoạn nguồn thứ *i*. `work.json` SHALL ghi rõ các hạn chế đã biết của bản tham chiếu. Báo cáo SHALL không gọi bản tham chiếu là "chuẩn vàng".

#### Scenario: Bản tham chiếu lệch số đoạn
- **WHEN** `reference.vi.txt` có 56 đoạn trong khi nguồn có 57
- **THEN** bộ nạp từ chối bản tham chiếu và vẫn nạp phần còn lại của chương
