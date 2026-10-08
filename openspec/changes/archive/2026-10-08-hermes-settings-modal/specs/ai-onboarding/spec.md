## Purpose

Quy định luồng kết nối nhà cung cấp AI lần đầu theo Hermes Desktop: một thẻ ở giữa màn dẫn người dùng tới
một kết nối dùng được và một model mặc định.

## ADDED Requirements

### Requirement: Thẻ onboarding khi chưa có kết nối

Khi thư viện chưa có kết nối AI nào và người dùng chưa chọn "Để sau", Mira SHALL hiện một thẻ onboarding ở
giữa màn khi người dùng lần đầu mở một tính năng AI (panel chat, hộp thoại dịch) hoặc khi mở app. Thẻ SHALL
có:

- tiêu đề và một dòng giải thích;
- một dòng nổi bật "Gateway tự dựng";
- "Nhà cung cấp khác", mở ra các thẻ Tài khoản và Khóa API;
- "Tôi có khóa API";
- "Để sau".

"Để sau" SHALL được ghi nhớ. Khi đó onboarding chỉ mở lại khi người dùng tự mở từ menu model hoặc từ Cài
đặt.

#### Scenario: Mở app lần đầu
- **WHEN** người dùng mở Mira với một thư viện không có kết nối AI
- **THEN** thẻ onboarding hiện ở giữa màn với dòng "Gateway tự dựng" nổi bật

#### Scenario: Để sau
- **WHEN** người dùng bấm "Để sau" rồi mở lại app
- **THEN** thẻ onboarding không tự hiện nữa

### Requirement: Form khóa API trong onboarding

"Tôi có khóa API" SHALL hiện một lưới thẻ provider hai cột. Thẻ được chọn có viền accent và vòng nhạt;
provider đã có khóa có dấu ✓. Dưới lưới là mô tả, link "Lấy khóa ↗", ô dán khóa, và các nút Xóa (khi đã có
khóa) và Kết nối. Thẻ "Endpoint tùy chỉnh" SHALL thêm ô URL và kiểm theo yêu cầu "Kiểm endpoint và khóa".

#### Scenario: Kết nối bằng khóa Gemini
- **WHEN** người dùng chọn Google Gemini, dán khóa rồi bấm Kết nối
- **THEN** Mira tạo kết nối, kiểm khóa, rồi chuyển sang màn xác nhận model mặc định

### Requirement: Màn xác nhận model mặc định

Sau khi kết nối thành công, onboarding SHALL hiện màn xác nhận gồm: tên kết nối, model mặc định do Mira
chọn, giá vào/ra mỗi triệu token (lấy từ catalog nếu có), nút "Đổi" mở menu model, và nút "Bắt đầu". Bắt
đầu SHALL đặt model đó làm model chính rồi đóng onboarding.

#### Scenario: Đổi model trước khi bắt đầu
- **WHEN** người dùng bấm Đổi, chọn model khác rồi bấm Bắt đầu
- **THEN** model vừa chọn thành model chính

### Requirement: Trạng thái lỗi

Khi kết nối thất bại, onboarding SHALL hiện:

- lý do bằng lời của Mira;
- phần "Chi tiết" thu gọn chứa thông báo gốc đã che khóa;
- ba nút "Thử lại", "Dùng khóa API khác" và "Chọn nhà cung cấp khác".

#### Scenario: Khóa sai
- **WHEN** khóa bị từ chối với HTTP 401
- **THEN** onboarding ghi "Khóa bị từ chối" và giữ nguyên provider đã chọn để người dùng dán lại
