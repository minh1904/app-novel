## MODIFIED Requirements

### Requirement: Xóa chương

Người dùng SHALL xóa một chương sau khi xác nhận, trong hộp xác nhận nêu tên chương và cảnh báo việc này không hoàn tác được. Khi chương đã có văn bản gốc hoặc bản dịch, hộp xác nhận SHALL nói rõ bên nào sẽ mất và gợi ý sao lưu tác phẩm trước. Xóa SHALL loại chương khỏi danh sách và dồn số thứ tự các chương sau nó, và SHALL xóa mọi dữ liệu thuộc chương đó cùng lúc (không để lại dữ liệu mồ côi). Hủy hộp xác nhận SHALL không đổi gì.

#### Scenario: Xóa chương giữa danh sách
- **WHEN** người dùng xóa chương 4 trong danh sách 10 chương và xác nhận
- **THEN** còn 9 chương, các chương sau chương 4 cũ hiển thị số 4–9, và không còn dữ liệu nào của chương đã xóa

#### Scenario: Hủy xóa
- **WHEN** người dùng mở hộp xác nhận xóa rồi hủy
- **THEN** danh sách và dữ liệu không đổi

#### Scenario: Xóa chương đã có nội dung
- **WHEN** người dùng xóa một chương có cả văn bản gốc và bản dịch
- **THEN** hộp xác nhận nêu chương sẽ mất cả bản gốc lẫn bản dịch, gợi ý sao lưu trước, và sau khi xác nhận không còn văn bản hay segment nào của chương đó

#### Scenario: Xóa chương chỉ có bản gốc
- **WHEN** người dùng xóa một chương chỉ có văn bản gốc
- **THEN** hộp xác nhận chỉ nêu mất bản gốc, không nhắc bản dịch
