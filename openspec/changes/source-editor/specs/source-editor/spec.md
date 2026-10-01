## Purpose

Định nghĩa trình soạn thảo văn bản của một chương: hiển thị đúng văn bản đã lưu, sửa an toàn với bộ gõ tiếng Việt và tiếng Trung, lưu mà không ghi đè thay đổi của nơi khác, và đủ nhanh cho chương dài. Đây là nền để hai mode soát và sửa sau này dùng chung một văn bản.

## ADDED Requirements

### Requirement: Hiển thị đúng văn bản đã lưu

Editor SHALL hiển thị văn bản của chương đúng từng ký tự như đã lưu, không chuẩn hóa hay đổi gì khi mở, kể cả thụt đầu dòng U+3000 và khoảng trắng cuối dòng. Văn bản SHALL tự xuống dòng trong khung, không cuộn ngang, và SHALL dùng phông chữ theo ngôn ngữ của văn bản (ngôn ngữ nguồn của tác phẩm cho bản gốc). Lề SHALL hiện số dòng bình thường (1, 2, 3… theo từng dòng của văn bản, kể cả dòng trống) bằng cùng phông chữ và cỡ chữ với văn bản. Vì một dòng thường chứa nhiều câu nên lề không đánh số segment; ranh giới giữa các segment trong dòng SHALL nhìn thấy được bằng nền xen kẽ rất nhẹ mà không chèn thêm ký tự hay phần tử vào văn bản. Segment đã bị sửa kể từ lần lưu cuối SHALL phân biệt được với segment chưa sửa, và số dòng của dòng có segment bắt đầu và đã sửa SHALL được đánh dấu.

#### Scenario: Mở chương
- **WHEN** người dùng mở chương có bản gốc 40 segment
- **THEN** editor hiện văn bản đúng như đã lưu, ở lề có số dòng liên tiếp 1, 2, 3… (kể cả dòng trống) cùng cỡ chữ với văn bản, ranh giới giữa các câu trong cùng dòng nhìn thấy được, và không có segment nào bị đánh dấu đã sửa

#### Scenario: Phông chữ Nhật
- **WHEN** tác phẩm có ngôn ngữ nguồn tiếng Nhật
- **THEN** văn bản dùng phông chữ hợp tiếng Nhật chứ không phải phông tiếng Trung

#### Scenario: Cửa sổ hẹp
- **WHEN** cửa sổ ở chiều rộng tối thiểu 940 px và chương có dòng rất dài
- **THEN** dòng xuống hàng trong khung editor, không xuất hiện thanh cuộn ngang

### Requirement: Sửa văn bản

Người dùng SHALL sửa được văn bản trực tiếp trong editor bằng bàn phím, chuột, kéo thả chữ, sao chép, cắt và dán. Xuống dòng SHALL luôn được lưu là một ký tự LF. Khi dán văn bản có CRLF hoặc CR, chúng SHALL được đổi thành LF. Editor SHALL không tự sửa chữ người dùng gõ (không tự viết hoa, không tự đóng ngoặc, không tự thụt dòng).

#### Scenario: Dán văn bản từ Windows
- **WHEN** người dùng dán văn bản có xuống dòng CRLF
- **THEN** văn bản trong editor và khi lưu chỉ có LF

#### Scenario: Không tự đóng ngoặc
- **WHEN** người dùng gõ dấu “
- **THEN** chỉ có đúng dấu “ được thêm, không có dấu ” tự sinh

### Requirement: Lưu văn bản

Người dùng SHALL lưu bằng Ctrl+S (Cmd+S trên macOS) và bằng một nút "Lưu". Lưu SHALL gửi văn bản cùng tập segment đã chia lại (theo đặc tả `segment-mapping`) cho kho trong một thao tác, kèm revision lần đọc hoặc lưu gần nhất. Editor SHALL hiện trạng thái rõ ràng: "đã lưu", "chưa lưu" khi có thay đổi chưa lưu, và "đang lưu" trong lúc ghi. Lưu thành công SHALL cập nhật revision của editor và số segment, số ký tự hiển thị, mà không làm mất vị trí con trỏ hay vị trí cuộn. Lưu khi không có thay đổi SHALL không ghi gì. Bản lưu SHALL không đổi văn bản người dùng đang thấy.

