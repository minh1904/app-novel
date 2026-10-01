## Purpose

Chia văn bản bản gốc của một chương thành segment: đơn vị mà AI dịch, người soát sửa và liên kết bám vào. Hành vi được mô tả bằng quy tắc và ví dụ để kiểm thử độc lập với cách cài đặt; mọi thay đổi quy tắc phải qua bộ hồi quy.

## ADDED Requirements

### Requirement: Segment là một câu, mỗi đoạn bắt đầu segment mới

Hệ thống SHALL chia văn bản thành các segment theo thứ tự xuất hiện, mỗi segment là một câu. Mỗi dòng không trống SHALL bắt đầu ít nhất một segment mới: segment không bao giờ vắt qua hai dòng. Dòng trống hoặc chỉ có khoảng trắng SHALL không tạo segment. Vùng của segment SHALL bắt đầu ở ký tự không phải khoảng trắng đầu tiên và kết thúc sau ký tự không phải khoảng trắng cuối cùng của câu, nên khoảng trắng đầu dòng (kể cả U+3000) và khoảng trắng giữa các câu nằm ngoài mọi segment nhưng vẫn nằm trong văn bản.

#### Scenario: Hai đoạn, ba câu
- **WHEN** văn bản là "Trời mưa. Anh ở nhà.\n\nCô đi ra ngoài."
- **THEN** có ba segment "Trời mưa.", "Anh ở nhà." và "Cô đi ra ngoài.", và dòng trống không tạo segment

#### Scenario: Thụt đầu dòng
- **WHEN** một dòng bắt đầu bằng "　" (U+3000) rồi mới tới chữ
- **THEN** segment bắt đầu ở chữ đầu tiên, và ký tự U+3000 vẫn nằm trong văn bản lưu

#### Scenario: Dòng không có dấu kết câu
- **WHEN** một dòng là "第一章 山中药铺" hoặc "***" và không có dấu kết câu
- **THEN** cả dòng là một segment riêng

### Requirement: Ranh giới câu theo ngôn ngữ

Câu SHALL kết thúc sau dấu kết câu của ngôn ngữ của văn bản (các ngôn ngữ nguồn, và tiếng Việt cho văn bản tiếng Việt như bản dịch) cùng các dấu đóng đi liền nó. Với tiếng Trung và tiếng Nhật, dấu kết câu gồm 。！？ và dấu chấm lửng …/……; với tiếng Anh, tiếng Việt gồm . ! ? và chấm lửng, và dấu chấm chỉ kết câu khi theo sau là khoảng trắng hoặc hết dòng. Chấm lửng liền nhau SHALL không bị tách làm nhiều câu, và chấm lửng theo sau bởi từ viết thường (tiếng Anh, tiếng Việt) SHALL không kết câu. Số có dấu thập phân hoặc phân cách hàng nghìn (3.50, 1,000) SHALL không bị tách.

#### Scenario: Tiếng Trung
- **WHEN** ngôn ngữ nguồn là tiếng Trung giản thể và văn bản là "他说：“你好。”然后离开了。今天天气很好！你呢？"
- **THEN** các segment là "他说：“你好。”", "然后离开了。", "今天天气很好！" và "你呢？"

#### Scenario: Chấm lửng
- **WHEN** văn bản có "彼は黙った……そして去った。"
- **THEN** chấm lửng "……" không tách câu và đây là một segment

#### Scenario: Chấm lửng trước chữ thường
- **WHEN** ngôn ngữ nguồn là tiếng Anh và văn bản là "Wait... what? Yes!! Really?! Fine."
- **THEN** các segment là "Wait... what?", "Yes!!", "Really?!" và "Fine."

#### Scenario: Số thập phân
- **WHEN** ngôn ngữ nguồn là tiếng Anh và văn bản là "It cost $3.50 today. Then it rose."
- **THEN** có hai segment, "It cost $3.50 today." và "Then it rose."

### Requirement: Giữ thoại nguyên vẹn

Dấu ngoặc hoặc nháy mở thoại (「『（“‘ và tương đương) SHALL thuộc về segment bắt đầu bằng lời thoại đó, không dính vào cuối câu trước. Dấu đóng (」』）”’) đi liền sau dấu kết câu SHALL thuộc về câu chứa dấu kết câu đó. Một lời thoại có nhiều câu SHALL được tách ở dấu kết câu bên trong, và dấu đóng thuộc câu cuối cùng.

#### Scenario: Thoại tiếng Nhật xen lời dẫn
- **WHEN** ngôn ngữ nguồn là tiếng Nhật và văn bản là "「おはよう。」と彼は言った。今日は晴れだ。「本当に？」彼女は笑った！"
- **THEN** các segment là "「おはよう。」", "と彼は言った。", "今日は晴れだ。", "「本当に？」" và "彼女は笑った！"

#### Scenario: Thoại nhiều câu
- **WHEN** văn bản là "「行こう。もう遅い。」"
- **THEN** có hai segment "「行こう。" và "もう遅い。」"

