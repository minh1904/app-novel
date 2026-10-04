## Purpose

Kiểm tất định (T0) một bản dịch tiếng Việt so với văn bản nguồn của nó: ghép đoạn theo nội dung, rồi đo các lỗi kiểm được bằng luật (sót, dư, chữ nguồn còn lại, ngoặc thoại, độ dài, lặp, tuân thủ glossary, quy tắc viết tay). Bộ đo dùng nó để chấm, và module QA dùng lại để gắn cờ.

## ADDED Requirements

### Requirement: Thuần và tất định

Mọi phép kiểm SHALL chỉ dựa trên đầu vào: văn bản nguồn, bản dịch, ngôn ngữ nguồn, glossary, quy tắc và các ngưỡng. Phép kiểm SHALL không gọi mạng, không đọc đồng hồ, không dùng số ngẫu nhiên. Cùng đầu vào SHALL cho cùng kết quả.

#### Scenario: Chấm hai lần
- **WHEN** cùng một cặp nguồn và bản dịch được chấm hai lần
- **THEN** hai kết quả giống hệt nhau, kể cả thứ tự các mục được báo

### Requirement: Ghép đoạn theo nội dung

Phép kiểm SHALL ghép đoạn nguồn với đoạn dịch theo nội dung, không theo số thứ tự. Kết quả SHALL là một dãy cặp theo đúng thứ tự, mỗi cặp thuộc một loại:
- một–một;
- **sót**: đoạn nguồn không có bản dịch;
- **dư**: đoạn dịch không ứng với đoạn nguồn nào;
- **gộp**: hai đoạn nguồn liền nhau thành một đoạn dịch;
- **tách**: một đoạn nguồn thành hai đoạn dịch liền nhau.

Khi số đoạn hai bên bằng nhau nhưng có một đoạn sót và một đoạn dư ở hai chỗ khác nhau, các đoạn ở giữa SHALL vẫn được ghép đúng với đoạn tương ứng thật của chúng.

#### Scenario: Không sót, không dư
- **WHEN** bản dịch có đúng một đoạn cho mỗi đoạn nguồn, cùng thứ tự
- **THEN** mọi cặp là một–một

#### Scenario: Sót ở đầu, dư ở cuối
- **WHEN** nguồn có 99 đoạn; bản dịch bỏ đoạn 3 và tách đoạn 60 thành hai dòng, nên cũng có 99 đoạn
- **THEN** kết quả báo một đoạn sót (đoạn 3) và một lần tách (đoạn 60), và đoạn nguồn 4–59 được ghép với đúng bản dịch của chúng

#### Scenario: Hai dòng ngắn bị gộp
- **WHEN** đoạn nguồn 「あっ」 và đoạn ngay sau nó được dịch thành một dòng
- **THEN** kết quả báo một lần gộp hai đoạn nguồn đó vào một đoạn dịch

### Requirement: Đếm cấu trúc

Kết quả SHALL gồm:
- số đoạn nguồn và số đoạn dịch;
- số cặp mỗi loại (một–một, sót, dư, gộp, tách);
- số câu chưa dịch, do lần chạy cung cấp.

Một bản dịch được coi là **khớp cấu trúc** khi chỉ có cặp một–một.

#### Scenario: Báo sót và dư
- **WHEN** bản dịch thiếu một đoạn và dư một đoạn
- **THEN** kết quả có 1 sót, 1 dư, và không khớp cấu trúc

### Requirement: Chữ và dấu câu của nguồn còn trong bản dịch

Với nguồn tiếng Trung hoặc tiếng Nhật, phép kiểm SHALL đếm các đoạn dịch:
- còn chữ Hán hoặc kana;
- còn ngoặc 「」『』;
- còn dấu câu toàn khổ 、。！？：；，.

Các ký hiệu ＊, ◇ và ― SHALL không bị tính (chúng là dấu ngắt cảnh và dấu đổi điểm nhìn). Đoạn có nguồn khớp một chuỗi miễn kiểm khai trong `meta.json` SHALL không bị tính chữ nguồn còn sót, ví dụ đoạn chơi chữ trên mặt chữ Hán.

#### Scenario: Ngoặc tiếng Nhật còn nguyên
- **WHEN** một đoạn dịch là 「Mẹ, con về rồi.」
- **THEN** đoạn đó được đếm vào mục còn 「」『』

#### Scenario: Đoạn chơi chữ được miễn
- **WHEN** đoạn nguồn chứa chuỗi miễn kiểm, và bản dịch giữ chữ 回 để giải thích chơi chữ
- **THEN** đoạn đó không bị đếm là còn chữ nguồn

### Requirement: Ngoặc thoại và kiểu thoại

