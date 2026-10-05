## Purpose

Quản lý các kết quả AI có thể thay văn bản dịch như đề xuất bền vững, cho người dịch xem diff và quyết định từng phần mà không mất chữ hoặc áp nhầm chương.

## ADDED Requirements

### Requirement: Kết quả AI luôn có hồ sơ đề xuất và chính sách áp dụng rõ

Mọi kết quả dịch chương hoặc chat Sửa có thể thay bản dịch SHALL được lưu thành đề xuất gắn với tác phẩm, chương và vùng đích. Mặc định đề xuất ở `pending` và SHALL NOT đổi văn bản đích, kể cả khi bên dịch đang rỗng. Nếu người dùng chọn mode Áp dụng thẳng trước khi gửi, hệ thống SHALL tạo hồ sơ đề xuất/snapshot rồi tự Accept bằng cùng điều kiện ghi như Accept thủ công; nếu điều kiện không đạt, kết quả SHALL ở lại `pending`/`conflict` để duyệt. Đề xuất SHALL giữ nguyên văn bản AI, base và revision lúc gửi, mode đã chọn, dấu nhận dạng nguồn và ngữ cảnh thực gửi.

#### Scenario: Dịch chương có pane đích trống
- **WHEN** AI trả bản dịch cho một chương chưa có bản dịch ở mode Duyệt trước
- **THEN** bản dịch của chương vẫn rỗng, đề xuất chờ duyệt có mặt sau khi đóng và mở lại tác phẩm

#### Scenario: Áp dụng thẳng khi base còn hợp lệ
- **WHEN** người dùng chọn Áp dụng thẳng cho một lượt chat Sửa hoặc dịch chương và văn bản nguồn/đích vẫn khớp base lúc gửi
- **THEN** hệ thống lưu đề xuất, checkpoint và quyết định tự Accept trong cùng đường ghi; bản dịch thay đúng phạm vi và lịch sử ghi rõ mode tự áp dụng

#### Scenario: Áp dụng thẳng gặp xung đột
- **WHEN** người dùng chọn Áp dụng thẳng nhưng chữ đích đã đổi sau lúc gửi hoặc neo không chắc chắn
- **THEN** hệ thống không ghi đè, giữ đề xuất để người dùng xem diff và quyết định

#### Scenario: Người dùng sửa trong khi AI đang trả lời
- **WHEN** người dùng đổi bản dịch sau lúc gửi yêu cầu và trước lúc AI trả kết quả
- **THEN** đề xuất giữ ảnh chụp trước thay đổi; AI không ghi đè chữ mới và việc duyệt sẽ kiểm tra xung đột

### Requirement: Người dịch xem và quyết định từng phần tại editor

Đề xuất SHALL hiển thị diff trong pane bản dịch trước khi ghi. Người dịch SHALL có thể Accept hoặc Deny từng phần thay đổi; quyết định của từng phần SHALL được lưu để mở lại sau khi panel hoặc app đóng. Đề xuất chỉ kết thúc khi mọi phần đã được quyết định; Deny SHALL giữ nguyên văn bản đích từng ký tự.

#### Scenario: Nhận một phần, bỏ một phần
- **WHEN** một đề xuất có hai phần độc lập và người dùng Accept phần đầu, Deny phần sau
- **THEN** chỉ phần đầu đổi văn bản đích và hai quyết định còn đúng sau khi khởi động lại

#### Scenario: Chưa quyết định hết
- **WHEN** người dùng Accept một phần rồi đóng panel
- **THEN** các phần còn chờ vẫn nằm trong hàng đề xuất của chương

### Requirement: Accept kiểm tra đúng vùng và không ghi đè xung đột

Trước mỗi Accept, hệ thống SHALL kiểm tác phẩm/chương, revision hiện tại, nội dung và neo của vùng đích so với base đề xuất. Khi revision đổi nhưng nội dung gốc dời vị trí, hệ thống SHALL chỉ gắn lại nếu tìm được một vị trí khớp duy nhất trong cùng chương; khi chữ bị sửa, xóa, tách/gộp hoặc có nhiều vị trí khớp, SHALL không ghi và SHALL báo `conflict`/`stale` để người dùng xem lại hoặc tạo đề xuất mới. Thay đổi bản gốc nguồn sau khi đề xuất sinh ra SHALL đánh dấu đề xuất cần xem lại.

#### Scenario: Văn bản dời vị trí duy nhất
- **WHEN** đoạn đích giữ nguyên chữ nhưng đã dời tới một vị trí duy nhất trong cùng chương
- **THEN** Accept áp dụng đúng đoạn đã dời và không đổi đoạn khác

#### Scenario: Hai đoạn giống nhau
- **WHEN** chữ neo xuất hiện ở hai nơi sau khi revision đổi
- **THEN** Accept không chọn một nơi theo vị trí đoán và văn bản không đổi

#### Scenario: Đoạn đã sửa tay
- **WHEN** chữ đích tại vùng đề xuất đã được người dùng sửa sau lúc AI nhận base
- **THEN** Accept báo xung đột, giữ chữ người dùng và giữ đề xuất để xem lại

### Requirement: Ghi quyết định và văn bản nguyên tử, có thể khôi phục