### Requirement: Không tách sau từ viết tắt

Với tiếng Anh và tiếng Việt, dấu chấm sau một từ viết tắt đã biết SHALL không kết câu. Danh sách tối thiểu: tiếng Anh Mr., Mrs., Ms., Dr., Prof., Sr., Jr., St., vs.; tiếng Việt TP., Th.S., TS., PGS., GS., ThS. Riêng U.S., U.K., U.N. có thể kết câu thật, nên chấm chỉ bị bỏ qua khi từ theo sau bắt đầu bằng chữ thường hoặc chữ số. Danh sách là dữ liệu có thể mở rộng mà không đổi mã tách. Khi viết tắt đứng cuối dòng, đó vẫn là hết câu.

#### Scenario: Tiếng Anh
- **WHEN** văn bản là "Mr. Smith went to Washington. Dr. Lee agreed."
- **THEN** có hai segment "Mr. Smith went to Washington." và "Dr. Lee agreed."

#### Scenario: Tiếng Việt
- **WHEN** văn bản là "TP. Hồ Chí Minh rất đông. Th.S. Nam nói: \"Chào bạn.\" Anh ấy đi."
- **THEN** có ba segment "TP. Hồ Chí Minh rất đông.", "Th.S. Nam nói: \"Chào bạn.\"" và "Anh ấy đi."

#### Scenario: U.S. giữa câu và cuối câu
- **WHEN** văn bản là "He lived in the U.S. and loved it." và văn bản khác là "He lived in the U.S. Then he left."
- **THEN** ca đầu là một segment, ca sau là hai segment "He lived in the U.S." và "Then he left."

#### Scenario: Viết tắt cuối dòng
- **WHEN** một dòng kết thúc bằng "…ở U.S." rồi xuống dòng
- **THEN** segment kết thúc ở "U.S." và dòng sau bắt đầu segment mới

### Requirement: Bất biến của kết quả

Kết quả chia SHALL thỏa: các vùng được sắp theo vị trí, không chồng nhau và nằm trong văn bản; mọi ký tự không phải khoảng trắng SHALL thuộc đúng một segment (không mất và không lặp chữ); không vùng nào cắt giữa một cặp surrogate hay một cụm ký tự; cùng một văn bản và cùng ngôn ngữ SHALL luôn cho đúng cùng kết quả. Vùng được tính theo đơn vị UTF-16 để dùng trực tiếp với `text:save`.

#### Scenario: Không mất chữ
- **WHEN** chia bất kỳ văn bản thử nào trong bộ hồi quy
- **THEN** ghép các segment lại cho đúng dãy ký tự không-khoảng-trắng của văn bản gốc

#### Scenario: Ký tự ngoài mặt phẳng cơ bản
- **WHEN** văn bản có emoji và chữ Hán hiếm như "𠮷野家は旨い。😀そうだ。"
- **THEN** mọi vùng nằm trọn trên ranh giới ký tự và cắt văn bản theo vùng cho đúng nội dung từng câu

#### Scenario: Chia hai lần
- **WHEN** chia cùng một văn bản hai lần
- **THEN** hai kết quả giống hệt nhau

### Requirement: Giới hạn và cảnh báo

Nếu văn bản chia ra nhiều hơn 50.000 segment, việc nhập SHALL bị từ chối kèm số segment và giới hạn. Segment dài hơn 1.000 đơn vị UTF-16 SHALL được đánh dấu "dài bất thường" ở màn xem trước (thường là thiếu dấu kết câu) mà không bị cắt.

#### Scenario: Câu dài bất thường
- **WHEN** văn bản có một đoạn 3.000 ký tự không có dấu kết câu nào
- **THEN** đoạn đó là một segment và xem trước đánh dấu nó là dài bất thường

### Requirement: Bộ hồi quy theo ngôn ngữ

Hệ thống SHALL có bộ kiểm thử hồi quy gồm văn bản mẫu và kết quả chia mong đợi cho mỗi ngôn ngữ nguồn (Anh, Trung giản thể, Trung phồn thể, Nhật), bao các tình huống trong spec này. Mọi thay đổi quy tắc hoặc danh sách viết tắt SHALL cập nhật bộ này kèm lý do, và bộ này SHALL chạy trong kiểm thử thường xuyên.

#### Scenario: Thêm viết tắt mới
- **WHEN** thêm một từ viết tắt vào danh sách
- **THEN** có ít nhất một ca hồi quy chứng minh nó không tách câu và các ca cũ vẫn đạt

### Requirement: Đủ nhanh cho chương dài

Chia segment cho văn bản 300.000 ký tự SHALL hoàn tất trong chưa đầy 500 ms trên máy phát triển.

#### Scenario: Chương rất dài
- **WHEN** chia văn bản 300.000 ký tự
- **THEN** hoàn tất trong chưa đầy 500 ms
