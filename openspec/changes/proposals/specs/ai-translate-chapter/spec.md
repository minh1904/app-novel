## MODIFIED Requirements

### Requirement: Ước lượng trước khi chạy

Trước khi gửi bất cứ gì, hệ thống SHALL hiển thị model sẽ dùng, số đoạn nguồn sẽ dịch, ước lượng token/chi phí và lựa chọn Duyệt trước hoặc Áp dụng thẳng cho lượt dịch. Mặc định SHALL là Duyệt trước. Con số SHALL được ghi rõ là ước lượng; khi chưa biết giá của model SHALL nói là chưa biết giá. Trên chương đã có bản dịch, hành động SHALL nói rõ phạm vi sẽ thay và rằng Áp dụng thẳng chỉ ghi khi base còn hợp lệ.

#### Scenario: Xem ước lượng rồi mới chạy
- **WHEN** người dùng mở hành động dịch bằng AI trên một chương có bản gốc
- **THEN** thấy model, số đoạn nguồn và ước lượng token/chi phí kèm chữ “ước lượng”, và phải xác nhận mới bắt đầu gửi

#### Scenario: Model chưa biết giá
- **WHEN** model được chọn không có dữ liệu giá
- **THEN** phần chi phí nói rõ là chưa biết giá, và việc dịch vẫn chạy được

#### Scenario: Ghi lượng dùng thật sau khi chạy
- **WHEN** nhà cung cấp trả về lượng token đã dùng
- **THEN** hệ thống lưu con số thật đó cùng lượt và đề xuất tương ứng

#### Scenario: Chương đã có bản dịch
- **WHEN** người dùng mở hành động dịch lại một chương có bản dịch
- **THEN** hộp thoại hiển thị lựa chọn Duyệt trước/Áp dụng thẳng, phạm vi thay và quy tắc xung đột trước khi người dùng xác nhận

### Requirement: Chạy theo đoạn, có tiến độ và hủy

Việc dịch một chương SHALL dùng các đoạn nguồn tự nhiên (mỗi dòng không trống theo định nghĩa ở Bộ đo), giữ ánh xạ nội bộ cho từng đoạn khi chia lô, và cắt ở ranh giới an toàn. Trong lúc chạy, hệ thống SHALL hiển thị số đoạn đã xử lý và số đề xuất đã lưu bền trên tổng số đoạn; SHALL cho hủy. Hủy SHALL dừng gửi lô tiếp theo, giữ đề xuất đã lưu, và nói rõ số đoạn đã xử lý cùng số đề xuất còn chờ; SHALL NOT gọi đó là số đoạn đã ghi vào bản dịch.

#### Scenario: Tiến độ theo segment
- **WHEN** việc dịch một chương được mở từ dữ liệu cũ còn segment và đang chạy
- **THEN** tiến độ hiển thị theo số đoạn nguồn tự nhiên đã xử lý và số đề xuất chờ, không dùng số segment cũ làm đơn vị báo cáo

#### Scenario: Tiến độ theo đoạn
- **WHEN** việc dịch một chương đang chạy
- **THEN** người dùng thấy số đoạn đã xử lý trên tổng số và số kết quả đã tạo đề xuất chờ

#### Scenario: Hủy giữa chừng
- **WHEN** người dùng hủy sau khi một số lô đã tạo đề xuất
- **THEN** những đề xuất đã lưu còn trong hàng chờ, bản dịch chưa đổi và phần chưa xử lý được báo rõ

#### Scenario: Chuyển khóa không làm dừng
- **WHEN** một khóa hết hạn mức giữa lúc chạy và kết nối còn khóa khác
- **THEN** việc dịch tiếp tục bằng khóa sau và người dùng thấy thông báo đã chuyển khóa

### Requirement: Kết quả ghi vào bản dịch kèm nguồn gốc, không ghi đè bản người dùng đã sửa

Kết quả hợp lệ từ AI SHALL được gắn với đúng đoạn nguồn/chương và lưu thành đề xuất theo `ai-proposals`, kèm provider, model, thời điểm và dấu vết ngữ cảnh. Mode Duyệt trước SHALL giữ bản dịch đang rỗng hoặc đã có chữ tới khi người dùng Accept. Mode Áp dụng thẳng SHALL tự Accept qua cùng đường duyệt với chat nếu base còn hợp lệ. Chữ người dùng sửa trong lúc AI chạy SHALL được giữ khi có xung đột.

#### Scenario: Chương chưa có bản dịch
- **WHEN** dịch một chương chưa có bản dịch nào ở mode Duyệt trước
- **THEN** kết quả xuất hiện trong hàng đề xuất, bản dịch vẫn rỗng cho tới khi người dùng Accept

#### Scenario: Dịch chương với Áp dụng thẳng
- **WHEN** người dùng chọn Áp dụng thẳng trước khi dịch một chương và base còn hợp lệ lúc kết quả về
- **THEN** phần có đích xác định được tự Accept, lịch sử ghi nguồn AI và checkpoint; phần lỗi/không neo được vẫn ở hàng chờ

#### Scenario: Chương đã có segment người dùng sửa
- **WHEN** dịch lại một chương có bản dịch người dùng đã sửa
- **THEN** bản người dùng giữ nguyên, đề xuất hiện diff để Accept/Deny từng phần

#### Scenario: Cảnh báo trước khi dịch lại
- **WHEN** người dùng mở hành động dịch lại trên chương đã có chữ
- **THEN** hộp thoại nêu rõ bản AI chỉ được lưu thành đề xuất, chưa thay chữ trước Accept

#### Scenario: Chữ thay đổi sau lúc gửi yêu cầu
- **WHEN** người dùng sửa pane đích trong lúc AI đang dịch
- **THEN** kết quả AI vẫn lưu với base ban đầu; Accept kiểm xung đột và không ghi đè chữ vừa sửa

### Requirement: Một phần lỗi không làm hỏng cả chương

Khi một số lô hoặc một số đoạn không dịch được sau xử lý lỗi của lõi dịch, hệ thống SHALL giữ mọi kết quả hợp lệ đã lưu thành đề xuất, liệt kê phần lỗi kèm lý do và cho chạy lại riêng phần lỗi. Chạy lại SHALL không gửi lại phần thành công hoặc tạo đề xuất trùng từ phần đã hoàn tất.

#### Scenario: Một lô lỗi, phần còn lại xong
- **WHEN** một lô thất bại sau số lần thử tối đa
- **THEN** đề xuất của phần thành công còn nguyên, phần lỗi được liệt kê và có hành động chạy lại riêng phần lỗi

#### Scenario: Chạy lại phần lỗi
- **WHEN** người dùng chạy lại phần lỗi
- **THEN** chỉ đoạn lỗi được gửi lại, không đổi hoặc nhân đôi đề xuất đã lưu

#### Scenario: Hết mọi khóa giữa job
- **WHEN** mọi khóa của kết nối đều bị đóng băng lúc đang chạy
- **THEN** việc dịch dừng với mốc phục hồi sớm nhất, đề xuất đã lưu còn nguyên và phần còn lại nằm trong nhóm chạy lại được
