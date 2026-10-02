## MODIFIED Requirements

### Requirement: Live Preview nhẹ cho bản dịch

Pane bản dịch SHALL hiện định dạng ngay khi gõ cho sáu cú pháp: một dòng bắt đầu bằng `#`, `##` hoặc `###` theo sau một khoảng trắng SHALL hiện phần chữ sau tiền tố với cỡ chữ lớn hơn và đậm hơn văn bản thường (cỡ giảm dần theo số `#`); một đoạn `**chữ**` SHALL hiện phần chữ ở giữa đậm; một đoạn `*chữ*` hoặc `_chữ_` (không thuộc một cặp `**`/`__` đã khớp) SHALL hiện phần chữ ở giữa nghiêng; một đoạn `~~chữ~~` SHALL hiện phần chữ ở giữa gạch ngang; một dòng bắt đầu bằng `>` theo sau một khoảng trắng SHALL hiện phần chữ còn lại của dòng với vạch dọc bên trái và thụt lề; một dòng bắt đầu bằng `-`, `*`, `+` hoặc một số theo sau `.` (ví dụ `1.`), theo sau một khoảng trắng, SHALL hiện dấu đầu dòng mờ hơn văn bản thường.

Với tiêu đề, trích dẫn và danh sách, ký tự cú pháp (`#`/`>`/`-`/`*`/`+`/`<số>.` và khoảng trắng theo sau) SHALL luôn hiện trên màn hình, chỉ mờ đi, không bao giờ ẩn hay thay bằng phần tử khác.

Với đậm, nghiêng và gạch ngang, mỗi cặp dấu (`**`/`*`/`_`/`~~`) của một đoạn **đã gõ xong trọn vẹn** (đủ cặp mở và đóng) SHALL ẩn hẳn khỏi màn hình khi con trỏ và vùng chọn không chạm vào đoạn đó (tính cả hai dấu lẫn phần chữ ở giữa); khi con trỏ hoặc vùng chọn chạm vào bất kỳ đâu trong đoạn đó (kể cả đúng biên), cặp dấu SHALL hiện lại, mờ hơn văn bản thường, để sửa. Một đoạn chưa gõ xong (còn thiếu dấu đóng) SHALL không bị coi là hoàn chỉnh và SHALL không ẩn gì.

Mọi định dạng SHALL áp dụng bằng cách tô lên hoặc ẩn đúng ký tự đã có trong văn bản (không chèn phần tử mới vào dòng), để không ảnh hưởng tới bộ gõ IME; việc ẩn/hiện SHALL không diễn ra trong lúc một đoạn đang được bộ gõ soạn dở (composing). Live Preview SHALL chỉ áp dụng cho pane bản dịch, không áp dụng cho pane bản gốc hay Reading view. Đổi nội dung hoặc đổi vị trí con trỏ SHALL cập nhật định dạng ngay, kể cả khi chỉ một phần văn bản đang hiện trên màn hình.

#### Scenario: Gõ tiêu đề
- **WHEN** người dùng gõ "# Tên chương" vào đầu một dòng trống trong pane bản dịch
- **THEN** chữ "Tên chương" hiện lớn và đậm hơn văn bản thường ngay khi gõ xong, còn "#" và khoảng trắng sau nó vẫn hiện nhưng mờ hơn

#### Scenario: Gõ xong chữ đậm, con trỏ còn trong đoạn
- **WHEN** người dùng vừa gõ xong "Một câu có **từ quan trọng** ở giữa", con trỏ đang đứng ngay sau dấu "**" đóng
- **THEN** "từ quan trọng" hiện đậm, hai cặp "**" hai bên vẫn hiện trên màn hình nhưng mờ hơn phần chữ thường (chưa ẩn, vì con trỏ còn chạm vào đoạn)

#### Scenario: Con trỏ rời khỏi đoạn chữ đậm
- **WHEN** từ trạng thái trên, người dùng gõ dấu cách để tiếp tục câu, đưa con trỏ ra khỏi đoạn "**từ quan trọng**"
- **THEN** hai cặp "**" biến mất khỏi màn hình ngay, chỉ còn "từ quan trọng" hiện đậm, không còn khoảng trống nào thay cho dấu đã ẩn

