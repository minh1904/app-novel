## Purpose

Quy định vùng và ID của segment thay đổi thế nào khi người dùng sửa văn bản chương, để một lần sửa nhỏ không làm mất ID segment (và liên kết bám vào nó) ở những chỗ không liên quan. Đây là hợp đồng hành vi cho cả editor lẫn kiểm thử độc lập, không phụ thuộc cách cài đặt.

## ADDED Requirements

### Requirement: Segment không bị đụng tới giữ nguyên ID và nội dung

Sau một chỉnh sửa, mỗi segment mà vùng của nó không bị chỉnh sửa chạm vào SHALL giữ nguyên ID và nguyên văn, và vùng của nó SHALL dịch chuyển đúng bằng độ dài chữ được thêm hoặc bớt ở phía trước nó. Hệ thống SHALL không chia lại, gộp lại hay đánh lại ID các segment này, kể cả khi lưu.

#### Scenario: Sửa ở đầu chương
- **WHEN** chương có 200 segment và người dùng thêm một từ vào giữa segment số 3
- **THEN** segment 1, 2 và 4 đến 200 giữ nguyên ID và nguyên văn, và vùng của segment 4 đến 200 dịch chuyển đúng bằng độ dài từ vừa thêm

#### Scenario: Chỉ ID của vùng bị sửa có thể đổi
- **WHEN** người dùng xóa trùm segment 10 và 11 rồi lưu
- **THEN** ID của các segment 1 đến 9 và 12 trở đi không đổi

### Requirement: Sửa bên trong một segment giữ ID

Khi chỉnh sửa (chèn, xóa, thay thế vùng chọn) nằm hoàn toàn bên trong vùng một segment và không thêm xuống dòng, segment đó SHALL giữ ID, vùng của nó SHALL co giãn đúng theo chỉnh sửa, và nó SHALL được đánh dấu là đã bị sửa kể từ lần lưu cuối.

#### Scenario: Gõ giữa câu
- **WHEN** người dùng gõ "rất " vào giữa câu "Trời mưa to."
- **THEN** segment vẫn là một, vẫn giữ ID, nay có nội dung "Trời rất mưa to." và có dấu đã sửa

#### Scenario: Thay thế vùng chọn trong câu
- **WHEN** người dùng chọn "mưa" trong "Trời mưa to." và gõ "nắng"
- **THEN** segment giữ ID và có nội dung "Trời nắng to."

### Requirement: Chèn ở ranh giới thuộc về segment bên trái

Khi chèn văn bản đúng tại vị trí kết thúc của một segment, phần chèn SHALL mở rộng segment đó, trừ phần từ ký tự xuống dòng đầu tiên của chữ chèn trở đi (nếu có), phần đó nằm ngoài segment. Khi hai segment liền nhau không có khoảng trắng ở giữa (văn bản tiếng Trung, Nhật), chèn đúng tại chỗ hai segment giáp nhau SHALL thuộc về segment bên trái. Chèn đúng tại vị trí bắt đầu của một segment mà bên trái có khoảng trắng hoặc xuống dòng SHALL mở rộng segment đó về phía trước, trừ khi chữ chèn chỉ gồm khoảng trắng.

#### Scenario: Gõ nối tiếp ở cuối câu
- **WHEN** con trỏ ở ngay sau dấu chấm cuối của "Trời mưa." và người dùng gõ " Gió rất to"
- **THEN** chữ chèn thuộc về segment "Trời mưa." trong lúc gõ, và khi chia lại vùng đã sửa (khi lưu) kết quả được tách lại thành các câu đúng quy tắc chia câu

#### Scenario: Enter ở cuối câu
- **WHEN** con trỏ ở ngay sau "Trời mưa." và người dùng bấm Enter
- **THEN** segment "Trời mưa." không đổi vùng, và dòng mới nằm ngoài mọi segment cho tới khi có chữ

#### Scenario: Gõ trước câu
- **WHEN** con trỏ ở ngay trước chữ "Anh" đầu dòng "Anh ở nhà." và người dùng gõ "Rồi "
- **THEN** segment giữ ID và có nội dung "Rồi Anh ở nhà."

### Requirement: Chữ mới ngoài mọi segment thành segment mới

Chữ không phải khoảng trắng được thêm vào chỗ không thuộc segment nào (dòng trống, giữa hai segment cách nhau bằng xuống dòng) SHALL trở thành segment mới sau khi chia lại vùng đã sửa; segment mới chưa có ID cho tới khi lưu, và ID do kho cấp lúc lưu. Chữ chèn chỉ gồm khoảng trắng hoặc xuống dòng SHALL không tạo segment.

#### Scenario: Gõ vào dòng trống
- **WHEN** người dùng gõ "Cô đi ra ngoài." vào một dòng trống giữa hai đoạn
- **THEN** khi lưu có thêm một segment mới "Cô đi ra ngoài." nằm đúng thứ tự giữa hai đoạn, các segment kia giữ ID

### Requirement: Xóa trùm nhiều segment

Khi xóa một vùng trùm trọn một segment, segment đó SHALL biến mất và ID của nó SHALL không còn trong kết quả. Khi vùng xóa trùm phần cuối của segment A và phần đầu của segment B kề nhau, hai segment SHALL được nối thành một vùng thuộc về A và A SHALL giữ ID; B SHALL mất ID. Khi vùng xóa trùm trọn A và một phần đầu của B, A SHALL biến mất và B SHALL giữ ID với vùng đã co lại.

#### Scenario: Xóa trùm hai nửa
- **WHEN** người dùng chọn từ giữa câu "Trời mưa to." tới giữa câu "Anh ở nhà." rồi xóa
- **THEN** chỉ còn một segment mang ID của câu đầu, chứa phần còn lại của hai câu nối liền

