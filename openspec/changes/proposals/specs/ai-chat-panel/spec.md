## Purpose

Panel chat giúp người dịch biết AI đang đọc gì, được đề xuất sửa chỗ nào và câu trả lời có đủ để duyệt hay không, đồng thời giữ transcript dễ đọc và dùng được bằng bàn phím.

## ADDED Requirements

### Requirement: Ngữ cảnh đọc và đích sửa là hai phạm vi độc lập

Composer SHALL hiển thị tác phẩm/chương hiện tại, các nguồn tự động, các nguồn người dùng thêm và đích sửa nếu ở chế độ Sửa. Chọn một nguồn để AI đọc SHALL NOT tự mở rộng đích sửa. Mặc định đích Sửa là vùng chọn trong pane dịch hoặc đoạn chứa con trỏ; sửa cả chương SHALL đòi chọn rõ. Pane dịch trống SHALL cho phép chọn đích “bản dịch chương trống” để tạo đề xuất chờ duyệt.

#### Scenario: Thêm cả chương làm ngữ cảnh
- **WHEN** người dùng đang nhắm sửa một đoạn và thêm cả chương làm ngữ cảnh đọc
- **THEN** composer vẫn báo đích sửa là đoạn đó và AI không được đề xuất thay cả chương

#### Scenario: Pane dịch trống
- **WHEN** người dùng muốn dịch chương chưa có bản dịch qua panel
- **THEN** composer chỉ rõ bản gốc chương là ngữ cảnh và đích là bản dịch chương trống; kết quả là đề xuất chờ duyệt

#### Scenario: Con trỏ dời khi đang soạn câu hỏi
- **WHEN** người dùng đổi vùng chọn hoặc con trỏ sau khi bắt đầu soạn
- **THEN** phạm vi tự động hiện trong composer cập nhật trước lúc gửi; nguồn đã ghim tay giữ snapshot hoặc báo rõ cần làm mới

### Requirement: Hành động gửi chat quyết định chính sách ghi của lượt

Composer SHALL có Gửi để trò chuyện và hai hành động viết lúc gửi: Tạo đề xuất, Áp dụng thẳng. Không bắt người dùng duy trì mode Hỏi/Sửa. Gửi SHALL không tạo đề xuất ghi. Tạo đề xuất SHALL tạo đề xuất pending. Áp dụng thẳng SHALL tạo đề xuất rồi tự Accept qua cùng phép kiểm; nếu không an toàn, SHALL giữ đề xuất chờ duyệt. Trước hành động viết, composer SHALL hiển thị đích sửa. Hành động SHALL được lưu theo lượt và không tự đổi khi pane trống hoặc khi người dùng chuyển chương.

#### Scenario: Chọn Áp dụng thẳng trong chat
- **WHEN** người dùng dùng hành động Áp dụng thẳng, nhắm một đoạn và gửi yêu cầu sửa
- **THEN** lượt chat ghi rõ hành động/đích; bản thay thế hoàn chỉnh được tự Accept nếu base hợp lệ, nếu không hiện đề xuất cần duyệt

#### Scenario: Gửi thường không ghi chữ
- **WHEN** người dùng dùng Gửi và model trả một bản dịch trong câu trả lời
- **THEN** bản dịch chỉ nằm trong transcript, không tạo đề xuất hoặc thay pane đích

### Requirement: Thêm và kiểm tra ngữ cảnh trước khi gửi

Composer SHALL có một đường `Thêm ngữ cảnh` để chọn nguồn khả dụng trong tác phẩm, gồm vùng/chương hiện tại và chương khác; mục thuật ngữ/xưng hô SHALL chỉ lấy các mục đã duyệt, đúng hiệu lực chương. Người dùng SHALL xem được nội dung thực, nguồn, kích thước và trạng thái tự động/thêm tay trước khi gửi, và bỏ được nguồn thêm tay. Payload gửi SHALL khớp bản xem trước tại thời điểm gửi; vượt ngân sách SHALL được báo trước và cho thu hẹp nguồn, không cắt ngầm hoặc gọi “cả chương” khi chỉ gửi phần đầu.

