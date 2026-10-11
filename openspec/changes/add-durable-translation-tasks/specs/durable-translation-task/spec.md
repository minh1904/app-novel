## Purpose

Thực hiện dịch một dải chương bằng task lưu bền và tuần tự, độc lập với turn chat, có điều khiển, ngân sách và khả năng phục hồi mà không lặp phần đã commit.

## ADDED Requirements

### Requirement: Tạo task bằng phạm vi cố định và preflight
Mira SHALL resolve work và ordered chapter IDs trước khi tạo task, lưu phạm vi, inference source, model/settings, overwrite policy, instruction version và budget. Việc tạo task SHALL trả taskId và chỉ nói đã giao việc. Chương thêm sau không tự nhập task. Thiếu raw, target có sửa tay hoặc model/budget chưa rõ SHALL được giải quyết trước khi chạy item liên quan.

#### Scenario: Dịch chương 1–30
- **WHEN** người dùng giao 30 chương đủ raw và quyền ghi
- **THEN** một task với đúng 30 item theo ID/thứ tự được commit, chưa item nào được báo completed lúc tạo

#### Scenario: Chương thiếu raw
- **WHEN** chapter 7 không có source
- **THEN** task/item chuyển waiting_user với lý do và không tính chapter 7 là completed

#### Scenario: Retry create
- **WHEN** client gửi lại cùng commandId và payload sau timeout
- **THEN** Mira trả task cũ, không tạo 30 item mới

### Requirement: Task và turn có vòng đời độc lập
Task SHALL tiếp tục khi người dùng đổi session, đổi màn hoặc turn tạo task kết thúc. Stop/cancel turn SHALL không cancel task đã được durable-accepted. Task SHALL có control Pause, Continue, Cancel, Retry riêng. Đóng hẳn app dừng execution; task chỉ tiếp tục sau khi app mở và người dùng Continue nếu recovery yêu cầu.

#### Scenario: Chat việc khác khi task chạy
- **WHEN** task đang dịch và người dùng tạo chat mới
- **THEN** task giữ tiến độ và chat mới không bị khóa bởi task

#### Scenario: Cancel turn sau khi tạo task
- **WHEN** turn đã nhận taskId rồi người dùng Stop turn
- **THEN** task không bị hủy và UI chỉ rõ control hủy task ở màn Tác vụ

### Requirement: Scheduler MVP chạy tuần tự
MVP SHALL chạy tối đa một translation item toàn ứng dụng tại một thời điểm. Mỗi item dùng translation core hiện có và chia batch theo giới hạn pipeline. Progress SHALL tăng sau commit, không sau response model. Item completed chỉ khi mọi batch bắt buộc đã commit và structural validation bắt buộc đạt.

#### Scenario: Hai task queued
- **WHEN** hai task có item sẵn sàng
- **THEN** scheduler chọn theo thứ tự bền được công bố và không chạy hai item dịch đồng thời

#### Scenario: Response chưa commit
- **WHEN** provider đã trả bản dịch nhưng commit chưa xong
- **THEN** UI chưa tăng completed segment/chapter

### Requirement: Pause, Cancel và Retry có điểm an toàn
Pause SHALL ngừng giao batch mới và chuyển paused sau batch transaction hiện tại. Cancel SHALL chặn commit mới sau khi được chấp nhận và vô hiệu work đang chờ; phần đã commit được giữ. Continue chỉ chạy phần chưa commit. Retry failed item SHALL tạo attempt mới và dùng journal để bỏ qua batch đã commit.

#### Scenario: Pause giữa item
- **WHEN** pause đến sau batch 2 bắt đầu commit
- **THEN** batch 2 hoàn tất nguyên tử, batch 3 không được giao và task thành paused với progress đúng

#### Scenario: Retry item lỗi
- **WHEN** item đã commit hai batch rồi lỗi batch ba
- **THEN** Retry không gọi lại hoặc ghi lại hai batch đầu

### Requirement: Recovery dùng journal và idempotency
Task item/attempt/batch SHALL có key bền và payload digest. Startup SHALL reconcile task running/pausing/cancelling với work journal: giữ cancel bền, chuyển phần còn lại sang paused/recovered, hoặc completed khi có đủ bằng chứng. Cùng key/cùng digest trả kết quả cũ; cùng key/khác digest là conflict. Recovery SHALL không tự gọi provider trả phí.

#### Scenario: Crash sau work commit trước library update
- **WHEN** app crash ở biên hai DB
- **THEN** startup nhận batch đã commit, cập nhật item một lần và Continue không dịch lại batch đó

#### Scenario: Source đổi khi app tắt
- **WHEN** source revision khác snapshot lúc Continue
- **THEN** item bị revision conflict và không dùng kết quả/input cũ để ghi

### Requirement: Budget và usage được kiểm trước từng request
Task SHALL lưu hard limits khả dụng, usage provider-report theo request identity và completeness. Trước request mới, scheduler SHALL kiểm giới hạn token/call/cost có thể bảo đảm. Nếu thiếu giá hoặc usage để giữ hard cost cap, task SHALL chờ người dùng đổi loại giới hạn hoặc nguồn; không ghi số 0. Mira SHALL không tự fallback sang provider khác.

#### Scenario: Chạm trần giữa task
- **WHEN** usage đã tiêu khiến request tiếp theo có thể vượt hard cap
- **THEN** task pause/waiting_user trước request và giữ mọi kết quả đã commit

#### Scenario: Event usage trùng
- **WHEN** cùng request usage được replay sau reconnect
- **THEN** tổng task không cộng hai lần

### Requirement: Màn Tác vụ phản ánh trạng thái thật
Màn Tác vụ SHALL đọc task thật và hiển thị target, inference source/model, số completed/running/failed/skipped, item hiện tại, usage completeness, lỗi và các control hợp lệ theo state. `Mở đích` SHALL điều hướng đúng chapter. Kết quả có failed/skipped SHALL không được trình bày như hoàn tất toàn bộ.

#### Scenario: Task 29 trên 30
- **WHEN** 29 item completed và một item failed
- **THEN** UI hiện partial/failed với chapter lỗi, không nói đã dịch xong 30 chương
