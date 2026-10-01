## Purpose

Định nghĩa mode Toàn văn của một chương: bản gốc và bản dịch hiện cạnh nhau như hai văn bản dài độc lập, bản dịch sửa trực tiếp, bản gốc được bảo vệ khỏi sửa nhầm. Đây là nơi người dịch viết, dán và soát bản dịch trước khi có AI hay mode Từng câu.

## ADDED Requirements

### Requirement: Hai pane độc lập, không đường nối

Khi chương có bản gốc, màn SHALL hiện hai pane cạnh nhau: bản gốc bên trái, bản dịch bên phải, mỗi pane có tiêu đề nêu bên nào và ngôn ngữ (ví dụ "Bản gốc · Trung giản thể", "Bản dịch · Tiếng Việt"). Hai pane SHALL cao bằng vùng làm việc còn lại của cửa sổ và mỗi pane SHALL cuộn riêng theo nội dung của nó. Màn SHALL không vẽ số nối, đường nối hay ép hai bên cùng số dòng hoặc cùng chiều cao hàng, và SHALL không bắt buộc hai bên cuộn cùng nhau. Ở chiều rộng cửa sổ tối thiểu 940 px hai pane SHALL vẫn nằm cạnh nhau và trang SHALL không cuộn ngang.

#### Scenario: Hai bên lệch độ dài
- **WHEN** bản gốc có 5.000 segment còn bản dịch mới có 40 dòng
- **THEN** mỗi pane cuộn theo nội dung của riêng nó và không có gì kéo bản dịch cho dài bằng bản gốc

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ ở chiều rộng 940 px và thanh bên đang hiện
- **THEN** hai pane vẫn cạnh nhau, dòng dài xuống hàng trong từng pane, trang không có thanh cuộn ngang

### Requirement: Bản gốc khóa mặc định

Mỗi lần mở màn, pane bản gốc SHALL ở trạng thái khóa: không gõ, xóa hay dán được, nhưng vẫn chọn, sao chép và cuộn được; trạng thái khóa SHALL nhìn thấy bằng chữ. Nút "Sửa bản gốc" SHALL mở khóa cho pane đó, khi mở khóa pane SHALL hiện dòng nhắc rằng đây là thao tác sửa lỗi bản gốc, và nút đổi thành "Khóa lại". Sửa khi đã mở khóa SHALL theo đặc tả `source-editor` (hoàn tác, lưu, xung đột). "Khóa lại" khi còn thay đổi chưa lưu SHALL không làm mất chúng: pane khóa lại nhưng vẫn giữ văn bản đã sửa và trạng thái chưa lưu.

#### Scenario: Mở màn
- **WHEN** người dùng mở một chương có bản gốc
- **THEN** pane bản gốc ghi trạng thái đã khóa, gõ vào đó không đổi gì, và có thể chọn và sao chép chữ

#### Scenario: Sửa lỗi bản gốc
- **WHEN** người dùng bấm "Sửa bản gốc", sửa một lỗi chính tả và bấm Ctrl+S
- **THEN** bản gốc được lưu theo đặc tả `source-editor` và pane vẫn ở trạng thái mở khóa với nút "Khóa lại"

#### Scenario: Khóa lại khi chưa lưu
- **WHEN** người dùng sửa bản gốc rồi bấm "Khóa lại" mà chưa lưu
- **THEN** pane khóa lại, văn bản đã sửa còn nguyên và vẫn báo chưa lưu

### Requirement: Soạn bản dịch trực tiếp

Pane bản dịch SHALL sửa được trực tiếp ngay khi mở (gõ, dán, xóa, hoàn tác) bằng cùng trình soạn thảo của `source-editor`, với ngôn ngữ văn bản là tiếng Việt cho phông chữ và chia câu. Khi chương chưa có bản dịch, pane SHALL hiện một gợi ý nêu cách bắt đầu (gõ hoặc dán bản dịch) mà gợi ý đó SHALL không phải là chữ trong văn bản và SHALL biến mất khi có chữ. Dán bản dịch toàn văn có sẵn SHALL giữ nguyên chữ, chỉ đổi xuống dòng CRLF/CR thành LF. Segment của bản dịch SHALL hiện ở lề và được chia theo quy tắc chia câu cho tiếng Việt, theo đặc tả `segment-mapping`. Lần lưu đầu tiên SHALL tạo bản dịch của chương mà không cần có bản dịch trước, và sau đó danh sách chương SHALL cho thấy chương đã có bản dịch.

