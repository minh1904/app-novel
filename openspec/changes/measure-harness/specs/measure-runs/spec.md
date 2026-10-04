## Purpose

Chạy thí nghiệm dịch trên fixture qua đúng đường dịch của app, ghi hồ sơ đủ để tái hiện, chấm lại không cần gọi API, và so hai lượt theo quy tắc quyết định E6, để mỗi thay đổi về chất lượng dịch đi kèm số đo trước và sau.

## ADDED Requirements

### Requirement: Dịch qua đúng đường của app

Lệnh chạy SHALL dịch mỗi chương fixture qua cùng đường mà app dùng khi người dùng bấm dịch:
- chuẩn hóa raw như lúc nhập;
- chia đơn vị gửi như app hiện tại;
- lập kế hoạch và dịch từng lô, tuần tự;
- đi qua gateway của app với kết nối và mục model thật.

Lô có câu chưa dịch SHALL được gửi lại một lần, như khi người dùng bấm "Dịch lại phần lỗi". Mọi lỗi SHALL được ghi lại kèm số câu bị ảnh hưởng.

#### Scenario: Lô thiếu câu
- **WHEN** nhà cung cấp trả về thiếu một câu ở lần gửi đầu
- **THEN** đúng các câu thiếu được gửi lại một lần, và nếu vẫn thiếu thì báo cáo ghi số câu chưa dịch của chương đó

### Requirement: Điều kiện thí nghiệm khai báo được

Một lần chạy SHALL được mô tả bằng một điều kiện gồm: model; cài đặt của mục model (mức thinking, nhiệt độ, nếu có); tùy chọn một tệp system prompt; số lần lặp mỗi chương (mặc định 3); bộ lọc tác phẩm; nhãn.

Tệp prompt SHALL chỉ thay nội dung system message của yêu cầu dịch; mọi phần khác của yêu cầu SHALL giữ như app gửi. Nếu có tệp prompt mà không yêu cầu nào được thay, lần chạy SHALL thất bại thay vì ghi số như thể thí nghiệm đã diễn ra.

#### Scenario: Thử một prompt
- **WHEN** lần chạy khai tệp prompt `ja-vi-conventions.txt`
- **THEN** mọi yêu cầu dịch mang system message lấy từ tệp đó, và báo cáo ghi số yêu cầu đã được thay

#### Scenario: Prompt không được áp dụng
- **WHEN** lần chạy khai tệp prompt nhưng system message của app đã đổi, nên không yêu cầu nào khớp để thay
- **THEN** lần chạy kết thúc với lỗi nói rõ prompt không được áp dụng

### Requirement: Hồ sơ tái hiện

Mỗi lần chạy SHALL ghi:
- mã commit;
- điều kiện, tức model, cài đặt, nội dung prompt và mã băm của nó;
- các tham số **thật sự đã gửi** trong yêu cầu dịch đầu tiên, không kèm nội dung tin nhắn;
- trạng thái duyệt của glossary và ma trận xưng hô;
- các tác phẩm đã dùng;
- với mỗi chương và mỗi lần lặp: bản dịch, kết quả kiểm tất định, `usage` thật, thời gian, số lời gọi HTTP theo mã trạng thái, và các lỗi.

#### Scenario: Biết được cái gì đã gửi đi
- **WHEN** lần chạy đặt mức thinking `off` cho mục model
- **THEN** hồ sơ ghi tham số đã gửi có `reasoning_effort: "none"`

### Requirement: Khóa không lọt và không chạy trong kiểm tra thường

Khóa API SHALL được đọc từ biến môi trường hoặc tệp `.env` ở gốc repo (tệp bị Git bỏ qua), và SHALL chỉ nằm trong bộ nhớ. Trước khi ghi bất kỳ tệp kết quả nào, lệnh chạy SHALL kiểm tra tệp đó không chứa khóa, và dừng ngay nếu có. Bộ đo SHALL không bao giờ chạy trong `check.mjs` hay trong bộ test mặc định. Thiếu khóa thì phần cần gọi nhà cung cấp SHALL được bỏ qua kèm thông báo rõ.

