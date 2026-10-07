# model-thinking-levels Specification

## Purpose
Bảo đảm Mira chỉ gửi mức thinking mà model hỗ trợ, kiểm ở main khi lưu cài đặt, trước khi gọi và trong Lab, để một mức sai bị chặn sớm với thông báo rõ thay vì thành lỗi 400 giữa lượt dịch.

## Requirements

### Requirement: Mức thinking hợp lệ theo từng model

Hệ thống SHALL xác định các mức thinking hợp lệ của mỗi model từ catalog đi kèm bản cài, cộng thêm các dòng đo thật đã có bằng chứng. Hệ thống SHALL NOT suy mức hợp lệ theo họ model (ví dụ "chỉ model 2.5 tắt được thinking") khi đã có dữ liệu của chính model đó. Model không có trong catalog SHALL chỉ có mức "Mặc định", tức không gửi tham số thinking nào.

#### Scenario: Model không khai mức tắt
- **WHEN** catalog khai `gemini-3.5-flash-lite` chỉ có các mức `minimal`, `low`, `medium`, `high`
- **THEN** mức "Tắt" không có trong danh sách mức hợp lệ của model đó

#### Scenario: Dòng đo thật thêm mức
- **WHEN** catalog không khai mức "Tắt" cho `gemini-3.5-flash` nhưng có dòng đo thật kèm bản ghi HTTP 200
- **THEN** mức "Tắt" có trong danh sách mức hợp lệ của model đó

### Requirement: Main kiểm mức thinking khi lưu cài đặt

Khi lưu cài đặt của một mục model có trong catalog, main SHALL từ chối mức thinking không nằm trong danh sách hợp lệ của model đó, và SHALL trả về thông báo nêu các mức hợp lệ. Việc kiểm này SHALL áp cho mọi đường lưu, kể cả đường không đi qua giao diện.

#### Scenario: Lưu mức không hợp lệ qua IPC
- **WHEN** một lệnh lưu cài đặt gửi mức "Tắt" cho `gemini-3.5-flash-lite`
- **THEN** cài đặt không được lưu, và lỗi nêu các mức hợp lệ `minimal`, `low`, `medium`, `high`

### Requirement: Chặn mức không hợp lệ trước khi gọi nhà cung cấp

Trước khi gửi một yêu cầu dịch hoặc chat với model có trong catalog, hệ thống SHALL kiểm mức thinking đang lưu với danh sách hợp lệ hiện tại. Nếu mức đó không còn hợp lệ, chẳng hạn vì catalog đã đổi sau khi lưu, hệ thống SHALL không gọi nhà cung cấp. Lỗi trả về SHALL là yêu cầu không hợp lệ, nêu mức đang lưu và mức hợp lệ gần nhất. Hệ thống SHALL NOT tự đổi sang mức khác rồi gửi.

#### Scenario: Catalog đổi sau khi lưu
- **WHEN** một mục model đã lưu mức "Tắt", và bản cài mới có catalog không còn khai mức đó cho model này
- **THEN** lượt dịch dừng trước khi gọi nhà cung cấp, với thông báo nêu mức "Tắt" không còn hợp lệ và gợi ý `minimal`

#### Scenario: Model ngoài catalog
- **WHEN** mục model là alias không có trong catalog và người dùng đã đặt mức thinking qua `extra_body`
- **THEN** hệ thống không chặn trước. Nếu nhà cung cấp trả 400 thì lỗi được báo là yêu cầu không hợp lệ kèm các tham số đã gửi

### Requirement: Lab dùng cùng phép kiểm mức thinking

Lab SHALL kiểm mức thinking của mỗi biến thể với danh sách hợp lệ của model trước khi chạy lời gọi nào. Lab SHALL dừng biến thể đó với thông báo nêu mức hợp lệ, thay vì chạy rồi ghi một lần chạy toàn lỗi vào sổ đăng ký.

#### Scenario: Biến thể nothink với model không tắt được thinking
- **WHEN** Lab chạy biến thể `-nothink` với `gemini-3.5-flash-lite`
- **THEN** Lab dừng biến thể đó trước lời gọi đầu tiên, báo mức "Tắt" không hợp lệ và nêu các mức hợp lệ
- **AND** sổ đăng ký không có lần chạy $0 cho biến thể đó
