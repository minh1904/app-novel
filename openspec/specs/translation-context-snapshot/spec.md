# translation-context-snapshot Specification

## Purpose
Bảo đảm mọi lời gọi model trong một lượt dịch chương dùng cùng một bản chụp ngữ cảnh tác phẩm đã duyệt,
và request đã gửi có thể dựng lại được từ dữ liệu lưu, để kết quả dịch nhất quán và thí nghiệm tái hiện được.

## Requirements

### Requirement: Chụp ngữ cảnh một lần khi lập kế hoạch

Khi lập kế hoạch một lượt dịch chương, hệ thống SHALL chụp ngữ cảnh tác phẩm đã duyệt áp cho chương đó:
glossary hiệu lực (gồm alias, ghi chú, mục cấm), cặp xưng hô hiệu lực, nhân vật đã duyệt và bộ mặc định
suy ra từ tác phẩm. Bản chụp SHALL được lưu bền trong dữ liệu của tác phẩm, gắn với định danh lượt dịch,
và SHALL không đổi sau khi tạo. Kế hoạch trả về SHALL cho biết bản chụp gồm bao nhiêu mục mỗi loại.

#### Scenario: Lập kế hoạch tạo bản chụp
- **WHEN** người dùng lập kế hoạch dịch một chương có glossary, cặp xưng hô và nhân vật đã duyệt
- **THEN** hệ thống lưu một bản chụp gắn với lượt dịch, và kế hoạch hiện số mục glossary, cặp xưng hô và nhân vật trong bản chụp

#### Scenario: Mục chưa duyệt không vào bản chụp
- **WHEN** chương có mục glossary đang chờ duyệt
- **THEN** bản chụp không chứa mục đó

### Requirement: Mọi lời gọi của lượt dùng cùng bản chụp

Mọi lời gọi model thuộc một lượt dịch — lượt chính của từng lô, chia lô khi bị bộ lọc chặn, gửi lại không
kèm ngữ cảnh, hỏi lại ID thiếu, và chạy lại các đoạn lỗi với cùng kế hoạch — SHALL dựng ngữ cảnh từ bản chụp
của lượt đó, không đọc lại kho ngữ cảnh. Việc lọc mục theo nội dung từng lô SHALL vẫn áp dụng, nhưng trên
bản chụp.

#### Scenario: Hai lô cùng thấy một glossary
- **WHEN** một lượt dịch có hai lô và người dùng không sửa gì giữa hai lô
- **THEN** cả hai lô lọc mục từ cùng một bản chụp, và trace của hai lô tham chiếu cùng bản chụp

#### Scenario: Chạy lại đoạn lỗi dùng bản chụp cũ
- **WHEN** người dùng chạy lại các đoạn lỗi của một lượt mà không lập kế hoạch lại
- **THEN** lời gọi mới dùng bản chụp của lượt ban đầu

### Requirement: Ngữ cảnh đổi giữa lượt được báo rõ

Khi ngữ cảnh đã duyệt áp cho chương thay đổi sau lúc chụp, lượt dịch đang chạy SHALL tiếp tục dùng bản chụp
cũ, không trộn phiên bản. Kết quả của lô chạy sau thay đổi SHALL cho biết ngữ cảnh hiện tại khác bản chụp,
và giao diện SHALL nói rằng lượt này dùng ngữ cảnh lúc bắt đầu và muốn áp dụng thay đổi thì phải lập kế hoạch
lại. Thay đổi ngữ cảnh SHALL không tự hủy hay chặn lượt đang chạy.

#### Scenario: Sửa glossary giữa lượt
- **WHEN** người dùng duyệt thêm một mục glossary trong lúc lượt dịch đang chạy lô thứ hai
- **THEN** các lô còn lại vẫn dùng bản chụp cũ, kết quả lô báo ngữ cảnh đã đổi, và giao diện hiện thông báo kèm cách lập kế hoạch lại

#### Scenario: Không đổi thì không báo
- **WHEN** ngữ cảnh không đổi trong suốt lượt dịch
- **THEN** không lô nào báo ngữ cảnh đã đổi

### Requirement: Kế hoạch không có bản chụp bị từ chối

Khi một lô được yêu cầu cho lượt dịch không có bản chụp hợp lệ (kế hoạch tạo trước khi có tính năng này, hoặc
bản chụp đã bị xóa), hệ thống SHALL từ chối lô đó bằng lỗi xung đột yêu cầu lập kế hoạch lại, và SHALL không
gửi request nào tới model.

#### Scenario: Kế hoạch cũ sau khi nâng cấp
- **WHEN** renderer gửi lô với định danh lượt không có bản chụp
- **THEN** hệ thống trả lỗi xung đột “Hãy lập kế hoạch lại” và không gọi model

### Requirement: Trace tái dựng được request

Trace của mỗi lô trong đề xuất SHALL tham chiếu bản chụp bất biến bằng định danh và hash nội dung, và SHALL ghi
đủ phần riêng của lô (đơn vị nguồn đã gửi, mục ngữ cảnh đã lọc, đoạn liền trước, phiên bản prompt, hash system
và hash request) để dựng lại đúng request lượt chính đã gửi. Dựng lại từ trace với cùng phiên bản bộ dựng
prompt SHALL cho ra request có hash trùng với hash đã ghi. Cache của nhà cung cấp SHALL không được xem là
cam kết của tính năng này.

#### Scenario: Dựng lại request từ trace
- **WHEN** đọc trace của một lô cùng bản chụp nó tham chiếu và dựng request bằng cùng phiên bản bộ dựng prompt
- **THEN** hash của request dựng lại trùng hash request đã ghi trong trace

#### Scenario: Đề xuất cũ vẫn đọc được
- **WHEN** mở một đề xuất tạo trước khi có bản chụp
- **THEN** đề xuất hiển thị và duyệt được như trước; trace cũ không bị viết lại

### Requirement: Lab ghi bản chụp theo lần chạy

Mỗi lần chạy dịch của Lab SHALL ghi hash bản chụp của từng chương vào bản ghi lần chạy, và SHALL lưu nội dung
bản chụp cạnh dữ liệu lần chạy, để hai lần chạy so sánh được biết chúng dùng cùng hay khác ngữ cảnh.

#### Scenario: Hai biến thể cùng ngữ cảnh
- **WHEN** Lab chạy hai biến thể prompt trên cùng chương mà không sửa ngữ cảnh giữa hai lần
- **THEN** bản ghi hai lần chạy mang cùng hash bản chụp cho chương đó

#### Scenario: Ngữ cảnh khác nhau được lộ ra
- **WHEN** ngữ cảnh bị sửa giữa hai lần chạy
- **THEN** hash bản chụp trong hai bản ghi khác nhau và báo cáo so sánh nêu điều đó
