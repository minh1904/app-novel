# Backlog tính năng chưa triển khai

Cập nhật: 2026-10-01 · Trạng thái: **đang dùng** · Chủ trì: chủ sản phẩm · Trả lời câu hỏi: *còn tính năng nào chưa làm, cái nào đã có hình trên giao diện, và điều kiện để làm thật?*

Trang này là nơi duy nhất liệt kê các tính năng đã được cân nhắc nhưng chưa có hành vi thật. Thứ tự ưu tiên và mốc nằm ở [roadmap](roadmap.md); ranh giới sản phẩm ở [scope](../product/scope.md). Nguồn so sánh sản phẩm khác: [nghiên cứu màn chi tiết](../research/work-detail-screen.md).

## Quy ước

| Trạng thái | Ý nghĩa |
| --- | --- |
| **Chỉ minh họa** | Có hành động trên giao diện với nhãn “Sắp có” và dữ liệu mẫu cố định; không đọc tệp, không gọi IPC, không ghi dữ liệu. Mỗi mục `id` ở đây khớp một mục trong `mockFeatures` của code. |
| **Backlog** | Chưa có gì trên giao diện. |
| **Không làm (hiện tại)** | Đã cân nhắc và loại, kèm lý do; có thể mở lại. |
| **Đã triển khai** | Chuyển mục sang đây khi code và kiểm tra đã có; dẫn change/commit và gỡ nhãn “Sắp có”. |

Quy tắc: nút hay mục menu “Sắp có” trên giao diện phải có mục ở đây; mục minh họa không tạo tab, khu vực hay màn giữ chỗ (xem requirement “Tính năng chưa triển khai chỉ hiện dưới dạng minh họa” của change `work-detail-screen`).

## Màn chi tiết tác phẩm