#### Scenario: Sửa rồi lưu
- **WHEN** người dùng sửa một từ rồi bấm Ctrl+S
- **THEN** trạng thái chuyển "chưa lưu" → "đang lưu" → "đã lưu", đóng và mở lại chương cho đúng văn bản đã sửa, và các segment không đụng tới giữ ID cũ

#### Scenario: Lưu khi không đổi gì
- **WHEN** người dùng bấm Ctrl+S ngay sau khi mở chương
- **THEN** không có lần ghi nào và revision không đổi

#### Scenario: Con trỏ sau khi lưu
- **WHEN** người dùng lưu lúc con trỏ ở giữa chương
- **THEN** con trỏ và vị trí cuộn giữ nguyên

#### Scenario: Văn bản quá dài
- **WHEN** người dùng sửa để văn bản vượt giới hạn của kho
- **THEN** việc lưu bị từ chối với thông báo nêu giới hạn, văn bản trong editor còn nguyên và vẫn đánh dấu chưa lưu

#### Scenario: Ghi lỗi
- **WHEN** kho báo lỗi khi ghi
- **THEN** editor hiện lỗi bằng lời dễ hiểu, giữ nguyên văn bản đang sửa và trạng thái chưa lưu, và cho thử lại

### Requirement: Xung đột revision không ghi đè

Khi revision đã đổi kể từ lần editor đọc (văn bản bị thay ở nơi khác, ví dụ qua "Thay bản gốc" hoặc cửa sổ khác), lưu SHALL bị từ chối và SHALL không thay đổi dữ liệu trong kho. Editor SHALL giữ nguyên bản đang sửa, hiện thông báo xung đột nêu rõ chuyện gì xảy ra, và đưa ra hai lối: sao chép toàn bộ văn bản đang sửa ra bộ nhớ tạm, và "Tải lại bản đã lưu" (bỏ thay đổi của mình, sau khi xác nhận). Hệ thống SHALL không tự gộp hai bản.

#### Scenario: Văn bản đổi từ nơi khác
- **WHEN** người dùng đang sửa chương, văn bản của chương đó bị thay ở nơi khác, rồi người dùng bấm Ctrl+S
- **THEN** kho giữ nguyên bản đã thay, editor báo xung đột và vẫn giữ đủ chữ người dùng đang sửa

#### Scenario: Tải lại sau xung đột
- **WHEN** người dùng chọn "Tải lại bản đã lưu" và xác nhận
- **THEN** editor hiện bản trong kho với revision mới, bỏ các sửa chưa lưu, và có thể lưu bình thường sau đó

### Requirement: Rời khỏi khi còn thay đổi chưa lưu

Khi còn thay đổi chưa lưu, mọi hành động trong ứng dụng làm mất editor (về tác phẩm, mở chương khác, "Thay bản gốc") SHALL hỏi xác nhận với ba lựa chọn: lưu rồi tiếp tục, bỏ thay đổi, ở lại. Đóng cửa sổ SHALL hỏi bằng hộp xác nhận của hệ điều hành với hai lựa chọn "Ở lại" và "Đóng và bỏ thay đổi", vì việc lưu bất đồng bộ không thể chờ trong lúc cửa sổ đóng. Chọn "ở lại" hoặc đóng hộp hỏi SHALL giữ nguyên editor. Khi không có thay đổi chưa lưu, các hành động này SHALL không hỏi.

#### Scenario: Đóng cửa sổ khi chưa lưu
- **WHEN** người dùng có thay đổi chưa lưu và đóng cửa sổ
- **THEN** hiện hộp hai lựa chọn; chọn "Ở lại" thì cửa sổ và editor giữ nguyên

