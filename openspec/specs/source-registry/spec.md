# source-registry Specification

## Purpose
Quy định catalog Nguồn nội dung của Mira, metadata adapter và cách người dùng tìm, lọc, đánh giá khả năng cũng như tình trạng của từng nguồn.

## Requirements

### Requirement: Registry chỉ công bố adapter do Mira phát hành

Registry SHALL chỉ nạp adapter builtin hoặc package chính thức có định danh và phiên bản do Mira kiểm
soát. Bản đầu SHALL không cài hoặc thực thi adapter cộng đồng, package không ký hay JavaScript tùy ý.

#### Scenario: Package không thuộc Mira
- **WHEN** một package adapter bên thứ ba được đưa vào thư mục dữ liệu
- **THEN** registry không nạp package và giao diện không trình bày nó như một nguồn khả dụng

### Requirement: Metadata nguồn tách quốc gia khỏi ngôn ngữ

Mỗi nguồn SHALL có `sourceId` bất biến, tên hiển thị, tên miền, `countryCode`, danh sách `languageTags`,
phiên bản adapter và capability. `countryCode` SHALL mô tả thị trường của nền tảng; `languageTags` SHALL
mô tả ngôn ngữ nội dung và không được suy ra từ quốc gia.

#### Scenario: Nguồn ở Trung Quốc hỗ trợ nhiều ngôn ngữ
- **WHEN** manifest có `countryCode = CN` và `languageTags = [zh-Hans, en]`
- **THEN** nguồn xuất hiện dưới bộ lọc Trung Quốc và dưới cả hai bộ lọc ngôn ngữ tương ứng

### Requirement: Người dùng tìm và lọc Nguồn nội dung

Màn Nguồn nội dung SHALL tìm theo tên, tên bản địa, alias và domain; SHALL có lựa chọn quốc gia
**Tất cả**, **Trung Quốc**, **Nhật Bản**, **Hàn Quốc**, **Khác**; và SHALL lọc độc lập theo ngôn ngữ,
capability, kiểu truy cập và health. Dán URL SHALL thử nhận diện adapter mà không buộc chọn quốc gia trước.

#### Scenario: Lọc nguồn Hàn Quốc
- **WHEN** người dùng chọn quốc gia Hàn Quốc và ngôn ngữ tiếng Hàn
- **THEN** kết quả chỉ gồm nguồn có `countryCode = KR` và hỗ trợ `ko`

#### Scenario: URL chưa được hỗ trợ
- **WHEN** người dùng dán URL không adapter nào nhận diện
- **THEN** Mira báo chưa có adapter và đề nghị nhập tệp hoặc thư mục, không báo URL sai

### Requirement: Capability, access và health được trình bày riêng

Thẻ nguồn SHALL phân biệt capability kỹ thuật, yêu cầu truy cập và health adapter. Adapter chỉ đọc
catalog SHALL không được mô tả như có khả năng lấy nội dung. Health SHALL có ít nhất `healthy`,
`degraded`, `broken`, `inconclusive`, `unchecked` và thời điểm kiểm gần nhất.

#### Scenario: Phiên đăng nhập hết hạn
- **WHEN** adapter vẫn khỏe nhưng auth profile cần đăng nhập lại
- **THEN** health adapter vẫn giữ nguyên và trạng thái tài khoản hiện riêng là cần đăng nhập

#### Scenario: Kiểm tra không kết luận được
- **WHEN** health check thất bại do máy đang offline hoặc nguồn rate limit
- **THEN** nguồn có health `inconclusive`, không bị đổi thành `broken`

### Requirement: Catalog nguồn có empty state chính xác

Màn Nguồn nội dung SHALL phân biệt chưa có adapter, không có kết quả tìm kiếm, không có kết quả do bộ lọc
và adapter đang hỏng. Các chip lọc đang áp dụng SHALL nhìn thấy được và có thao tác xóa tất cả.

#### Scenario: Bộ lọc loại hết kết quả
- **WHEN** từ khóa có kết quả nhưng tổ hợp bộ lọc hiện tại loại hết chúng
- **THEN** Mira nói không có nguồn phù hợp với bộ lọc và cung cấp thao tác xóa bộ lọc