| `id` | Tính năng | Trạng thái | Trên giao diện hiện nay | Điều kiện để làm thật / câu hỏi còn mở |
| --- | --- | --- | --- | --- |
| `import-txt` | Nhập nhiều chương từ tệp `.txt` | **Chỉ minh họa** | Nút “Nhập từ .txt” cạnh “Thêm chương” và trong trạng thái trống; hộp thoại minh họa các bước chọn tệp → quy tắc tách chương → xem trước → nhập (vô hiệu). | Quy tắc tách chương (đề xuất kiểu Hako: dòng bắt đầu bằng `***` là tên chương; cần xác nhận định dạng thật), mã hóa tệp, giới hạn kích thước, chương trùng/đã có, xem trước và hoàn tác. Nên tách thành change riêng ngay sau `work-detail-screen`; nguồn raw ở cấp tác phẩm thuộc khu vực Nguồn. |
| `chapter-content-presence` | Cột “có raw / có bản dịch” trên hàng chương | Backlog | Chưa có cột; **dữ liệu đã có** (`hasSource`, `hasTarget` trong danh sách chương, dùng cho cảnh báo ở hộp xóa chương). | Chỉ còn phần giao diện. Là sự kiện (có hay không), không phải trạng thái quy trình, nên không vi phạm loại trừ trạng thái theo chương. |
| `library-backup` | Sao lưu cả thư viện một lần | Backlog | Chưa có (chỉ sao lưu từng tác phẩm). | Cần quyết định định dạng (nhiều tệp hay một gói) và hành vi khôi phục hàng loạt. |
| `auto-backup` | Sao lưu định kỳ / trước thao tác nguy hiểm | Backlog | Chưa có; hộp xóa chương chỉ gợi ý sao lưu thủ công. | Cần nơi lưu mặc định, số bản giữ lại và thông báo khi thất bại. |
| `restore-rename` | Phân biệt bản khôi phục trùng tên | Backlog | Khôi phục bản sao của tác phẩm còn trong thư viện cho hai mục cùng tên và cùng mốc thời gian. | Cân nhắc gắn "(bản khôi phục)" hoặc cho đổi tên ngay trong thông báo; cần chủ sản phẩm chọn. |
| `context-area` | Khu vực **Ngữ cảnh** (Thuật ngữ · Xưng hô · Văn phong) | **Chỉ minh họa** | Tab “Ngữ cảnh · Sắp có” trên màn chi tiết, mở ra bảng mô tả ba mục; không có dữ liệu hay thao tác. | Thuộc change `work-area-navigation`; thay phần minh họa bằng màn thật từng mục khi có (xưng hô là nỗi đau P0 trong [câu hỏi mở](../product/open-questions.md)). |
| `sources-area` | Khu vực **Nguồn** (nhiều bản raw, nguồn chính, nhập raw) | **Chỉ minh họa** | Tab “Nguồn · Sắp có” với bảng mô tả; không nhập được gì. | Cần mô hình nhiều nguồn raw và ghép chương giữa các nguồn (câu hỏi P0 trong [câu hỏi mở](../product/open-questions.md)). |
| `jobs-area` | Khu vực **Tác vụ** (lượt AI dịch, lỗi, lịch sử) | **Chỉ minh họa** | Tab “Tác vụ · Sắp có” với bảng mô tả; không có job. | Cần provider và hàng đợi dịch (change `content-backup-provider` và sau đó). |
| `chapter-progress` | Tóm tắt tiến độ “N chương, M đã dịch” | Backlog | Chưa có. | Chỉ suy ra từ việc có nội dung bản dịch, không từ trạng thái lưu riêng; cần nội dung chương và đếm đoạn/từ. |
| `chapter-groups` | Nhóm chương theo Tập | Backlog | Chưa có (danh sách phẳng, đã chốt 2026-10-01). | Khi có nhu cầu thật; chương đã có ID riêng nên thêm nhóm không phải làm lại. Hako, Kakuyomu có. |
| `chapter-source-label` | Số chương gốc / nhãn nguồn (101, “Ngoại truyện”) | Backlog | Chưa có (ghi vào tên chương, đã chốt 2026-10-01). | Thêm trường riêng bằng migration nếu việc ghi vào tên gây bất tiện thật. |
| `chapter-trash` | Thùng rác / hoàn tác xóa chương | Backlog | Chưa có (xóa kèm xác nhận, không hoàn tác). | Bắt buộc cân nhắc khi chương có nội dung; Webnovel có Thùng rác, Wattpad xóa vĩnh viễn. |
| `last-opened-at` | Tách “lần mở gần nhất” khỏi `updated_at` | Backlog | Chưa có. | Nếu việc mở xem một chương đẩy tác phẩm lên đầu “Gần đây” gây phiền; cần migration. |
| `chapter-status-label` | Trạng thái / nhãn tự đặt theo chương (kiểu Scrivener) | Không làm (hiện tại) | Chưa có. | Ngoài phạm vi M0; nếu làm thì là văn bản người dùng tự đặt, không phải danh sách cố định. |
| `chapter-drag-drop` | Kéo thả sắp xếp chương | Không làm (hiện tại) | Chưa có; dùng menu và “Chuyển tới vị trí…”. | Khó dùng với hàng nghìn chương và không truy cập được bằng bàn phím. |
| `work-delete` | Xóa tác phẩm | Backlog | Chưa có. | Cần xác nhận mạnh và quy ước sao lưu trước khi xóa. |

## Cách dùng khi triển khai

1. Làm thật một mục: đổi trạng thái thành **Đã triển khai**, dẫn change/commit, gỡ nhãn “Sắp có” và mục `mockFeatures` tương ứng.
2. Thêm minh họa mới: thêm hàng ở đây trước (hoặc cùng commit), rồi mới thêm mục `mockFeatures`.
3. Mục ra khỏi backlog vì không còn muốn làm: chuyển sang **Không làm (hiện tại)** kèm lý do, không xóa lịch sử.
