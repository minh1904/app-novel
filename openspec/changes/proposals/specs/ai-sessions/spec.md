## Purpose

Giữ các cuộc hội thoại AI theo tác phẩm cùng dấu vết ngữ cảnh từng lượt, để người dịch ẩn panel, đổi chương hoặc mở lại ứng dụng mà vẫn xem và tiếp tục đúng phiên.

## ADDED Requirements

### Requirement: Phiên thuộc tác phẩm và tồn tại sau khi panel đóng

Phiên AI SHALL thuộc đúng một tác phẩm, có ID và lịch sử bền vững trong tệp tác phẩm. Ẩn panel, chuyển chương hoặc tắt/mở ứng dụng SHALL NOT xóa phiên, lượt đã hoàn tất hay đề xuất liên kết. Người dùng SHALL tạo phiên mới, xem danh sách phiên cũ và mở một phiên cũ để tiếp tục bằng lượt yêu cầu mới.

#### Scenario: Ẩn rồi mở panel
- **WHEN** người dùng đóng panel có hội thoại rồi mở lại trong cùng tác phẩm
- **THEN** hội thoại và phiên đang xem còn nguyên

#### Scenario: Mở lại sau khi thoát ứng dụng
- **WHEN** người dùng khởi động lại Mira và mở một phiên cũ
- **THEN** transcript và liên kết đề xuất còn xem được, và người dùng gửi lượt tiếp theo trong phiên đó

#### Scenario: Tạo phiên mới
- **WHEN** người dùng tạo hội thoại mới
- **THEN** phiên mới rỗng xuất hiện và phiên trước vẫn ở lịch sử

### Requirement: Mỗi lượt gắn chương, model và snapshot ngữ cảnh thực gửi

Mỗi lượt SHALL lưu câu hỏi, câu trả lời nguyên dạng, trạng thái, tác phẩm/chương đích, chế độ, model/cấu hình, thời điểm, usage khi có, nguồn ngữ cảnh và nội dung thực đã gửi hoặc đọc bằng công cụ. Lịch sử SHALL phân biệt nguồn Mira gửi kèm với nguồn AI tự đọc. Lượt cũ SHALL tiếp tục chỉ tới chương và snapshot của nó sau khi người dùng chuyển chương.

#### Scenario: Chuyển chương sau khi hỏi
- **WHEN** người dùng hỏi ở chương 3 rồi chuyển sang chương 12
- **THEN** lượt cũ vẫn ghi chương 3 và nội dung ngữ cảnh tại thời điểm gửi, không hiện chữ mới của chương 12 như thể đã gửi

#### Scenario: AI đọc thêm bằng công cụ
- **WHEN** model đọc chương khác qua công cụ trong lượt hỏi
- **THEN** transcript phân biệt lần đọc đó với các khối do Mira gửi sẵn

### Requirement: Phục hồi lượt bị ngắt và giới hạn lịch sử minh bạch

Lượt đang chạy khi app bị tắt hoặc tiến trình chết SHALL được đánh dấu gián đoạn khi mở lại; phần trả lời chưa hoàn chỉnh SHALL chỉ để đọc và SHALL NOT trở thành đề xuất áp dụng được. Khi lịch sử quá dài phải lược bớt ở request kế tiếp, panel SHALL cho biết lượt nào hoặc bao nhiêu lượt bị bỏ và SHALL giữ transcript đầy đủ ở kho.

#### Scenario: Tắt app giữa lúc stream
- **WHEN** ứng dụng dừng trước khi một câu trả lời hoàn tất
- **THEN** lần mở sau thấy lượt gián đoạn, chữ đã nhận nếu đã lưu và một hành động hỏi lại; không có đề xuất từ chữ dở

#### Scenario: Lược bớt lịch sử khi hỏi tiếp
- **WHEN** phiên dài vượt ngân sách ngữ cảnh của request mới
- **THEN** transcript cũ vẫn còn, request chỉ gửi phần lịch sử được chọn và giao diện nói rõ phần bị lược

### Requirement: Giữ riêng vòng đời phiên và tác vụ

Phiên SHALL có thể liên kết với đề xuất chat/dịch chương; bản thân phiên SHALL NOT biểu diễn tiến độ, retry hoặc khả năng tiếp tục của một tác vụ dịch nhiều chương. Hợp đồng dữ liệu SHALL cho phép một tác vụ Module 7 gắn kết quả từng chương vào phiên mà không đổi danh tính phiên hay đề xuất cũ.

#### Scenario: Xem kết quả của chương khác
- **WHEN** phiên có đề xuất ở nhiều chương
- **THEN** người dùng xem từng đề xuất theo chương mà không cần đứng ở chương tạo ra lượt chat cuối

### Requirement: Lịch sử riêng tư và theo vòng đời tác phẩm

Hội thoại và snapshot SHALL nằm trong tệp tác phẩm và bản sao lưu của nó; SHALL NOT chứa API key hoặc ghi nguyên văn truyện vào log/telemetry mặc định. Xóa tác phẩm theo luồng xóa của ứng dụng SHALL xóa lịch sử và đề xuất của tác phẩm đó. Khi lưu lượt thất bại, giao diện SHALL báo rõ phần nào chưa được lưu bền.

#### Scenario: Hai tác phẩm khác nhau
- **WHEN** người dùng mở panel của tác phẩm B sau khi chat trong tác phẩm A
- **THEN** lịch sử của A không xuất hiện trong B

#### Scenario: Kho đầy hoặc ghi lỗi
- **WHEN** kho không thể lưu lượt đã hoàn tất
- **THEN** app không báo lượt đã được lưu; phần chưa bền được đánh dấu và người dùng có đường thử lại