Một lần Accept SHALL ghi thay đổi văn bản, checkpoint trước thay đổi, trạng thái quyết định và dấu nguồn AI khi cơ chế dấu đó có mặt trong cùng một giao dịch bền vững. Lặp lại cùng yêu cầu Accept SHALL không chèn chữ lần nữa. Khi pane có sửa đổi chưa lưu, hệ thống SHALL yêu cầu người dùng xử lý bản nháp trước khi Accept và SHALL không tự lưu ngầm. Deny SHALL chỉ ghi quyết định.

#### Scenario: App dừng giữa lúc Accept
- **WHEN** tiến trình bị kết thúc giữa lúc ghi quyết định
- **THEN** lần mở sau thấy cả chữ mới và quyết định đã nhận, hoặc cả hai vẫn ở trạng thái cũ

#### Scenario: Gửi lại yêu cầu Accept
- **WHEN** cùng một quyết định Accept được gửi hai lần do retry IPC
- **THEN** chữ chỉ được thay một lần và trả lại trạng thái đã quyết định

#### Scenario: Pane có chữ chưa lưu
- **WHEN** người dùng bấm Accept trong lúc pane bản dịch có chỉnh sửa chưa lưu
- **THEN** app giữ bản nháp, yêu cầu lưu hoặc hủy thao tác duyệt, không áp vào bản trong kho đã cũ

### Requirement: Hoàn tác một lần Accept đã ghi

Người dùng SHALL có hành động hoàn tác lần Accept gần nhất của chương khi bản dịch còn đúng revision do lần Accept đó tạo. Hoàn tác SHALL phục hồi checkpoint trước lần Accept và trạng thái các phần liên quan trong một giao dịch; nếu văn bản đã đổi tiếp, SHALL báo xung đột và không ghi đè chỉnh sửa mới.

#### Scenario: Hoàn tác ngay sau Accept
- **WHEN** người dùng Accept một phần rồi chọn Hoàn tác trước khi sửa chữ tiếp
- **THEN** văn bản và trạng thái phần đề xuất trở về trước lần Accept

#### Scenario: Văn bản đã sửa sau Accept
- **WHEN** người dùng sửa bản dịch sau khi Accept rồi chọn Hoàn tác lần Accept đó
- **THEN** app báo xung đột, giữ nguyên phần sửa mới và checkpoint còn để đối chiếu

### Requirement: Accept all chỉ tác động chương đang mở

Hành động Accept all của Module 5 SHALL hiển thị trước tên chương và số phần `pending`; SHALL chỉ xét các phần của chương đang mở, áp dụng mọi phần hợp lệ không chồng lấn, bỏ qua phần xung đột và trả số đã nhận, bị bỏ qua, cần xem lại. Các phần hợp lệ từ cùng một base SHALL được xét cùng nhau để lần nhận đầu không tạo xung đột giả cho phần kế tiếp. Hành động này SHALL NOT duyệt các chương khác hoặc toàn bộ tác phẩm.

#### Scenario: Nhiều chương có đề xuất
- **WHEN** chương 3 và 4 đều có phần chờ mà người dùng bấm Accept all ở chương 3
- **THEN** chỉ phần hợp lệ của chương 3 được nhận; chương 4 giữ nguyên

#### Scenario: Một phần hợp lệ và một phần xung đột
- **WHEN** trong chương đang mở có một phần hợp lệ và một phần đã bị sửa tay
- **THEN** phần hợp lệ được nhận, phần xung đột không ghi, kết quả nêu rõ hai số lượng

#### Scenario: Hai phần cùng base
- **WHEN** hai phần không chồng lấn của cùng một đề xuất được Accept all trên base còn hợp lệ
- **THEN** cả hai được áp trong một lượt duyệt, không tự xung đột do revision tăng giữa chúng

### Requirement: Hàng chờ định tuyến đúng chương và giữ nguồn gốc

Người dùng SHALL xem được số phần chờ theo chương, lọc đề xuất theo phiên hoặc chương và mở một đề xuất để tới đúng chương/vùng trong editor. Mỗi đề xuất SHALL hiển thị nguồn sinh (chat hoặc dịch chương), thời điểm, model và trạng thái; việc chuyển chương SHALL NOT làm đổi đích của đề xuất cũ.

#### Scenario: Đang xem chương khác
- **WHEN** kết quả AI cho chương 3 đến trong lúc người dùng mở chương 12
- **THEN** hàng chờ chương 3 tăng và editor chương 12 không đổi

#### Scenario: Mở đề xuất cũ
- **WHEN** người dùng chọn đề xuất của chương 3 từ lịch sử phiên
- **THEN** app mở chương 3 và diff tương ứng, hoặc báo chương đã bị xóa mà không áp nhầm sang chương khác

### Requirement: Lưu trữ và sao lưu đề xuất an toàn

Đề xuất, từng quyết định, checkpoint và liên kết phiên SHALL nằm trong tệp `.mira` của tác phẩm và theo backup/restore. Migration từ tệp cũ SHALL giữ nguyên nội dung chương, segment/link/provenance cũ và revision hiện có; Module 5 SHALL NOT xóa các bảng cũ. Thao tác ghi thất bại SHALL trả lỗi và không báo đề xuất đã lưu hay đã duyệt.

#### Scenario: Nâng cấp tác phẩm cũ
- **WHEN** mở tệp `.mira` từ schema trước Module 5
- **THEN** dữ liệu cũ giữ nguyên và hệ thống có thể tạo đề xuất mới

#### Scenario: Backup và restore
- **WHEN** sao lưu rồi khôi phục tác phẩm có đề xuất chờ và quyết định một phần
- **THEN** nội dung, trạng thái và liên kết phiên được phục hồi đúng
