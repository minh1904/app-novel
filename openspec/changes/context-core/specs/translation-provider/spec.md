# translation-provider Specification

> Cập nhật 2026-10-03 (ADR-005): đơn vị là **đoạn** và ID chỉ là ID tạm trong một lần gọi. Tên requirement bên dưới ("theo segment ID") giữ nguyên để khớp spec chính khi archive; tên sẽ đổi cùng change gỡ segment.

## MODIFIED Requirements

### Requirement: Yêu cầu và phản hồi dịch theo segment ID

Một yêu cầu dịch SHALL gồm danh sách đoạn (mỗi đoạn một ID tạm có hiệu lực trong đúng lần gọi đó, và văn bản nguồn), ngôn ngữ nguồn và đích, và **ngữ cảnh dưới dạng các khối có tầng và có thứ tự** (tầng ổn định cả lần dịch, tầng ổn định trong một chương, tầng theo đoạn) kèm **mã băm ngữ cảnh**. Ngữ cảnh SHALL là tùy chọn: yêu cầu không có ngữ cảnh vẫn hợp lệ. Provider SHALL gửi các khối theo đúng thứ tự đã nhận và SHALL NOT sắp xếp lại, gộp hay chèn nội dung của mình vào giữa các khối. Phản hồi thành công SHALL trả với mỗi ID một bản dịch, kèm định danh provider và model. Ánh xạ kết quả SHALL dựa trên ID, không dựa trên thứ tự.

#### Scenario: Phản hồi đủ ID
- **WHEN** provider trả về kết quả cho mọi ID đã gửi
- **THEN** mỗi bản dịch được gắn đúng đoạn theo ID kể cả khi thứ tự trả về khác thứ tự gửi

#### Scenario: Phản hồi thiếu hoặc thừa ID
- **WHEN** phản hồi thiếu một ID hoặc chứa ID không có trong yêu cầu
- **THEN** hệ thống coi các ID thiếu là lỗi có thể thử lại, bỏ qua ID thừa, và không gắn bản dịch nào sai đoạn

#### Scenario: Yêu cầu không có ngữ cảnh
- **WHEN** gửi một yêu cầu dịch không kèm khối ngữ cảnh nào
- **THEN** yêu cầu vẫn chạy bình thường và bản ghi của lần gọi (`proposal` hoặc `job_item`) ghi là không có ngữ cảnh

#### Scenario: Thứ tự khối được giữ nguyên
- **WHEN** yêu cầu mang ba tầng ngữ cảnh theo thứ tự đã định
- **THEN** nội dung gửi tới nhà cung cấp giữ đúng thứ tự đó, với phần ổn định đứng trước phần biến thiên theo đoạn

## ADDED Requirements

### Requirement: Mã băm ngữ cảnh đi cùng bản dịch

Khi một yêu cầu dịch mang ngữ cảnh, phản hồi SHALL mang theo **mã băm ngữ cảnh** đã dùng để người gọi lưu cùng bản ghi của lần gọi (`proposal` hoặc `job_item`). Hai yêu cầu có cùng mã băm ngữ cảnh SHALL đã nhận cùng nội dung ngữ cảnh.

#### Scenario: Băm được trả lại
- **WHEN** gửi một yêu cầu dịch có ngữ cảnh
- **THEN** phản hồi mang đúng mã băm của ngữ cảnh đã gửi, dùng được để lưu cùng bản ghi của lần gọi

### Requirement: Provider giả lập phản ánh ngữ cảnh đã nhận

Provider giả lập SHALL nhận cùng dạng khối ngữ cảnh như provider thật, SHALL trả lại mã băm đã nhận, và SHALL cho phép kiểm thử xác nhận những gì đã được gửi — gồm thứ tự khối và việc một mục nào đó có hoặc không có trong khối.

#### Scenario: Kiểm thử xác nhận nội dung đã gửi
- **WHEN** kiểm thử gửi một yêu cầu có ngữ cảnh tới provider giả lập
- **THEN** kiểm thử đọc lại được đúng các khối đã gửi theo thứ tự để so với kỳ vọng
