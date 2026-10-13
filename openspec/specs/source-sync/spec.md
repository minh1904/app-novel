# source-sync Specification

## Purpose
Quy định lượt kiểm tra nguồn thủ công, catalog diff, revision nội dung và feed Cập nhật theo nguyên tắc idempotent, phục hồi được và không phá hủy dữ liệu địa phương.

## Requirements

### Requirement: Bản đầu chỉ đồng bộ theo yêu cầu khi app đang mở

Mira SHALL chỉ bắt đầu kiểm nguồn khi người dùng bấm kiểm tra trong lúc ứng dụng đang mở. Bản đầu SHALL
không chạy lịch tự động, OS background agent hay cloud polling. UI SHALL không hứa thông báo khi app hoặc
máy tính đã tắt.

#### Scenario: Máy tính tắt
- **WHEN** nguồn có chương mới trong lúc máy tính tắt
- **THEN** Mira chỉ phát hiện chương đó sau khi người dùng mở app và chủ động kiểm tra

### Requirement: Một lượt sync có tiến độ, hủy và kết quả bền

Mỗi lượt sync SHALL có ID, binding, adapter version, trạng thái, tiến độ và lỗi đã phân loại. Chỉ một lượt
cùng loại SHALL chạy trên một binding. Người dùng SHALL hủy được lượt đang chạy; dữ liệu đã commit theo
item SHALL còn hợp lệ và lần sau tiếp tục mà không nhân đôi event.

#### Scenario: Hủy giữa catalog nhiều trang
- **WHEN** người dùng hủy lượt sync đang đọc catalog
- **THEN** request hiện tại bị hủy, run chuyển `cancelled` và snapshot chưa hoàn chỉnh không tạo sự kiện mất chương

### Requirement: Chỉ catalog đầy đủ và hợp lệ được dùng cho diff phá hủy

Trước khi diff, Mira SHALL kiểm remote work identity, remote chapter ID trùng, pagination kết thúc, body
không rỗng và mức giảm bất thường. Snapshot lỗi, rỗng bất thường hoặc chưa đủ trang SHALL không tăng
`missing_streak` và không tạo hàng loạt `missing_remote`.

#### Scenario: Website trả trang đăng nhập với HTTP 200
- **WHEN** adapter nhận HTTP 200 nhưng semantic assertion xác định đây là trang đăng nhập
- **THEN** run chuyển `login_required`, catalog cũ giữ nguyên và không chương nào bị coi là mất

### Requirement: Catalog diff dùng remote identity và sinh event idempotent

Diff SHALL ghép item bằng `(sourceId, remoteWorkId, remoteChapterId)`. Khi nguồn không có ID bền, fallback
SHALL được đánh dấu confidence. Diff SHALL nhận biết ít nhất `added`, `renamed`, `moved`,
`access_changed`, `missing_remote`, `reappeared`; mỗi event SHALL có dedupe key để chạy lại không nhân đôi.

#### Scenario: Chương đổi tiêu đề
- **WHEN** cùng remote chapter ID xuất hiện với tiêu đề mới trong snapshot hợp lệ
- **THEN** catalog item được cập nhật và chỉ một event `renamed` được tạo

### Requirement: Chương chỉ được xác nhận mất sau ba snapshot hợp lệ

`missing_streak` SHALL chỉ tăng sau mỗi snapshot đầy đủ, hợp lệ liên tiếp không còn item. Trước lần thứ ba,
item SHALL mang trạng thái nghi ngờ mất. Ở lần thứ ba, Mira SHALL đánh dấu mất từ xa nhưng không xóa dữ
liệu địa phương. Item xuất hiện lại SHALL giữ `first_seen_at` và tạo `reappeared`.

#### Scenario: Chương vắng hai lần rồi xuất hiện lại
- **WHEN** item vắng trong hai snapshot hợp lệ và trở lại ở snapshot thứ ba
- **THEN** item không bị xác nhận đã gỡ, `missing_streak` trở về 0 và event `reappeared` được tạo

### Requirement: Phát hiện chương mới chỉ tạo thông báo

Khi diff có `added`, Mira SHALL lưu catalog và tạo update event; SHALL không tự lấy nội dung, tạo chapter,
ghi `chapter_text.source` hoặc xếp hàng dịch. Người dùng SHALL xem preview rồi chọn hành động riêng.

#### Scenario: Có năm chương mới
- **WHEN** manual sync phát hiện năm item `added`
- **THEN** trang Cập nhật hiện năm mục và không có tác vụ tải/dịch tự động nào được tạo

### Requirement: Revision raw không ghi đè bản dịch

Nội dung lấy theo yêu cầu SHALL được chuẩn hóa có version, hash và lưu thành revision bất biến. Khi hash
raw đã áp vào chương thay đổi, Mira SHALL tạo `raw_changed` và chỉ gắn cờ; SHALL không tự ghi đè raw đang
biên tập hoặc bản dịch. Áp revision SHALL dùng optimistic revision.

#### Scenario: Raw đã dịch bị sửa
- **WHEN** nguồn trả nội dung mới cho chapter đã có bản dịch
- **THEN** Mira lưu revision mới, hiện diff và cờ `raw_changed`, còn raw làm việc cùng bản dịch giữ nguyên

### Requirement: Access state được giữ trong catalog

Item không đọc được SHALL vẫn nằm trong catalog với trạng thái phân biệt ít nhất `public`,
`login_required`, `age_verification_required`, `entitlement_required`,
`manual_intervention_required`, `temporarily_unavailable`, `parser_broken`. Mira SHALL không retry mù
các trạng thái cần quyền hoặc thao tác người dùng.

#### Scenario: Chương cần quyền mua
- **WHEN** adapter xác định tài khoản hiện tại không có entitlement cho chương
- **THEN** item vẫn được đếm trong catalog, hiện cần quyền truy cập và không bị retry tự động
