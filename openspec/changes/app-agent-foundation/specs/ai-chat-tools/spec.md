## MODIFIED Requirements

### Requirement: Tool chỉ đọc và buộc vào tác phẩm đang mở

Các tool cũ của panel chat SHALL được thay bằng capability có target đã resolve. Capability đọc SHALL NOT tạo, sửa hoặc xóa dữ liệu. Capability ghi SHALL chỉ gọi service domain có contract, kiểm tra revision, giới hạn và idempotency; SHALL NOT phơi SQL, filesystem, shell hay IPC tổng quát. Context đang mở SHALL là mặc định để resolve, không phải ranh giới bắt buộc. Khi target thuộc tác phẩm khác, activity và operation SHALL ghi rõ tác phẩm đó.

#### Scenario: Không có tham số chọn tác phẩm
- **WHEN** context là tác phẩm A và target đã resolve là chương 2 của tác phẩm B
- **THEN** capability đọc chỉ trả dữ liệu B chương 2 và activity ghi rõ target B

#### Scenario: Gọi tool không làm đổi dữ liệu
- **WHEN** model gọi lần lượt mọi capability đọc đã đăng ký
- **THEN** revision văn bản, liên kết, glossary và mọi bản ghi domain giữ nguyên

#### Scenario: Gọi primitive không được cấp
- **WHEN** model yêu cầu chạy SQL, shell hoặc IPC tùy ý
- **THEN** hệ thống từ chối và không biến yêu cầu đó thành capability đặc quyền

### Requirement: Tìm trong tác phẩm

`search_work` SHALL nhận target tác phẩm đã resolve, chuỗi cần tìm và phía (bản gốc hoặc bản dịch), tìm trên mọi chương của target theo nội dung đã lưu, và trả: target, tổng số chỗ khớp, số chương có chỗ khớp, và tối đa một số kết quả cố định. Mỗi kết quả SHALL có số chương, tên chương, số đoạn ở phía được tìm và đoạn trích quanh chỗ khớp. Chuỗi gồm chữ CJK SHALL khớp được mà không cần dấu cách quanh nó.

#### Scenario: Tìm tên riêng tiếng Nhật
- **WHEN** context là A và model tìm `魔王` mà không nêu tác phẩm khác
- **THEN** target mặc định là A, kết quả ghi rõ A, tổng số chỗ khớp và các chương chứa `魔王`

#### Scenario: Tìm trong tác phẩm khác
- **WHEN** người dùng yêu cầu tìm `魔王` trong B và B được resolve duy nhất
- **THEN** tool chỉ tìm B dù giao diện đang mở A

#### Scenario: Quá nhiều chỗ khớp
- **WHEN** số chỗ khớp lớn hơn số kết quả tối đa
- **THEN** tool trả đúng số kết quả tối đa và nói rõ đã bỏ bao nhiêu chỗ khớp, kèm gợi ý thu hẹp chuỗi tìm

#### Scenario: Không có chỗ khớp
- **WHEN** chuỗi tìm không xuất hiện ở phía được chọn
- **THEN** tool báo không có chỗ khớp và số chương đã tìm, không trả lỗi

#### Scenario: Chuỗi tìm không hợp lệ
- **WHEN** chuỗi tìm rỗng, chỉ có khoảng trắng hoặc dài quá giới hạn
- **THEN** tool trả lỗi nêu giới hạn, không quét tác phẩm

### Requirement: Giới hạn mỗi lượt chat

Mỗi lượt agent SHALL có trần số vòng model, trần tổng dữ liệu tool trả cho model, trần số operation ghi và trần riêng của từng capability. Khi chạm trần đọc, lần gọi đọc tiếp theo SHALL trả thông báo hết ngân sách thay vì dữ liệu. Khi chạm trần ghi, capability SHALL không tạo operation mới. Vòng cuối SHALL không mời capability để model buộc phải kết thúc bằng câu trả lời hoặc tóm tắt trạng thái operation đã có.

#### Scenario: Hết ngân sách đọc
- **WHEN** model đã nhận đủ trần dữ liệu đọc và gọi `read_chapter` lần nữa
- **THEN** capability trả thông báo hết ngân sách, không trả văn bản, và lượt vẫn kết thúc có kiểm soát

#### Scenario: Hết vòng gọi tool
- **WHEN** model vẫn muốn gọi capability ở vòng cuối được phép
- **THEN** request cuối không kèm capability và model trả câu trả lời hoặc tóm tắt operation

#### Scenario: Đủ operation ghi
- **WHEN** lượt đã tạo đủ số operation ghi tối đa
- **THEN** yêu cầu ghi tiếp bị từ chối, không thay đổi dữ liệu và activity ghi lý do giới hạn

### Requirement: Mỗi lần gọi tool hiện trên panel

Mỗi lần gọi capability SHALL tạo hoặc cập nhật một bước trong activity timeline. Bước SHALL nói hành động, target, trạng thái và tiến độ khi có, nhưng SHALL không chép nội dung dài đã đọc hoặc đã ghi. Nhiều cập nhật tiến độ của cùng một operation SHALL cập nhật cùng bước thay vì tạo một dòng mới cho từng delta. Lỗi SHALL có lý do và không làm mất lịch sử bước đã hoàn tất.

#### Scenario: Đọc nhiều trang
- **WHEN** model đọc ba trang của cùng một chương
- **THEN** timeline có thể hiện ba bước đọc hoặc một bước có ba lần chi tiết, mỗi phần ghi target và khoảng đoạn mà không chép nội dung chương

#### Scenario: Dịch bảy lô
- **WHEN** capability dịch chương cập nhật từ lô 1 đến lô 7
- **THEN** timeline cập nhật một bước “Đang dịch” từ 1/7 đến 7/7 thay vì thêm bảy câu trả lời dài

#### Scenario: Tìm kiếm
- **WHEN** model tìm `魔王` trong một target đã resolve
- **THEN** timeline có bước tìm kiếm ghi target, chuỗi tìm, tổng chỗ khớp và số kết quả đã trả

#### Scenario: Capability lỗi
- **WHEN** capability không thể mở target
- **THEN** bước chuyển sang lỗi, ghi target cùng lý do và không báo operation đã áp dụng

## ADDED Requirements

### Requirement: Capability ghi có target và command id

Mọi capability ghi SHALL nhận target đã resolve từ hệ thống và một command id duy nhất của operation. Capability SHALL không tin một `workId` hoặc `chapterId` tùy ý nằm trong văn bản model nếu target đó chưa qua resolver. Chạy lại cùng command id SHALL không áp dụng thay đổi lần hai.

#### Scenario: Retry cùng command
- **WHEN** cùng một capability ghi được gọi lại với cùng command id sau khi response bị mất
- **THEN** hệ thống trả trạng thái operation đã có và không ghi dữ liệu lần hai

#### Scenario: Model chèn ID khác
- **WHEN** arguments do model tạo chứa ID khác target đã resolve
- **THEN** capability từ chối hoặc bỏ ID đó, và không ghi vào resource khác