#### Scenario: Kiểm tra thường
- **WHEN** chạy `node scripts/check.mjs`
- **THEN** không có lời gọi nào tới nhà cung cấp AI, và số test không đổi vì có Bộ đo

#### Scenario: Khóa xuất hiện trong phản hồi
- **WHEN** một thông báo lỗi từ nhà cung cấp chứa nguyên văn khóa và sắp được ghi vào báo cáo
- **THEN** lệnh chạy dừng, không ghi tệp đó

### Requirement: Kết quả riêng tư, báo cáo không chứa văn bản truyện

Bản dịch và kết quả chi tiết SHALL nằm dưới `fixtures/private/runs/`, nơi bị Git bỏ qua. Bảng tổng hợp của mỗi lần chạy SHALL không chứa câu chữ của nguồn hay của bản dịch, để có thể chép vào handbook.

#### Scenario: Chép bảng vào handbook
- **WHEN** bảng tổng hợp của một lần chạy trên fixture riêng tư được mở ra
- **THEN** bảng chỉ có số đo, tên chương và nhãn, không có trích đoạn văn bản

### Requirement: Chấm lại không gọi API

Lệnh chấm lại SHALL áp bộ kiểm tất định hiện tại và fixture hiện tại lên các bản dịch đã lưu của một lần chạy, mà không gọi nhà cung cấp nào. `usage`, thời gian và lỗi của lần chạy gốc SHALL được giữ nguyên. Kết quả chấm lại SHALL ghi cạnh kết quả gốc, không ghi đè.

#### Scenario: Glossary vừa được duyệt
- **WHEN** chủ sản phẩm duyệt glossary sau khi một lần chạy đã xong
- **THEN** lệnh chấm lại cho số tuân thủ glossary mới, không có lời gọi mạng nào, và kết quả gốc vẫn còn

### Requirement: So hai lần chạy theo quy tắc E6

Lệnh so SHALL nhận hai lần chạy trên cùng tập chương và trả về một trong ba kết luận:
- **giữ**: kiểm tất định không xấu đi (số đoạn sót, dư, gộp, tách không tăng; tuân thủ glossary chặt không giảm), cận dưới khoảng tin cậy 95% của tỷ lệ thắng ở giám khảo LLM trên 50%, và người chấm (nếu có) không cho kết quả ngược chiều;
- **không giữ**: kiểm tất định xấu đi, hoặc cận trên khoảng tin cậy của tỷ lệ thắng dưới 50%;
- **chưa đủ dữ liệu**: không rơi vào hai trường hợp trên, hoặc có dưới 50 đoạn không ngang.

Khoảng tin cậy SHALL được tính bằng bootstrap theo chương, không theo đoạn, vì các đoạn trong một chương không độc lập. Khi hai lần chạy khác tập chương, lệnh so SHALL chỉ so trên các chương chung và ghi rõ điều đó. Lệnh so SHALL từ chối khi không có chương chung, hoặc khi hai lần chạy được chấm bằng hai cấu hình giám khảo khác nhau.

#### Scenario: Prompt làm sót câu
- **WHEN** so lượt có prompt quy ước (14 câu chưa dịch) với baseline (0 câu chưa dịch) trên 5 chương tiếng Nhật
- **THEN** kết luận là **không giữ**, với lý do kiểm tất định xấu đi, dù kiểu thoại đã tốt hơn

#### Scenario: Chưa có giám khảo
- **WHEN** hai lần chạy chưa được giám khảo LLM chấm, và kiểm tất định không xấu đi
- **THEN** kết luận là **chưa đủ dữ liệu**, và báo cáo nêu phần còn thiếu

#### Scenario: Khác tập chương
- **WHEN** một lần chạy có 8 chương và lần kia chỉ có 5 chương tiếng Nhật
- **THEN** lệnh so chỉ so trên 5 chương chung và ghi rõ điều đó; nếu không có chương chung thì từ chối
