# Nghiên cứu: web app dịch theo từng câu/segment

Được đưa vào handbook ngày 2026-09-29. Đây là ghi chú nghiên cứu kế thừa; khảo sát mở rộng và giới hạn bằng chứng hiện tại nằm ở [bối cảnh thị trường](market-landscape.md). Ngày bên dưới là ngày nghiên cứu ban đầu, không phải xác nhận mọi chi tiết đã được kiểm chứng lại.

Cập nhật: 2026-09-23. Phạm vi: tài liệu chính thức của Crowdin, Smartcat, Matecat và Phrase TMS. Đây là quan sát và suy luận thiết kế, chưa phải quyết định sản phẩm. “Segment/string” của các app có thể là câu, phần câu hoặc khối khác tùy dữ liệu và quy tắc tách.

## Luồng được tài liệu hóa

| App | Người dùng thao tác từng câu như thế nào | Gộp/tách và xem toàn văn |
| --- | --- | --- |
| [Crowdin](https://support.crowdin.com/online-editor/) | Chọn một string trong danh sách, nhập bản dịch cạnh bản gốc, lưu hoặc tự lưu khi chuyển string, rồi sang string kế tiếp. Có Comfortable mode tập trung một string. | Có WYSIWYG preview cho TXT/Markdown/DOCX và nhiều định dạng; Full Screen/Dual Preview hiển thị toàn file. Bấm vào phần được highlight trong preview để mở popover sửa string; Dual Preview tô sáng string tương ứng ở hai bên. Đây là toàn văn có điểm sửa gắn với string, không phải ô Markdown tự do cho cả file. |
| [Smartcat](https://help.smartcat.com/editor-functionalities-overview/) | Tự chia nguồn thành segment cấp câu khi nhập. Hai bên nguồn/đích chia segment; sửa và xác nhận từng segment, có nhảy tới segment chưa xác nhận. | [Gộp các segment liền kề hoặc tách tại vị trí con trỏ](https://help.smartcat.com/joining-and-splitting-segments/). Tài liệu nói review vẫn ở cấp segment; không có review theo đoạn văn bản địa. |
| [Matecat](https://guides.matecat.com/translationeditor) | Phân biệt translation unit (ví dụ đoạn văn) với segment nhỏ hơn bên trong. [Bấm ô đích để sửa, xác nhận và chuyển tới segment tiếp theo](https://guides.matecat.com/translate-1). | [Tách segment ở điểm chọn rồi xác nhận](https://guides.matecat.com/splitting-and-merging-segments). Chỉ gộp lại các phần đã tách trước đó; không gộp hai segment độc lập theo tài liệu hiện tại. |
| [Phrase TMS](https://support.phrase.com/hc/en-us/articles/5709678012828-Segments-TMS) | Chia nguồn theo quy tắc ngôn ngữ; bấm segment, sửa, xác nhận. Sửa một segment đã xác nhận sẽ bỏ trạng thái xác nhận. | Cho gộp/tách nếu có quyền sửa nguồn. Điểm gộp có tag `{j}` để giữ khoảng trắng/định dạng; gộp/tách trong editor là thao tác “ảo” đối với việc chia job. Có [in-context preview](https://support.phrase.com/hc/en-us/articles/5709664002076-In-Context-Preview-TMS) tô sáng vị trí của segment trong tài liệu. |

## Kết luận phục vụ thiết kế Mira

1. Các web CAT app thường lấy segment/string làm đơn vị nhập, trạng thái, QA và bộ nhớ dịch. Bản xem toàn văn thường được dựng từ các đơn vị này.
2. Crowdin là tham chiếu UI gần nhất với mục tiêu đọc hai văn bản dài: toàn file song song, bấm vùng được tô sáng để sửa phần tương ứng. Tuy nhiên, đây vẫn là thao tác có phạm vi string; không chứng minh có thể sửa tự do cả Markdown rồi đồng bộ hoàn hảo về từng câu.
3. Matecat cho thấy nên tách **đơn vị tài liệu** (đoạn/khối) khỏi **đơn vị thao tác** (câu/segment). Điều này phù hợp với truyện vì bản dịch có thể gộp/tách câu.
4. Gộp/tách không hề “miễn phí”: Smartcat/Phrase có thao tác riêng; Phrase còn giữ tag định dạng. Một editor toàn văn tự do cần cơ chế đối chiếu và xử lý trường hợp không chắc, vượt quá luồng CAT thông thường.
5. Hướng prototype: giữ hai cột văn bản liền mạch như mockup; khi chọn một câu/vùng, tô sáng nhẹ và mở ô sửa hoặc thanh công cụ ngữ cảnh. Dữ liệu liên kết nằm bên trong, không hiện số hay đường nối và không ép chiều cao hai bên. Thử riêng luồng gõ Markdown toàn chương và quay lại mode từng câu.

## Câu hỏi cần thử bằng prototype

- Ranh giới câu lấy theo dấu câu nguồn, đoạn văn, hay do người dịch chỉnh? Câu dịch 1–nhiều hoặc nhiều–1 hiện ra thế nào?
- Khi click một câu ở cột gốc, nên cuộn cột dịch tới vùng tương ứng, chỉ tô sáng, hay mở popover? Cách nào ít làm mất mạch đọc nhất?
- Sửa trực tiếp trong toàn văn có thể giữ ID/range khi gộp, tách và di chuyển đoạn tới mức nào? Khi nào bật “Kiểm tra liên kết”?
- Trạng thái đã duyệt và lịch sử được cập nhật thế nào sau khi người dùng hoặc AI viết lại nhiều câu cùng lúc?

---

[Mục lục handbook](../README.md)