Phép kiểm SHALL đếm các đoạn dịch có ngoặc không cân:
- số dấu `"` lẻ;
- hoặc số ngoặc mở khác số ngoặc đóng, với từng loại “”, 「」, 『』, «».

Phép kiểm SHALL xếp kiểu thoại của cả chương vào một trong các loại:
- **Việt**: chỉ “…” hoặc "…";
- **Nhật/Trung**: chỉ 「」『』;
- **khác**: ví dụ «…»;
- **lẫn**: từ hai loại trở lên;
- **không có thoại**.

#### Scenario: Thiếu ngoặc mở
- **WHEN** một đoạn dịch có hai lượt thoại mà lượt sau thiếu ngoặc mở
- **THEN** đoạn đó được đếm là ngoặc không cân

#### Scenario: Chương trộn hai kiểu
- **WHEN** một chương có đoạn dùng “…” và đoạn dùng 「…」
- **THEN** kiểu thoại của chương là **lẫn**

### Requirement: Độ dài bất thường và lặp vòng

Với mỗi cặp một–một có đoạn nguồn từ 20 ký tự trở lên (không tính khoảng trắng), phép kiểm SHALL tính tỷ lệ số ký tự dịch trên số ký tự nguồn. Cặp có tỷ lệ nằm ngoài băng của ngôn ngữ nguồn SHALL bị đếm là bất thường. Băng mặc định SHALL lấy theo nghiên cứu chất lượng dịch (p5–p95 của WMT24++ nới ±20%) và chỉnh được.

Phép kiểm SHALL đếm đoạn lặp vòng: một chuỗi 4 từ xuất hiện từ 4 lần trở lên trong một đoạn, hoặc một đoạn trùng y đoạn ngay trước.

#### Scenario: Câu dịch quá ngắn
- **WHEN** đoạn nguồn tiếng Nhật dài 80 ký tự và đoạn dịch ứng với nó dài 40 ký tự
- **THEN** cặp đó được đếm là độ dài bất thường

### Requirement: Tuân thủ glossary

Với mỗi lần một mục glossary xuất hiện trong một đoạn nguồn, phép kiểm SHALL đối chiếu với đoạn dịch được ghép với nó (với lần gộp hay tách thì dùng cả phần dịch tương ứng) và tính:
- **đúng chặt** khi đoạn dịch chứa `tgt`;
- **chấp nhận được** khi chứa `tgt` hoặc một `alternatives`;
- **dùng term cấm** khi chứa một mục `forbidden` như một từ trọn vẹn.

So khớp phía tiếng Việt SHALL chuẩn hóa NFC, không phân biệt hoa thường, và coi hai kiểu đặt dấu thanh (hoà/hòa, thuý/thúy) là một. Khớp phía nguồn SHALL theo luật khớp dài trước, không phân biệt hoa thường với nguồn tiếng Anh. Lần xuất hiện ở một đoạn nguồn bị sót SHALL tính là không đúng và không chấp nhận được.

Kết quả SHALL liệt kê các mục bị sai nhiều nhất kèm số lần.

#### Scenario: Hai kiểu đặt dấu
- **WHEN** `tgt` là "hòa" và đoạn dịch viết "hoà"
- **THEN** lần xuất hiện đó được tính là đúng chặt

#### Scenario: Term cấm chỉ tính trọn từ
- **WHEN** mục cấm là "dì" và đoạn dịch có chữ "dìu"
- **THEN** không tính là dùng term cấm

#### Scenario: Cách dịch được chấp nhận
- **WHEN** `tgt` là "núi Hoa Quả", `alternatives` có "Hoa Quả Sơn", và đoạn dịch viết "Hoa Quả Sơn"
- **THEN** lần xuất hiện đó không đúng chặt nhưng chấp nhận được

### Requirement: Quy tắc viết tay

Với mỗi quy tắc có điều kiện chuỗi (phải chứa, phải chứa một trong, không được chứa, không được chứa như một từ), phép kiểm SHALL áp điều kiện lên phần dịch được ghép với đoạn neo, và trả về **đạt** hoặc **trượt** kèm lý do. Hai trường hợp đặc biệt:
- quy tắc không có điều kiện chuỗi SHALL được trả về là **chấm tay**;
- đoạn neo bị sót SHALL làm quy tắc **trượt**, với lý do "đoạn bị sót".

#### Scenario: Quan hệ họ hàng sai
- **WHEN** quy tắc đòi đoạn dịch chứa "mợ" và không chứa từ "dì", còn đoạn dịch viết "dì Irene"
- **THEN** quy tắc trượt với lý do thiếu "mợ" và có "dì"

#### Scenario: Quy tắc chỉ để chấm tay
- **WHEN** quy tắc chỉ có ghi chú về giọng điệu, không có điều kiện chuỗi
- **THEN** quy tắc được trả về là chấm tay, không tính đạt hay trượt
