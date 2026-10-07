## Purpose

Quy định menu chọn model trong ô chat và hộp thoại dịch theo Hermes Desktop: tìm kiếm, yêu thích, mức suy
luận theo từng model, và lối tắt sang cài đặt.

## ADDED Requirements

### Requirement: Pill model trong ô soạn

Ô soạn SHALL có một pill dạng nút ghost, ghi tên model đang dùng và ▾. Khi người dùng đã chọn một model
khác model chính cho phiên này, pill SHALL có một chấm accent. Khi model có mức suy luận đặt riêng, pill
SHALL kèm nhãn mức. Tooltip của pill SHALL ghi tên kết nối và model. Bấm pill hoặc nhấn `Ctrl+Shift+M`
SHALL mở menu phía trên ô soạn.

#### Scenario: Model khác mặc định
- **WHEN** người dùng chọn một model khác model chính cho phiên
- **THEN** pill hiện tên model đó kèm chấm accent

### Requirement: Tìm, yêu thích và nhóm

Menu SHALL có các phần sau, từ trên xuống:

1. Ô "Tìm model".
2. Nhóm "Yêu thích".
3. Một nhóm cho mỗi kết nối đang bật. Đầu nhóm có thể bấm để thu gọn, và trạng thái thu gọn được ghi nhớ.

Mỗi dòng model SHALL có sao yêu thích, tên, nhãn từ catalog (ví dụ Preview, Flash), nhãn mức suy luận đang
đặt (ví dụ MED), dấu ✓ nếu đang dùng, và ›. Phím:

| Phím | Tác dụng |
| --- | --- |
| ↑ / ↓ | Di chuyển |
| Enter | Chọn |
| Shift+Enter | Bật/tắt yêu thích |
| → | Mở submenu |
| Esc | Đóng |

Yêu thích SHALL được ghi nhớ giữa các lần mở app.

#### Scenario: Tìm
- **WHEN** người dùng gõ "flash" vào ô tìm
- **THEN** chỉ còn các model có "flash" trong tên, ở mọi kết nối

#### Scenario: Đánh dấu yêu thích
- **WHEN** người dùng đứng ở một dòng và nhấn Shift+Enter
- **THEN** model đó hiện thêm trong nhóm Yêu thích ở đầu menu

### Requirement: Submenu suy luận

Submenu của một dòng model SHALL có hai phần:

- **"Tùy chọn"** với công tắc "Suy luận". Công tắc chỉ hiện khi model tắt được suy luận.
- **"Mức"** liệt kê các mức model hỗ trợ, theo thứ tự Tối thiểu, Thấp, Vừa, Cao, Rất cao, Tối đa, và có
  dấu ✓ ở mức đang chọn.

Model không rõ khả năng SHALL chỉ có "Mặc định". Chọn một mức SHALL chọn model đó và ghi mức vào mục model,
như menu hiện nay.

#### Scenario: Model chỉ có ba mức
- **WHEN** người dùng mở submenu của Gemini 2.5 Flash
- **THEN** phần Mức chỉ có Thấp, Vừa, Cao

### Requirement: Lối tắt cuối menu

Cuối menu SHALL có:

| Mục | Tác dụng |
| --- | --- |
| "Dùng mặc định trong Cài đặt" | Bỏ lựa chọn riêng của phiên, quay về model chính. Chỉ hiện khi đang có lựa chọn riêng |
| "Tải lại model" | Gọi lại danh sách model của các kết nối |
| "Thêm model tùy chỉnh…" | Ô tìm thành ô nhập id model, Enter thì thêm mục model vào kết nối đang chọn |
| "Sửa danh sách model…" | Mở modal Cài đặt ở thẻ của kết nối đó |
| "Thêm nhà cung cấp" | Mở onboarding. Chỉ hiện khi chưa có kết nối nào |

#### Scenario: Thêm model tùy chỉnh
- **WHEN** người dùng chọn "Thêm model tùy chỉnh…", gõ `openai/gpt-5.5` rồi nhấn Enter
- **THEN** kết nối OpenRouter có thêm mục model đó, và mục được chọn cho phiên

### Requirement: Dùng chung cho chat và dịch

Hộp thoại dịch SHALL dùng cùng menu này, dưới dạng một trường chọn thay cho pill. Lựa chọn trong hộp thoại
dịch SHALL NOT đổi model của phiên chat.

#### Scenario: Chọn model khi dịch
- **WHEN** người dùng chọn DeepSeek trong hộp thoại dịch
- **THEN** lô dịch dùng DeepSeek, còn pill của panel chat giữ nguyên