#### Scenario: Bắt đầu từ chương chưa dịch
- **WHEN** người dùng mở chương chưa có bản dịch
- **THEN** pane dịch trống với gợi ý, gõ chữ đầu tiên làm gợi ý biến mất, và lưu được

#### Scenario: Dán bản dịch có sẵn
- **WHEN** người dùng dán một bản dịch 3.000 chữ nhiều đoạn vào pane dịch trống
- **THEN** văn bản hiện đúng như đã dán, các segment hiện ở lề, và lưu được bản dịch đó

#### Scenario: Danh sách chương sau khi dịch
- **WHEN** người dùng lưu bản dịch đầu tiên của một chương rồi về màn chi tiết tác phẩm
- **THEN** chương đó được hiển thị là đã có bản dịch

### Requirement: Reading view cho bản dịch

Pane bản dịch SHALL có hai cách xem chuyển được bằng một điều khiển có tên "Soạn thảo" và "Đọc". "Đọc" SHALL hiển thị cùng văn bản ở dạng chỉ đọc để đọc liền mạch: mỗi dòng văn bản là một đoạn, dòng trống thành khoảng cách giữa các đoạn, không hiện số segment hay dấu đã sửa, phông chữ và cỡ chữ để đọc dài. Chuyển giữa hai cách xem SHALL không đổi, mất hay đánh dấu lại văn bản; chữ chưa lưu SHALL xuất hiện đúng trong chế độ đọc, và hoàn tác SHALL còn dùng được khi quay lại "Soạn thảo". Reading view SHALL không diễn giải cú pháp Markdown trong change này.

#### Scenario: Đọc bản đang sửa
- **WHEN** người dùng sửa bản dịch chưa lưu rồi chuyển sang "Đọc"
- **THEN** Reading view hiện đúng văn bản đã sửa, trạng thái vẫn là chưa lưu

#### Scenario: Quay lại soạn thảo
- **WHEN** người dùng chuyển "Đọc" rồi "Soạn thảo" và bấm Ctrl+Z
- **THEN** hoàn tác vẫn đưa văn bản về trước lần sửa gần nhất

### Requirement: Lưu hai bên

Nút "Lưu" và Ctrl+S (Cmd+S trên macOS) SHALL lưu mọi pane đang có thay đổi chưa lưu, mỗi bên qua kho riêng với revision riêng. Mỗi pane SHALL có trạng thái riêng ("đã lưu", "chưa lưu", "đang lưu"), và lỗi, xung đột revision của một bên SHALL hiện ở đúng pane đó theo đặc tả `source-editor` mà không làm mất thay đổi chưa lưu của bên kia hay đổi trạng thái của bên kia. Khi chỉ một bên có thay đổi, bên kia SHALL không bị ghi. Nút "Lưu" SHALL tắt khi cả hai bên đã lưu.

#### Scenario: Sửa cả hai bên
- **WHEN** người dùng sửa một lỗi bản gốc (đã mở khóa) và gõ thêm bản dịch rồi bấm Ctrl+S
- **THEN** cả hai bên được lưu, cả hai pane báo "đã lưu"

#### Scenario: Chỉ sửa bản dịch
- **WHEN** người dùng chỉ sửa bản dịch rồi bấm Ctrl+S
- **THEN** chỉ bản dịch được ghi, bản gốc không bị ghi và không đổi revision

#### Scenario: Một bên xung đột
- **WHEN** bản dịch đã bị đổi ở nơi khác còn người dùng đang sửa cả hai bên và bấm Ctrl+S
- **THEN** bản gốc lưu được, pane dịch báo xung đột và giữ nguyên chữ đang sửa

### Requirement: Rời màn khi còn thay đổi chưa lưu

Yêu cầu "Rời khỏi khi còn thay đổi chưa lưu" của đặc tả `source-editor` SHALL áp dụng cho cả hai bên: có thay đổi chưa lưu ở bên nào cũng phải hỏi, "Lưu rồi tiếp tục" SHALL lưu mọi bên có thay đổi và chỉ tiếp tục khi tất cả thành công, "Bỏ thay đổi" SHALL bỏ thay đổi của mọi bên.

#### Scenario: Chỉ bản dịch chưa lưu
- **WHEN** người dùng chỉ sửa bản dịch rồi bấm "Về tác phẩm"
- **THEN** hiện hộp xác nhận ba lựa chọn, và chọn "Lưu rồi tiếp tục" thì lưu bản dịch rồi mới về