#### Scenario: Bấm vào lại đoạn chữ đậm để sửa
- **WHEN** đoạn "**từ quan trọng**" đang ẩn dấu và người dùng bấm chuột vào giữa chữ "quan"
- **THEN** hai cặp "**" hiện lại mờ ở đúng vị trí cũ để người dùng sửa; các đoạn đậm khác trên màn hình không đổi

#### Scenario: Đoạn đậm chưa gõ xong không ẩn gì
- **WHEN** người dùng mới gõ "Một câu có **từ quan trọng" (chưa có cặp "**" đóng)
- **THEN** toàn bộ hiện nguyên văn bản thường, không có gì được coi là đậm hay bị ẩn

#### Scenario: Gõ chữ nghiêng
- **WHEN** người dùng gõ xong "Một câu có *từ quan trọng* ở giữa" rồi đưa con trỏ ra khỏi đoạn đó
- **THEN** "từ quan trọng" hiện nghiêng, hai dấu "*" hai bên ẩn hẳn; bấm vào lại đoạn đó thì hai dấu hiện lại mờ như cách chữ đậm hoạt động

#### Scenario: Không nuốt nhầm chữ đậm thành chữ nghiêng
- **WHEN** người dùng gõ "Một câu có **từ quan trọng** ở giữa"
- **THEN** cặp "**" hai bên không bị coi là hai dấu nghiêng lồng nhau; "từ quan trọng" chỉ hiện đậm, không nghiêng

#### Scenario: Gõ chữ gạch ngang
- **WHEN** người dùng gõ xong "Một câu có ~~từ cũ~~ đã bỏ" rồi đưa con trỏ ra khỏi đoạn đó
- **THEN** "từ cũ" hiện gạch ngang, hai cặp "~~" hai bên ẩn hẳn; bấm vào lại đoạn đó thì hai cặp hiện lại mờ

#### Scenario: Gõ trích dẫn
- **WHEN** người dùng gõ "> Lời thoại được trích" vào đầu một dòng trống
- **THEN** phần chữ sau "> " hiện với vạch dọc bên trái và thụt lề, dấu ">" và khoảng trắng sau nó vẫn hiện nhưng mờ hơn

#### Scenario: Gõ danh sách
- **WHEN** người dùng gõ "- Một ý" vào đầu một dòng trống
- **THEN** dấu "-" hiện mờ hơn văn bản thường, phần chữ còn lại hiện bình thường, không có bullet nào được vẽ thêm

#### Scenario: Không ảnh hưởng bản gốc
- **WHEN** bản gốc có một dòng tình cờ bắt đầu bằng "#", "-" hoặc ">"
- **THEN** pane bản gốc hiện nguyên văn, không đổi cỡ chữ, độ đậm hay thụt lề

## ADDED Requirements

### Requirement: Pane bản dịch hiển thị ảnh nhúng

Pane bản dịch SHALL hiển thị mỗi cú pháp nhúng ảnh hợp lệ (định nghĩa ở capability `image-embed`) thành ảnh thật ngay trong dòng, thay cho chuỗi cú pháp, khi con trỏ và vùng chọn không chạm vào vùng cú pháp đó. Khi con trỏ hoặc vùng chọn chạm vào vùng cú pháp của một ảnh đang hiển thị, pane SHALL hiện lại chuỗi cú pháp thô (không hiện ảnh) để người dùng sửa hoặc xoá, và SHALL hiện lại ảnh ngay khi con trỏ rời khỏi vùng đó. Pane bản gốc và Reading view SHALL NOT áp dụng hành vi này.

#### Scenario: Ảnh hiện ngay sau khi chèn
- **WHEN** một cú pháp nhúng ảnh hợp lệ đã có trong văn bản và con trỏ không nằm trong vùng đó
- **THEN** pane bản dịch hiện ảnh thật tại đúng vị trí, không hiện chuỗi cú pháp

#### Scenario: Sửa lại cú pháp ảnh
- **WHEN** người dùng bấm chuột vào giữa vùng cú pháp của một ảnh đang hiển thị
- **THEN** pane hiện lại chuỗi cú pháp thô tại đúng vị trí đó để sửa, các ảnh khác trên màn hình không đổi

#### Scenario: Ảnh hỏng hoặc không tìm thấy
- **WHEN** cú pháp nhúng trỏ tới một ID ảnh không còn tồn tại trong dữ liệu tác phẩm
- **THEN** pane hiện một ô giữ chỗ báo "Không tìm thấy ảnh" tại đúng vị trí, không chặn phần văn bản còn lại hiển thị hay sửa được
