## MODIFIED Requirements

### Requirement: Chọn mode

Màn SHALL có điều khiển chọn mode với hai lựa chọn "Toàn văn" và "Từng câu", cả hai chọn được. "Toàn văn" SHALL là mode mặc định mỗi lần mở màn. Chuyển mode SHALL theo đặc tả `sentence-mode` (yêu cầu "Chuyển mode không mất chữ"). Chế độ tập trung, nút "Lưu" và chặn rời SHALL hoạt động ở cả hai mode.

#### Scenario: Chọn Từng câu
- **WHEN** người dùng bấm "Từng câu"
- **THEN** màn hiện mode Từng câu và lựa chọn đó được báo là đang chọn cho trình đọc màn hình

#### Scenario: Mở lại màn
- **WHEN** người dùng rời màn chương rồi mở lại
- **THEN** màn mở ở mode Toàn văn
