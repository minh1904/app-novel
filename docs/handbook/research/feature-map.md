# Mapping thị trường → mục tiêu Mira

Cập nhật: 2026-09-29 · Trạng thái: **đề xuất ưu tiên dựa trên nghiên cứu**, không tự phê duyệt roadmap. [Scope](../product/scope.md) · [Quyết định](../product/decisions.md).

## So sánh đúng loại trải nghiệm

| Nhóm đối chiếu | Đơn vị công việc nổi bật trong tài liệu | Bằng chứng cần có để so với Mira |
| --- | --- | --- |
| OpenNovel | Chương và glossary truyện | Thử sửa chương, thay thuật ngữ, kiểm tra bản dịch cũ |
| Smartcat / memoQ / Phrase / Crowdin / MateCat / OmegaT | Segment, document, tài nguyên dịch | Sửa cả đoạn rồi quay lại đối chiếu; phân biệt preview và editor |
| Immersive / Bookfere / Bilingual Book Maker | Ebook hoặc tác vụ dịch | Khả năng sửa, giữ cấu trúc và tiếp tục sau lỗi |
| NovelKit / họ QuickTranslator | Văn bản Trung–Việt, từ điển và công cụ chương | Corpus Việt, tên riêng, giới hạn source/target mapping |

Nguồn và giới hạn từng công cụ ở [khảo sát thị trường](market-landscape.md). Bảng này gom góc nhìn công việc, không xếp hạng độ tốt của sản phẩm.

## Ma trận quyết định

Mã `MIR-*` là nhãn truy vết handbook, chưa phải issue đã triển khai. P0/P1 dưới đây bám scope hiện hành; các mục mới luôn ghi là đề xuất.

| ID | Nhu cầu / tín hiệu thị trường | Mục tiêu Mira | Hướng xử lý | Bằng chứng hoàn thành |
| --- | --- | --- | --- | --- |
| MIR-01 | Có thể bắt đầu từ chương, không phải cả ebook | Thư viện → tác phẩm → chương | P0; nối UI mẫu với storage | Tạo tác phẩm/chương thật, đóng/mở vẫn còn |
| MIR-02 | Đọc mạch văn và soát chi tiết là hai nhịp khác nhau | Hai mode cùng nội dung | P0; ưu tiên spike sớm nhất | Sửa hai chiều không mất/nhân đôi chữ |
| MIR-03 | CAT có quy trình review liên kết | Căn chỉnh offline có kiểm tra | P0 đã chốt hành vi; thuật toán mở | 1:n/n:1, bỏ/thêm câu; sửa tay, giữ bản dịch |
| MIR-04 | CAT và công cụ truyện có tài nguyên thuật ngữ | Nhất quán tên/thuật ngữ tác phẩm | P0 thủ công; import bộ từ điển là đề xuất sau | Tạo/sửa/tìm, gợi ý đúng phạm vi tác phẩm |
| MIR-05 | Editor/batch đều cần thoát và tiếp tục | Tin cậy dữ liệu local | P0; cùng vertical slice | Autosave/crash recovery/restore giữ nội dung và trạng thái |
| MIR-06 | Định dạng và xuất dữ liệu ảnh hưởng công việc tiếp theo | Mang bản dịch đi được | P0 TXT/MD; EPUB/DOCX/PDF sau | Corpus import/export bảo toàn phạm vi đã đặc tả |
| MIR-07 | Xác nhận segment khác việc văn bản đã tồn tại | Trạng thái minh bạch | P0; tách tiến độ dịch và liên kết | Người dùng giải thích đúng “đã dịch” và “cần kiểm tra liên kết” |
| MIR-08 | Dịch giả cần sửa lỗi raw | Sửa nguồn có chủ đích | P0 thao tác riêng, lịch sử | Vùng liên kết chịu ảnh hưởng bị đánh dấu, undo được |
| MIR-09 | Đối thủ cung cấp AI/MT | Hỗ trợ dịch có kiểm soát | P1, không phụ thuộc cho P0 | Đề xuất có diff, phạm vi dữ liệu rõ; provider còn mở |
| MIR-10 | Ebook tools đáp ứng nhập/xuất sách | Mở rộng khi có nhu cầu | Sau P0; không thêm converter ngay | Corpus định dạng và yêu cầu từ người dùng thật |
| MIR-11 | TMS có workflow nhóm | Cá nhân trước | Hoãn cloud/cộng tác/marketplace | Chỉ mở khi có nhu cầu lặp lại và mô hình chi phí |
| MIR-12 | Công cụ cộng đồng có đăng/tải chương | Biên tập độc lập nền tảng | Ngoài P0: crawler/uploader | Quyết định riêng nếu nhu cầu vượt import/export |

## Ưu tiên theo rủi ro

**Điều kiện nền:** MIR-02 + MIR-03 + MIR-05. Ba mục phụ thuộc lẫn nhau: editor hai mode sẽ không đáng dùng nếu liên kết hoặc dữ liệu hỏng. Làm một chương xuyên suốt trước khi nhân rộng quản lý thư viện.

**Hoàn thiện công việc:** MIR-01/04/06/07/08 sau khi mô hình nội dung vượt spike. Màn mẫu hiện có giúp thử bố cục, không thay thế nghiệm thu storage.

**Mở rộng có điều kiện:** MIR-09/10/11/12. Feature đối thủ có không phải lý do đủ để đưa vào roadmap. Dùng [cổng hoàn thành](../delivery/roadmap.md) và [bài kiểm chứng](../delivery/validation.md).

## Giả thuyết khác biệt và cách bác bỏ

| Giả thuyết | Tín hiệu ủng hộ | Tín hiệu bác bỏ / hành động |
| --- | --- | --- |
| Hai mode giảm công đối chiếu | Hoàn thành cùng bài nhanh hơn, ít lỗi, vẫn thích đọc toàn văn | Sửa liên kết tốn nhiều hơn: thu nhỏ auto alignment, cải thiện review trước |
| Dữ liệu local là lý do đổi công cụ | Người dùng thực hiện offline và restore trong công việc thực | Chỉ quan tâm dịch máy ngay: điều chỉnh nhóm người dùng, không bỏ ràng buộc đã chốt âm thầm |
| Từ điển theo tác phẩm đủ cho P0 | Người dùng quản lý tên ở quy mô mẫu không thấy quá tải | Cần import lặp lại: đặc tả import glossary riêng, chưa tự đưa TM enterprise vào |
| Trải nghiệm truyện có thể mở rộng docs | Mô hình block/document không buộc schema theo câu truyện | Docs phá round-trip/code block: tách dự án nghiên cứu định dạng sau P0 |

Chưa có kết quả đo nào cho các giả thuyết trên. Không dùng bảng này làm tuyên bố quảng cáo.

---

[Mục lục handbook](../README.md)