#### Scenario: Xóa trọn một câu
- **WHEN** người dùng chọn đúng toàn bộ segment 7 và xóa
- **THEN** segment 7 không còn trong kết quả, các segment khác giữ ID, và số segment hiển thị trên màn giảm đi một

#### Scenario: Xóa rồi hoàn tác
- **WHEN** người dùng xóa trùm hai segment rồi hoàn tác
- **THEN** cả hai segment trở lại với đúng ID, vùng và nội dung ban đầu

### Requirement: Dán và chèn nhiều dòng

Khi chỉnh sửa thêm một hoặc nhiều ký tự xuống dòng vào trong một segment, hoặc thay một vùng bằng văn bản nhiều dòng, vùng bị ảnh hưởng SHALL được chia lại theo quy tắc chia câu của đặc tả `segmentation`, vì segment không được vắt qua hai dòng. Trong các segment sinh ra từ vùng của một segment cũ, ID cũ SHALL được giao cho segment trùng nhiều nhất với vùng cũ (đồng hạng thì segment đứng trước); các segment còn lại SHALL là segment mới chưa có ID (kho cấp khi lưu). Nếu hai segment cũ cùng đóng góp vào một segment mới, ID SHALL thuộc về segment cũ trùng nhiều nhất.

#### Scenario: Dán ba dòng giữa câu
- **WHEN** người dùng dán "a.\nb.\nc." vào giữa câu "Trời mưa to." sao cho câu bị cắt đôi
- **THEN** sau khi chia lại, không segment nào vắt qua dòng, mỗi ID chỉ xuất hiện một lần, và đúng một segment trong vùng đó mang ID của câu cũ, các segment kia chưa có ID

#### Scenario: Dán văn bản dài vào dòng trống
- **WHEN** người dùng dán 40 dòng văn bản vào dòng trống giữa hai đoạn
- **THEN** có các segment mới chưa mang ID (kho cấp khi lưu, tất cả duy nhất), các segment ngoài vùng dán giữ ID

### Requirement: Chia lại không chạy trong lúc đang gõ bằng bộ gõ

Việc chia lại vùng đã sửa SHALL chỉ chạy khi không có đoạn chữ đang soạn dở của bộ gõ (IME composition), tức khi lưu hoặc khi người dùng dừng gõ. Trong lúc đang soạn dở, hệ thống SHALL chỉ dịch chuyển vùng các segment theo chỉnh sửa và SHALL không thêm, bớt hay đổi nội dung văn bản.

#### Scenario: Đang gõ Telex
- **WHEN** người dùng đang giữa một từ chưa chốt trong bộ gõ Telex và có chu kỳ chia lại định kỳ tới hạn
- **THEN** chu kỳ đó được hoãn tới khi từ được chốt, và không ký tự nào bị đổi hay mất

### Requirement: Bất biến của kết quả sau khi chia lại

Sau khi chia lại, tập segment SHALL thỏa: đúng thứ tự và không chồng nhau; nằm trong văn bản; không cắt đôi cặp thay thế (surrogate pair); mỗi ký tự không phải khoảng trắng thuộc đúng một segment; không segment nào vắt qua hai dòng; ID duy nhất. Văn bản được lưu SHALL đúng bằng văn bản trong editor, từng ký tự, không chuẩn hóa thêm. Với cùng văn bản gốc, cùng chuỗi chỉnh sửa và cùng ngôn ngữ, vùng và việc segment nào giữ ID cũ SHALL giống nhau mọi lần (xác định, không phụ thuộc thời gian hay thứ tự chạy); ID của segment mới do kho cấp nên không nằm trong phép so sánh này.

#### Scenario: Chuỗi chỉnh sửa ngẫu nhiên
- **WHEN** kiểm thử áp dụng một chuỗi dài các chỉnh sửa ngẫu nhiên (chèn, xóa, thay, dán nhiều dòng, có ký tự ngoài mặt phẳng cơ bản) lên chương mẫu rồi chia lại
- **THEN** mọi bất biến trên đều đúng, không có chữ không phải khoảng trắng nào bị mất hoặc lặp ngoài những chữ đã bị xóa hoặc thêm có chủ đích

#### Scenario: Ký tự ngoài mặt phẳng cơ bản
- **WHEN** người dùng chèn hoặc xóa quanh một ký tự gồm hai đơn vị UTF-16 (chữ Hán hiếm, emoji)
- **THEN** không vùng segment nào bắt đầu hay kết thúc giữa hai nửa của ký tự đó

### Requirement: Hoàn tác và làm lại khôi phục cả ID

Hoàn tác và làm lại SHALL khôi phục văn bản cùng tập segment (vùng và ID) về đúng trạng thái trước hoặc sau chỉnh sửa, kể cả khi chỉnh sửa đã làm mất, gộp hay tách segment. Chia lại tự động SHALL không làm hỏng lịch sử: hoàn tác một chỉnh sửa vừa được chia lại SHALL đưa cả văn bản và segment về trước chỉnh sửa đó trong một bước.

#### Scenario: Hoàn tác sau chia lại
- **WHEN** người dùng dán 40 dòng, hệ thống chia lại, rồi người dùng hoàn tác
- **THEN** văn bản và các segment trở về đúng trước khi dán, với ID cũ, bằng một lần hoàn tác

#### Scenario: Làm lại
- **WHEN** người dùng hoàn tác rồi làm lại một lần xóa trùm hai segment
- **THEN** tập segment bằng đúng tập sau lần xóa đầu tiên