#### Scenario: Về tác phẩm khi chưa lưu
- **WHEN** người dùng sửa một từ rồi bấm "Về tác phẩm"
- **THEN** hiện hộp xác nhận ba lựa chọn, và chọn "Lưu" thì lưu xong mới về

#### Scenario: Thay bản gốc khi chưa lưu
- **WHEN** người dùng đang có thay đổi chưa lưu và bấm "Thay bản gốc"
- **THEN** hệ thống hỏi cách xử lý thay đổi chưa lưu trước khi mở luồng thay, và không mở luồng đó nếu người dùng chọn ở lại

### Requirement: Hoàn tác và làm lại chung một lịch sử

Editor SHALL có đúng một lịch sử hoàn tác/làm lại cho văn bản của chương, dùng Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, và lịch sử này SHALL bao gồm cả thay đổi của tập segment theo đặc tả `segment-mapping`. Lịch sử SHALL không bị xóa khi lưu: hoàn tác sau khi lưu vẫn hoạt động và đánh dấu lại là chưa lưu. Lịch sử bị bỏ khi tải lại bản đã lưu hoặc khi văn bản bị thay.

#### Scenario: Hoàn tác sau khi lưu
- **WHEN** người dùng sửa một từ, lưu, rồi bấm Ctrl+Z
- **THEN** văn bản trở lại như trước khi sửa và trạng thái là "chưa lưu"

#### Scenario: Hoàn tác nhiều bước
- **WHEN** người dùng gõ ba từ khác nhau ở ba chỗ rồi hoàn tác ba lần
- **THEN** văn bản và segment trở về trạng thái ban đầu

### Requirement: Tương thích bộ gõ (IME)

Editor SHALL nhận chữ từ bộ gõ tiếng Việt (Telex, VNI) và tiếng Trung (Pinyin) trong Electron 44 mà không mất, nhân đôi hay đổi sai ký tự, kể cả ký tự đầu tiên của lần soạn đầu tiên sau khi cửa sổ lấy focus hoặc sau khi nhấp vào editor. Trong lúc có đoạn chữ soạn dở, editor SHALL không thay đổi, thay thế hay dựng lại phần văn bản chứa đoạn đó, và các thao tác nền (tự chia lại, cập nhật chỉ báo, lưu) SHALL không làm đoạn đó mất hay nhảy. Bảng ca kiểm chứng ở dưới SHALL được người dùng gõ tay trên máy thật và ghi kết quả; một ca thất bại SHALL chặn việc coi change này là xong.

Bảng ca (mỗi ca thử với từng bộ gõ Telex, VNI, Pinyin nếu áp dụng; "đầu tiên" là ngay sau khi nhấp vào editor hoặc sau khi chuyển cửa sổ rồi quay lại):

| # | Ca | Kết quả đúng |
| --- | --- | --- |
| 1 | Gõ "Vieetj nam" (Telex), "Vie65t nam" (VNI), "nihao" rồi chọn 你好 (Pinyin) ở **đầu tiên** | Ra "Việt nam", "Việt nam", "你好"; ký tự đầu không mất |
| 2 | Gõ dở một từ rồi nhấp sang chỗ khác | Từ được chốt đúng tại chỗ cũ, không nhảy |
| 3 | Gõ ở giữa một câu của segment | Chữ ra đúng chỗ; segment giữ ID; không nhấp nháy ranh giới |
| 4 | Gõ ngay cuối segment và ngay đầu segment | Chữ thuộc segment đúng theo quy tắc ranh giới |
| 5 | Gõ dở rồi bấm Ctrl+S | Việc lưu đợi đoạn đang soạn được chốt rồi mới ghi; chữ vừa chốt có trong bản lưu; không mất hay nhảy chữ |
| 6 | Gõ dở rồi bấm Ctrl+Z | Không mất chữ đã chốt trước đó; không hỏng trạng thái editor |
| 7 | Gõ một đoạn dài (≥ 200 chữ) liên tục, sau đó sửa lại giữa chương | Không rớt chữ, không trễ nhìn thấy được |
| 8 | Chọn một vùng nhiều segment rồi gõ đè bằng bộ gõ | Vùng được thay đúng; ID theo quy tắc xóa trùm |
| 9 | Mở lại chương và gõ ngay sau khi cửa sổ vừa lấy focus | Như ca 1 |

