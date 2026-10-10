## Purpose

Quy định dữ liệu nguồn được lưu ở đâu, cách giữ tương thích file `.mira`, bảo vệ secret và biểu diễn ngôn ngữ mở rộng an toàn qua migration.

## ADDED Requirements

### Requirement: File tác phẩm lưu được BCP-47

File `.mira` SHALL lưu `source_lang` dưới dạng BCP-47 thay vì enum SQL đóng. Mira SHALL hỗ trợ sẵn ít
nhất `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`; ngôn ngữ hợp lệ chưa có profile dịch SHALL vẫn mở và giữ
nguyên dữ liệu, đồng thời UI SHALL báo các chức năng chưa có profile thay vì coi file bị hỏng.

#### Scenario: Mở tác phẩm tiếng Hàn
- **WHEN** một tác phẩm có `source_lang = ko`
- **THEN** tác phẩm mở bình thường và tiếng Hàn xuất hiện trong lựa chọn ngôn ngữ nguồn

#### Scenario: Tag hợp lệ chưa có profile
- **WHEN** một file dùng BCP-47 hợp lệ mà Mira chưa có preset dịch
- **THEN** file vẫn mở và giữ tag; tính năng cần preset báo chưa hỗ trợ thay vì từ chối toàn bộ tác phẩm

### Requirement: Dữ liệu nguồn được phân vùng theo quyền sở hữu

`library.db` SHALL giữ registry adapter, auth profile, health và trạng thái job cấp ứng dụng. File `.mira`
SHALL giữ binding, catalog, revision nội dung, sync run và update event thuộc tác phẩm. Catalog/revision
không được chỉ tồn tại trong `library.db`.

#### Scenario: Sao chép một file tác phẩm
- **WHEN** người dùng sao chép file `.mira` sang một thư viện Mira khác
- **THEN** binding, catalog và lịch sử cập nhật của tác phẩm đi cùng file

### Requirement: Secret không đi cùng tác phẩm

Credential SHALL được mã hóa ở dữ liệu cấp ứng dụng. File `.mira` chỉ SHALL lưu opaque auth profile ID,
không lưu cookie, token, mật khẩu hay khóa dạng rõ.

#### Scenario: Mở backup trên máy khác
- **WHEN** file `.mira` có binding tham chiếu auth profile không tồn tại trên máy mới
- **THEN** tác phẩm vẫn mở và binding chuyển sang `login_required`, không làm hỏng file

### Requirement: Một nguồn hỗ trợ nhiều auth profile

Mira SHALL lưu nhiều auth profile cho cùng `sourceId`, mỗi profile có ID, nhãn tài khoản, trạng thái và
phân vùng session riêng. Một binding SHALL chọn tối đa một profile tại một thời điểm và người dùng SHALL
đổi profile mà không tạo lại binding.

#### Scenario: Hai tài khoản Novelpia
- **WHEN** người dùng đã lưu hai auth profile cho cùng một nguồn
- **THEN** wizard và trang Bản raw cho chọn rõ profile nào được dùng cho binding

### Requirement: Migration bảo toàn dữ liệu cũ

Migration SHALL chuyển mọi file work v1–v11 và library v1–v7 lên schema mới trong transaction, bảo toàn
metadata, chương, raw, bản dịch, phiên AI và kết nối hiện có. Ứng dụng cũ SHALL từ chối version mới bằng
cơ chế unsupported-version hiện hành thay vì mở sai.

#### Scenario: Migrate file v11
- **WHEN** Mira mở file work v11 có chương, raw, bản dịch và phiên chat
- **THEN** migration hoàn tất, toàn bộ dữ liệu cũ còn nguyên và các bảng nguồn mới rỗng

#### Scenario: Migration thất bại
- **WHEN** một bước migration nguồn thất bại
- **THEN** transaction rollback và file cũ vẫn mở được bằng version Mira trước đó
