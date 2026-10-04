## Purpose

Chấm so cặp mù hai bản dịch của cùng một chương: bằng giám khảo LLM (T1) cho từng đoạn, và bằng người (T3) trên một mẫu đoạn ngẫu nhiên. Dùng để bắt lỗi nghĩa và văn phong mà kiểm tất định không bắt được, kèm mức nhiễu và độ đồng thuận để biết được tin con số tới đâu.

## ADDED Requirements

### Requirement: Giám khảo LLM so cặp mù theo đoạn

Giám khảo SHALL nhận văn bản nguồn của cả chương và hai bản dịch, gọi là A và B, không kèm bất cứ thông tin nào về điều kiện, model hay prompt đã tạo ra chúng. Nếu tác phẩm có ma trận xưng hô, giám khảo SHALL nhận kèm ma trận đó.

Với mỗi đoạn nguồn mà cả hai bản dịch đều có phần ghép được, giám khảo SHALL trả:
- một phán quyết: **A hơn**, **B hơn** hoặc **ngang**;
- danh sách lỗi, mỗi lỗi có mức (**nặng** hoặc **nhẹ**) và mục: **nghĩa** (sai, sót, thêm), **tự nhiên**, **xưng hô**, **giọng văn**.

Giám khảo SHALL không chấm tuân thủ glossary; việc đó thuộc kiểm tất định.

#### Scenario: Bản dịch không lộ nguồn gốc
- **WHEN** hai bản dịch được gửi cho giám khảo
- **THEN** nội dung gửi đi không chứa tên điều kiện, tên model, tên tệp prompt hay nhãn lượt chạy

#### Scenario: Đoạn chỉ một bên có
- **WHEN** một đoạn nguồn bị sót ở bản B
- **THEN** đoạn đó không được gửi cho giám khảo, và được báo riêng là "một bên sót"

### Requirement: Chạy hai thứ tự để chống thiên lệch vị trí

Mỗi lần so SHALL được chạy hai lượt: lượt sau đổi chỗ A và B. Một đoạn chỉ được tính là thắng khi cả hai lượt chọn cùng một bản dịch. Hai lượt chọn khác nhau SHALL được tính là ngang. Báo cáo SHALL ghi tỷ lệ đoạn mà hai lượt không nhất quán.

#### Scenario: Giám khảo đổi ý khi đổi chỗ
- **WHEN** lượt 1 chọn A cho đoạn 12, còn lượt 2 (đã đổi chỗ) chọn bản ở vị trí A, tức là bản B ban đầu
- **THEN** đoạn 12 được tính là ngang, và được đếm vào tỷ lệ không nhất quán

### Requirement: Giám khảo khác họ với model dịch

Giám khảo SHALL thuộc họ model khác với họ của mọi model dịch trong lần so; họ của model được xác định bằng một bảng ánh xạ khai báo được. Khi hai điều kiện dùng hai họ model dịch khác nhau, giám khảo SHALL thuộc họ thứ ba. Vi phạm SHALL làm lệnh so dừng lại, trừ khi người chạy bật cờ bỏ qua tường minh; khi đó báo cáo SHALL ghi rõ là đã bỏ qua.

#### Scenario: Giám khảo cùng họ
- **WHEN** bản dịch do một model Gemini tạo ra và giám khảo cũng là một model Gemini
- **THEN** lệnh so dừng lại và nêu lý do

### Requirement: Tái hiện được và không trộn cấu hình

Mỗi lần chấm SHALL ghi lại: model của giám khảo, mã băm của prompt giám khảo, các tham số đã gửi và lượng token đã dùng. Hai lượt chấm dùng cấu hình giám khảo khác nhau SHALL không được gộp vào cùng một tỷ lệ thắng.

Phản hồi của giám khảo không đọc được SHALL được hỏi lại một lần. Nếu vẫn hỏng, chương đó SHALL được ghi là "không chấm được" và không được tính là ngang.

#### Scenario: Phản hồi hỏng hai lần
- **WHEN** giám khảo trả về dữ liệu không đọc được ở cả lần đầu và lần hỏi lại cho một chương
- **THEN** chương đó được ghi là không chấm được, và tỷ lệ thắng chỉ tính trên các chương còn lại

### Requirement: Mức nhiễu A/A

Khi hai lượt chạy cùng một điều kiện được đem so với nhau, báo cáo SHALL ghi đây là phép đo A/A. Kết quả SHALL được dùng làm mức nhiễu nền khi đọc các phép so A/B dùng cùng cấu hình giám khảo.

#### Scenario: So hai lần chạy cùng điều kiện
- **WHEN** lần chạy 1 và lần chạy 2 của cùng một điều kiện được so với nhau
- **THEN** báo cáo ghi tỷ lệ thắng của mỗi bên kèm khoảng tin cậy, và gắn nhãn "A/A (mức nhiễu)"

### Requirement: Người chấm mù

Công cụ SHALL sinh một trang chạy cục bộ, không cần mạng, gồm một mẫu ngẫu nhiên các đoạn đã ghép được ở cả hai bản dịch (mặc định 60–80 đoạn). Với mỗi đoạn:
- trang hiện văn bản nguồn và hai bản dịch, gắn nhãn trung tính;
- thứ tự hai bản dịch được xáo riêng cho từng đoạn;
- người chấm chọn **A**, **B** hoặc **ngang**, và có thể đánh dấu thêm lỗi nặng hoặc nhẹ.

Trang SHALL không chứa tên điều kiện, model hay prompt. Bảng ánh xạ nhãn về điều kiện SHALL lưu riêng, ngoài trang. Kết quả chấm SHALL xuất ra được thành một tệp, và lệnh nhập lại SHALL ánh xạ kết quả về đúng điều kiện. Các đoạn bị kiểm tất định gắn cờ, hoặc bị giám khảo hai lượt không nhất quán, SHALL được liệt kê riêng để chẩn đoán, và không được tính vào ước lượng tỷ lệ thắng của người chấm.

#### Scenario: Trang không lộ điều kiện
- **WHEN** người chấm mở trang được sinh từ hai lượt "baseline" và "ja-vi-conventions"
- **THEN** trong trang không có chuỗi "baseline", "ja-vi-conventions", tên model hay tên tệp prompt

#### Scenario: Nhập kết quả chấm
- **WHEN** người chấm xuất kết quả rồi chạy lệnh nhập
- **THEN** mỗi lựa chọn được ánh xạ về đúng điều kiện và đúng đoạn, kể cả khi thứ tự hiển thị đã bị xáo

### Requirement: Đồng thuận giữa giám khảo và người

Trên các đoạn mà cả giám khảo và người đều đã chấm, công cụ SHALL tính tỷ lệ đồng ý và hệ số kappa, và ghi vào báo cáo. Khi chưa đủ 50 đoạn chấm chung, báo cáo SHALL ghi "chưa đủ để đặt ngưỡng tin giám khảo".

#### Scenario: Ít đoạn chấm chung
- **WHEN** người mới chấm 30 đoạn và giám khảo đã chấm cả 30
- **THEN** báo cáo ghi tỷ lệ đồng ý, kèm nhãn chưa đủ để đặt ngưỡng
