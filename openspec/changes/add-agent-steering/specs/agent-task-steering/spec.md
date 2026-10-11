## Purpose

Cho phép người dùng thay đổi hướng dẫn của task đang chạy với phiên bản và điểm hiệu lực rõ ràng, không âm thầm sửa item đã commit hoặc thay snapshot của work đang thực thi.

## ADDED Requirements

### Requirement: Steering là bản ghi bền có đích
Mỗi steering SHALL lưu taskId, clientCommandId, actor, instruction/context delta, requested effective point, createdAt và trạng thái. Nội dung SHALL được validate như task input và không được chứa ID ngoài task scope. Gửi lại cùng clientCommandId/payload trả bản ghi cũ; cùng ID khác payload là conflict.

#### Scenario: Chỉ dẫn từ chương 8
- **WHEN** người dùng gửi “từ chương 8 dùng cách xưng hô mới”
- **THEN** Mira resolve chapter 8 thành item ordinal và lưu steering pending với điểm hiệu lực đó

#### Scenario: Đích ngoài task
- **WHEN** steering nêu chapter không thuộc task
- **THEN** Mira yêu cầu làm rõ hoặc từ chối, không mở rộng phạm vi task

### Requirement: Item chưa bắt đầu nhận version mới
Scheduler SHALL chọn instruction/context version tại lúc item chuyển từ queued sang running và lưu snapshot. Steering mặc định chỉ áp dụng item chưa bắt đầu ở hoặc sau điểm hiệu lực. Item completed, failed có commit hoặc running SHALL giữ version đã chốt trừ khi người dùng chọn workflow redo riêng.

#### Scenario: Chapter 7 đang chạy
- **WHEN** chapter 7 đã running và steering có hiệu lực từ chapter 8
- **THEN** chapter 7 giữ version cũ; chapter 8 trở đi chọn version mới

#### Scenario: Steering đến muộn
- **WHEN** chapter 8 đã running trước lúc steering được commit
- **THEN** Mira báo điểm hiệu lực sớm nhất là item chưa bắt đầu tiếp theo, không nói chapter 8 đã dùng chỉ dẫn mới

### Requirement: Đổi item đang chạy phải pause và làm rõ phần đã commit
Nếu người dùng yêu cầu áp steering cho item running, Mira SHALL yêu cầu pause ở batch boundary. Sau pause, UI SHALL hiển thị batch đã commit và cho chọn giữ phần đó rồi áp cho phần còn lại, Undo/redo theo operation hợp lệ, hoặc áp từ item sau. Không tự xóa hoặc dịch lại phần đã commit.

#### Scenario: Hai batch đã commit
- **WHEN** người dùng muốn đổi instruction cho chapter đang chạy sau hai batch
- **THEN** task pause an toàn và chưa chạy version mới cho tới khi người dùng chọn cách xử lý

### Requirement: Steering, pause và cancel được serialize
Task coordinator SHALL serialize steering với pause/cancel/item-start bằng stateVersion hoặc equivalent guard. Cancel thắng mọi steering chưa áp dụng; pause giữ steering pending; Continue áp version mới nếu precondition còn hợp lệ. Hai steering liên tiếp SHALL có thứ tự bền; steering sau có thể supersede phần chưa chạy nhưng không xóa audit.

#### Scenario: Cancel đồng thời steering
- **WHEN** cancel được chấp nhận trước steering commit
- **THEN** steering không áp dụng và task không khởi động item mới

#### Scenario: Hai chỉ dẫn cùng điểm hiệu lực
- **WHEN** steering B được tạo sau A cho cùng field/chapter range
- **THEN** B là version effective mới, A được đánh dấu superseded cho phạm vi chưa chạy và lịch sử vẫn đọc được

### Requirement: Context steering vẫn qua review
Steering thêm/sửa glossary, nhân vật hoặc xưng hô SHALL đi qua Context validation/review hiện hành. Nó không tự approve candidate. Instruction text thuần có thể được chấp nhận trực tiếp trong phạm vi task; UI SHALL phân biệt instruction override với thay đổi dữ liệu Context bền.

#### Scenario: Thêm thuật ngữ giữa task
- **WHEN** người dùng thêm mapping mới qua steering
- **THEN** entry phải approved trước khi snapshot item sau chứa mapping; task có thể chờ review

### Requirement: Người dùng thấy điểm hiệu lực thực tế
Task detail SHALL hiển thị timeline steering, trạng thái pending/effective/superseded/rejected, item đầu tiên thực sự dùng version và link tới instruction/context diff. Tổng kết SHALL nêu chapter nào dùng version nào khi task có nhiều version.

#### Scenario: Task hoàn tất qua hai version
- **WHEN** chapter 1–7 dùng v1 và 8–30 dùng v2
- **THEN** kết quả task thể hiện hai khoảng và không gộp như toàn bộ dùng chỉ dẫn cuối