#### Scenario: Ký tự đầu tiên
- **WHEN** người dùng nhấp vào editor chương và gõ "Vieetj" bằng Telex ngay lần soạn đầu tiên
- **THEN** văn bản có "Việt", không thiếu chữ V, không có "Viêtj" hay ký tự thừa

#### Scenario: Pinyin
- **WHEN** người dùng gõ "nihao" bằng Pinyin giữa một câu tiếng Trung rồi chọn "你好"
- **THEN** "你好" ra đúng chỗ con trỏ, không có chữ latinh thừa

#### Scenario: Lưu khi đang soạn dở
- **WHEN** người dùng bấm Ctrl+S giữa lúc một từ Telex chưa chốt
- **THEN** việc lưu chờ đến khi từ được chốt, rồi lưu văn bản có từ đó, và không có ký tự nào bị mất hay nhân đôi

#### Scenario: Tự chia lại khi đang soạn
- **WHEN** chu kỳ chia lại định kỳ tới hạn lúc người dùng đang có đoạn soạn dở
- **THEN** văn bản đang hiện không đổi và đoạn soạn dở không bị gián đoạn

### Requirement: Hiệu năng với chương dài

Editor SHALL mở và dùng được chương 5.000 segment (khoảng 200.000 ký tự). Với chương đó, từ lúc bấm mở chương tới lúc hiện văn bản và nhận phím SHALL không quá 500 ms trên máy phát triển; gõ một ký tự SHALL được xử lý xong (từ lúc nhận phím tới lúc DOM đã cập nhật, không tính thời gian chờ làm mới màn hình) trong 16 ms ở phân vị 95; cuộn từ đầu tới cuối chương SHALL không rớt khung hình kéo dài quá 100 ms; lưu chương SHALL không làm đơ giao diện quá 200 ms (phần ghi chạy ở nền, giao diện hiện trạng thái đang lưu). Các số này SHALL được đo trong Electron thật và ghi lại.

#### Scenario: Mở chương 5.000 segment
- **WHEN** người dùng mở chương có 5.000 segment
- **THEN** văn bản hiện và nhận phím trong 500 ms

#### Scenario: Gõ trong chương dài
- **WHEN** người dùng gõ liên tục vào giữa chương 5.000 segment
- **THEN** thời gian xử lý mỗi phím (tới lúc DOM cập nhật) ở phân vị 95 không quá 16 ms

### Requirement: Dùng được bằng bàn phím và công nghệ hỗ trợ

Editor SHALL là một ô soạn thảo nhiều dòng có tên đọc được ("Bản gốc của chương" hoặc tên tương ứng với bên văn bản), nhận focus bằng Tab và rời focus bằng Tab hoặc Shift+Tab mà không giữ focus (Tab không chèn ký tự thụt đầu dòng). Mọi hành động (Lưu, Về tác phẩm, Thay bản gốc, các lối xử lý xung đột) SHALL dùng được bằng bàn phím với focus nhìn thấy. Trạng thái lưu, xung đột và lỗi SHALL được thông báo cho công nghệ hỗ trợ (`role="status"` hoặc `role="alert"`) và không chỉ bằng màu.

#### Scenario: Rời editor bằng Tab
- **WHEN** focus đang ở editor và người dùng bấm Tab
- **THEN** focus chuyển tới điều khiển kế tiếp, không có ký tự nào được chèn

#### Scenario: Báo trạng thái
- **WHEN** lưu thành công hoặc gặp xung đột
- **THEN** trạng thái được thông báo cho trình đọc màn hình và có chữ nhìn thấy được, không chỉ đổi màu
