## Purpose

Định nghĩa mode Từng câu của một chương: soát và viết bản dịch từng hàng bên cạnh câu gốc, biết hàng nào đã làm, hàng nào cần làm, và đi tới hàng kế tiếp mà không phải cuộn tìm. Mode này và mode Toàn văn là hai cách nhìn của cùng một văn bản dịch.

## ADDED Requirements

### Requirement: Các hàng theo segment bản gốc

Ở mode Từng câu, màn SHALL liệt kê mỗi segment bản gốc của chương thành một hàng theo đúng thứ tự, mỗi hàng có số hàng, văn bản gốc chỉ đọc (đúng phông chữ theo ngôn ngữ nguồn) và ô bản dịch của hàng. Ô bản dịch SHALL hiện bản dịch của hàng theo đặc tả `segment-links`, và SHALL sửa được trực tiếp bằng bàn phím với tiếng Việt có dấu, kể cả Telex và VNI. Danh sách SHALL phân trang theo số hàng cố định để chương 5.000 hàng mở và đổi trang không làm giao diện đứng. Chương chưa có bản gốc SHALL không có mode này.

#### Scenario: Chương có bản gốc và một nửa đã dịch
- **WHEN** người dùng chuyển sang Từng câu ở chương có 40 segment gốc, trong đó 20 hàng đã có bản dịch
- **THEN** hiện 40 hàng theo thứ tự, 20 hàng có chữ dịch và 20 hàng có ô trống

#### Scenario: Chương dài
- **WHEN** người dùng mở Từng câu ở chương có 5.000 hàng
- **THEN** trang đầu hiện ngay và đổi trang không đứng hình

### Requirement: Trạng thái và điều hướng hàng

Mỗi hàng SHALL hiện nhãn trạng thái bằng chữ (*Chưa dịch*, *AI đã dịch*, *Đã soát*, *Cần kiểm tra*) chứ không chỉ bằng màu. Đầu màn SHALL hiện số hàng ở từng trạng thái. Màn SHALL có hành động "Hàng cần xử lý kế tiếp" nhảy tới hàng gần nhất phía sau hàng đang chọn mà chưa *Đã soát* (vòng lại từ đầu khi hết), đổi sang trang chứa hàng đó và đưa con trỏ vào ô bản dịch của nó; khi mọi hàng đã *Đã soát* SHALL báo điều đó và không đổi gì.

#### Scenario: Nhảy hàng kế
- **WHEN** người dùng đang ở hàng 3 và các hàng 4 và 5 đã *Đã soát*, hàng 6 *Chưa dịch*
- **THEN** "Hàng cần xử lý kế tiếp" đưa con trỏ vào ô của hàng 6, kể cả khi hàng 6 nằm ở trang khác

#### Scenario: Xong hết
- **WHEN** mọi hàng đều *Đã soát* và người dùng bấm "Hàng cần xử lý kế tiếp"
- **THEN** màn báo đã hết hàng cần xử lý và vị trí không đổi

### Requirement: Sửa và xác nhận hàng

Sửa ô bản dịch của một hàng SHALL được ghi khi người dùng rời ô hoặc bấm Enter (Shift+Enter không xuống dòng: ô là một đoạn), và hàng SHALL thành *Đã soát*. Enter SHALL ghi rồi đưa con trỏ sang ô của hàng kế tiếp. Ctrl+Enter SHALL xác nhận hàng (kể cả khi không sửa gì và hàng đang *AI đã dịch* hay *Cần kiểm tra*) rồi nhảy tới hàng cần xử lý kế tiếp. Chỉ ô thực sự đổi mới được ghi; rời ô mà không sửa gì SHALL không ghi gì. Trong lúc ghi, ô SHALL giữ chữ người dùng đã gõ; ghi lỗi SHALL hiện ngay dưới hàng, giữ nguyên chữ và cho thử lại.

#### Scenario: Viết bản dịch rồi sang hàng kế
- **WHEN** người dùng gõ bản dịch vào ô hàng 7 trống và bấm Enter
- **THEN** bản dịch được ghi, hàng 7 là *Đã soát*, và con trỏ vào ô hàng 8

#### Scenario: Rời ô không sửa
- **WHEN** người dùng nhấp vào ô hàng đã có bản dịch rồi nhấp ra ngoài mà không gõ gì
- **THEN** không có lần ghi nào và trạng thái hàng không đổi

