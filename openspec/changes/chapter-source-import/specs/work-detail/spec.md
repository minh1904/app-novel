## MODIFIED Requirements

### Requirement: Mở một chương

Người dùng SHALL mở một chương bằng cách bấm tên chương hoặc nhấn Enter khi hàng đang được chọn. Việc mở SHALL ghi chương đó là chương gần nhất (theo yêu cầu Tiếp tục chương gần nhất) trước khi chuyển màn. Chương mở ra SHALL hiển thị màn chương (đặc tả `chapter-screen`), kèm đường quay về màn chi tiết của cùng tác phẩm. Việc mở chương thất bại SHALL báo lỗi và ở lại màn chi tiết.

#### Scenario: Mở chương từ danh sách
- **WHEN** người dùng bấm tên chương 7
- **THEN** màn chương 7 hiện ra, và quay về sẽ tới màn chi tiết của cùng tác phẩm với "Tiếp tục" trỏ vào chương 7

#### Scenario: Chương lỗi khi mở
- **WHEN** việc ghi chương gần nhất thất bại lúc mở chương
- **THEN** màn chi tiết báo lỗi và người dùng vẫn ở màn chi tiết