#### Scenario: Chương vượt giới hạn
- **WHEN** bản gốc chương dài hơn giới hạn ngữ cảnh của chat
- **THEN** panel nêu phần sẽ không gửi trước khi gọi AI và cho người dùng chọn phạm vi phù hợp

#### Scenario: Xem trước rồi gửi
- **WHEN** người dùng mở preview và gửi câu hỏi không đổi nguồn
- **THEN** nội dung snapshot lưu trong lượt trùng với nội dung đã xem trước và payload gửi nhà cung cấp

#### Scenario: Mục ngữ cảnh chưa duyệt
- **WHEN** tác phẩm có thuật ngữ hoặc cặp xưng hô `pending`/`rejected`
- **THEN** các mục đó không nằm trong nguồn khả dụng hoặc payload gửi AI

### Requirement: Câu trả lời đọc được và văn bản đề xuất giữ nguyên dạng

Phần giải thích của AI SHALL trình bày Markdown thông dụng (đoạn, tiêu đề, danh sách, trích dẫn, nhấn mạnh, link, khối mã/văn bản) với HTML không tin cậy bị vô hiệu hóa; nội dung trả lời SHALL NOT tự thực thi script hoặc tải ảnh ngoài. Văn bản thay thế cho bản dịch SHALL được lưu và hiển thị nguyên dạng riêng với giải thích, không biến cú pháp truyện thành HTML/Markdown đã render. Panel SHALL cho xem đề xuất trong editor và sao chép riêng lời giải thích hoặc bản thay thế.

#### Scenario: AI trả danh sách và khối thay thế
- **WHEN** câu trả lời Sửa có lời giải thích dạng Markdown và khối văn bản thay thế hợp lệ
- **THEN** lời giải thích có cấu trúc đọc được, bản thay thế giữ nguyên xuống dòng/ký tự và có đường mở diff

#### Scenario: Nội dung HTML độc hại
- **WHEN** AI trả HTML/script hoặc đường ảnh từ xa trong Markdown
- **THEN** panel không thực thi mã hay tự tải ảnh đó

### Requirement: Chỉ câu trả lời hoàn chỉnh mới tạo đề xuất sửa

Panel SHALL phân biệt đang stream, đã xong, bị hủy, lỗi và bị cắt do giới hạn provider. Chỉ câu trả lời Sửa hoàn tất, có khối thay thế xác định và đích sửa còn hợp lệ SHALL tạo đề xuất; trường hợp khác SHALL cho đọc/hỏi lại và giải thích vì sao chưa có đề xuất. Hỏi SHALL không tạo hành động ghi, dù câu trả lời có chứa bản dịch.

#### Scenario: Model dừng vì giới hạn độ dài
- **WHEN** provider kết thúc lượt Sửa vì hết giới hạn output
- **THEN** phần chữ đã nhận còn đọc được nhưng không tạo đề xuất áp dụng

#### Scenario: Fence thiếu hoặc chưa đóng
- **WHEN** lượt Sửa hoàn tất mà không có một khối thay thế xác định
- **THEN** panel báo không có đề xuất, giữ câu trả lời để đọc và cho hỏi lại

#### Scenario: Hủy khi đang stream
- **WHEN** người dùng hủy lượt Sửa trước khi kết thúc
- **THEN** không có đề xuất từ phần trả lời dở

### Requirement: Dấu vết mỗi lượt và tương tác bàn phím

Mỗi lượt SHALL cho thấy câu hỏi, câu trả lời, trạng thái, ngữ cảnh Mira đã gửi và nội dung AI đọc thêm bằng công cụ dưới hai nhãn khác nhau, model/usage khi có và liên kết đề xuất. Composer SHALL gửi được bằng bàn phím mà không nuốt Enter khi bộ gõ IME đang composition; các điều khiển SHALL có nhãn và trạng thái focus nhìn được.

#### Scenario: Gửi bằng IME
- **WHEN** người dùng đang xác nhận một từ bằng Enter trong bộ gõ tiếng Việt/Nhật/Trung
- **THEN** panel không gửi câu hỏi trước khi composition kết thúc

#### Scenario: Model đọc thêm chương khác
- **WHEN** AI dùng công cụ đọc chương khác
- **THEN** lượt hỏi hiển thị riêng nguồn đọc thêm và các nguồn Mira gửi sẵn