#### Scenario: Xác nhận hàng AI
- **WHEN** hàng đang *AI đã dịch* và người dùng bấm Ctrl+Enter trong ô của nó
- **THEN** hàng thành *Đã soát* mà văn bản không đổi, và con trỏ nhảy tới hàng cần xử lý kế tiếp

#### Scenario: Ghi lỗi
- **WHEN** việc ghi một hàng báo lỗi
- **THEN** dưới hàng hiện lỗi bằng lời dễ hiểu, chữ đã gõ còn nguyên trong ô, và có nút thử lại

### Requirement: Xung đột revision

Khi bản dịch đã bị đổi ở nơi khác kể từ lần màn đọc, ghi một hàng SHALL bị từ chối theo đặc tả `segment-links`; màn SHALL hiện thông báo xung đột nêu rõ chuyện gì xảy ra, giữ nguyên chữ người dùng đã gõ ở ô (có thể sao chép), và đưa nút "Tải lại" để đọc lại bản dịch và liên kết. Màn SHALL không tự ghi đè và không tự gộp.

#### Scenario: Bản dịch đổi ở cửa sổ khác
- **WHEN** bản dịch bị thay ở nơi khác rồi người dùng sửa một hàng
- **THEN** hàng báo xung đột, chữ trong ô còn nguyên và dữ liệu trong kho không đổi

### Requirement: Ghép bản dịch viết sẵn

Khi chương có segment dịch chưa được liên kết với hàng nào và có hàng chưa có bản dịch, màn SHALL báo số segment dịch chưa ghép và có hành động "Ghép theo thứ tự" theo đặc tả `segment-links`; sau khi ghép màn SHALL hiện số cặp đã ghép và các hàng đó là *Cần kiểm tra*. Khi không có gì để ghép, hành động đó SHALL không hiện. Màn SHALL không hiện hay sửa các segment dịch chưa ghép như hàng.

#### Scenario: Bản dịch viết ở Toàn văn
- **WHEN** người dùng đã viết 30 câu dịch ở Toàn văn rồi chuyển sang Từng câu ở chương có 30 hàng chưa dịch
- **THEN** màn báo 30 câu dịch chưa ghép, "Ghép theo thứ tự" nối chúng với 30 hàng và tất cả là *Cần kiểm tra*

### Requirement: Chuyển mode không mất chữ

Chuyển giữa "Toàn văn" và "Từng câu" SHALL không làm mất chữ chưa lưu. Chuyển sang Từng câu khi Toàn văn còn thay đổi chưa lưu SHALL hỏi xác nhận với ba lựa chọn (lưu rồi chuyển, bỏ thay đổi, ở lại) theo yêu cầu chặn rời; chuyển sang Toàn văn khi ô của một hàng đang có chữ chưa ghi SHALL ghi hàng đó trước, và nếu ghi lỗi thì ở lại Từng câu. Khi quay lại Toàn văn, bản dịch SHALL hiện đúng văn bản đã ghi từ các hàng và bản gốc SHALL hiện như trước. Lịch sử hoàn tác của từng editor SHALL bắt đầu lại khi đổi mode.

#### Scenario: Viết hàng rồi xem toàn văn
- **WHEN** người dùng viết bản dịch cho hàng 1 và hàng 2 ở Từng câu rồi chuyển sang Toàn văn
- **THEN** pane dịch hiện hai câu đó đúng thứ tự, đúng chỗ xuống dòng theo bản gốc

#### Scenario: Toàn văn chưa lưu
- **WHEN** người dùng sửa bản dịch ở Toàn văn và bấm "Từng câu"
- **THEN** hiện hộp ba lựa chọn và chỉ chuyển khi chọn lưu (thành công) hoặc bỏ

### Requirement: Bàn phím và công nghệ hỗ trợ

Mỗi ô bản dịch SHALL có tên đọc được nêu số hàng. Nhãn trạng thái và thông báo ghi, lỗi, xung đột SHALL được đọc bằng `role="status"` hoặc `role="alert"`. Tab và Shift+Tab SHALL đi qua các ô và điều khiển không bị giữ lại; focus nhìn thấy. Bố cục SHALL không cuộn ngang ở chiều rộng 940 px, hai cột nguồn/dịch vẫn đọc được.

#### Scenario: Đọc ô
- **WHEN** focus vào ô của hàng 12
- **THEN** trình đọc màn hình nêu "Bản dịch hàng 12" và trạng thái hiện tại của hàng