#### Scenario: Một bên lưu lỗi
- **WHEN** chọn "Lưu rồi tiếp tục" mà một bên báo lỗi
- **THEN** không rời màn, lỗi hiện ở pane đó và các thay đổi vẫn còn

### Requirement: Chọn mode

Màn SHALL có điều khiển chọn mode với hai lựa chọn "Toàn văn" và "Từng câu". "Toàn văn" SHALL là mode đang dùng. "Từng câu" SHALL hiện nhãn "Sắp có", không chọn được và không đổi gì; không có màn giữ chỗ.

#### Scenario: Chọn Từng câu
- **WHEN** người dùng bấm "Từng câu"
- **THEN** không có gì thay đổi và lựa chọn đó được báo là chưa dùng được cho trình đọc màn hình

### Requirement: Chế độ tập trung

Màn SHALL có nút "Tập trung" ẩn thanh bên để hai pane rộng ra, và nút đó SHALL đổi thành "Hiện điều hướng" để trả lại thanh bên. Chuyển chế độ SHALL không làm mất văn bản, con trỏ hay thay đổi chưa lưu của hai pane. Thao tác này SHALL dùng chung trạng thái ẩn/hiện thanh bên có sẵn của ứng dụng, nên phím tắt ẩn thanh bên cho cùng kết quả.

#### Scenario: Bật tập trung
- **WHEN** người dùng đang sửa bản dịch và bấm "Tập trung"
- **THEN** thanh bên ẩn, hai pane rộng ra, con trỏ và chữ chưa lưu còn nguyên

### Requirement: Bộ gõ và hiệu năng ở bên dịch

Yêu cầu "Tương thích bộ gõ (IME)" của đặc tả `source-editor` SHALL áp dụng cho pane bản dịch với bộ gõ tiếng Việt (Telex, VNI), và bảng ca SHALL được người dùng thử tay lại trên pane này, gồm ca gõ ngay khi bản dịch còn trống (lúc gợi ý đang hiện) và ca chuyển qua lại giữa hai pane bằng chuột và bàn phím. Với chương mà mỗi bên có 5.000 segment (khoảng 200.000 ký tự), màn SHALL mở và nhận phím trong 700 ms, xử lý mỗi phím ở bên nào cũng p95 không quá 16 ms (tính như đặc tả `source-editor`), và lưu cả hai bên không làm giao diện đứng quá 200 ms. Các số này SHALL được đo trong Electron thật và ghi lại.

#### Scenario: Gõ khi bản dịch còn trống
- **WHEN** pane dịch trống đang hiện gợi ý và người dùng gõ "Vieetj" bằng Telex
- **THEN** văn bản có "Việt", không mất ký tự đầu, và gợi ý biến mất

#### Scenario: Hai bên dài
- **WHEN** người dùng mở chương mà bản gốc và bản dịch đều có 5.000 segment
- **THEN** màn mở trong 700 ms và gõ ở bên nào cũng không trễ nhìn thấy được

### Requirement: Dùng được bằng bàn phím và công nghệ hỗ trợ

Mỗi pane SHALL có tên đọc được ("Bản gốc của chương", "Bản dịch của chương") và trạng thái khóa hay mở khóa SHALL được thông báo bằng chữ. Người dùng SHALL chuyển focus giữa các điều khiển và hai pane bằng Tab và Shift+Tab mà không bị giữ trong editor; điều khiển Soạn thảo/Đọc, mở khóa, mode, tập trung và Lưu SHALL dùng được bằng bàn phím với focus nhìn thấy. Reading view SHALL là vùng đọc có tên và cuộn được bằng bàn phím. Trạng thái lưu, xung đột và lỗi theo từng pane SHALL được thông báo bằng `role="status"` hoặc `role="alert"` và không chỉ bằng màu.

#### Scenario: Đi giữa hai pane
- **WHEN** người dùng đang ở pane bản gốc đã khóa và bấm Tab nhiều lần
- **THEN** focus đi qua các điều khiển của hai pane tới pane dịch mà không bị giữ lại

#### Scenario: Báo khóa
- **WHEN** pane bản gốc đổi giữa khóa và mở khóa
- **THEN** trạng thái mới được báo cho công nghệ hỗ trợ bằng chữ
