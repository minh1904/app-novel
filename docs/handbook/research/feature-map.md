# Mapping thị trường → mục tiêu Mira

Cập nhật: 2026-09-29 · Trạng thái: **đề xuất ưu tiên dựa trên nghiên cứu**, không tự phê duyệt roadmap. [Scope](../product/scope.md) · [Quyết định](../product/decisions.md).

> **Cập nhật 2026-10-03 ([ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md)):** mode Từng câu, liên kết bền giữa câu gốc và câu dịch, và căn chỉnh offline bị gỡ khỏi hướng sản phẩm; đơn vị làm việc là chương, bên trong là đoạn. Các hàng MIR-02, MIR-03, MIR-07, MIR-08, MIR-09 và MIR-15 bên dưới được lập từ trước ngày đó và **đã được ghi trạng thái mới ngay trong hàng** (mã không đổi). MIR-01, 04, 05, 06, 10–14 không phụ thuộc Từng câu nên giữ nguyên. Bảng "so đúng loại trải nghiệm" và các nhận xét về CAT là quan sát thị trường, vẫn đúng.

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
| MIR-02 | Đọc mạch văn và soát chi tiết là hai nhịp khác nhau | Hai mode cùng nội dung | P0; ưu tiên spike sớm nhất. **Đã thay (ADR-005):** một editor Toàn văn; "soát chi tiết" thành duyệt đề xuất AI từng khối ngay trong pane, không còn mode thứ hai | Sửa hai chiều không mất/nhân đôi chữ. Nay: nhận/bỏ từng khối đề xuất không mất chữ, `Ctrl+Z` hoàn tác cả lượt |
| MIR-03 | CAT có quy trình review liên kết | Căn chỉnh offline có kiểm tra | P0 đã chốt hành vi; thuật toán mở. **Hủy (ADR-005):** không lưu liên kết giữa câu gốc và câu dịch nên không còn gì để căn chỉnh hay review | 1:n/n:1, bỏ/thêm câu; sửa tay, giữ bản dịch. Nay: không áp dụng |
| MIR-04 | CAT và công cụ truyện có tài nguyên thuật ngữ | Nhất quán tên/thuật ngữ tác phẩm | P0 thủ công; import bộ từ điển là đề xuất sau | Tạo/sửa/tìm, gợi ý đúng phạm vi tác phẩm |
| MIR-05 | Editor/batch đều cần thoát và tiếp tục | Tin cậy dữ liệu local | P0; cùng vertical slice | Autosave/crash recovery/restore giữ nội dung và trạng thái |
| MIR-06 | Định dạng và xuất dữ liệu ảnh hưởng công việc tiếp theo | Mang bản dịch đi được | P0 TXT/MD; EPUB/DOCX/PDF sau | Corpus import/export bảo toàn phạm vi đã đặc tả |
| MIR-07 | Xác nhận segment khác việc văn bản đã tồn tại | Trạng thái minh bạch | P0; tách tiến độ dịch và liên kết. **Cần thiết kế lại (ADR-005):** không còn trạng thái theo câu; còn phân biệt được vùng *AI viết chưa ai đụng tới* (dấu AI mức vùng) với chữ người viết, và "đã soát" ở mức đoạn/chương | Người dùng giải thích đúng “đã dịch” và “cần kiểm tra liên kết”. Nay: người dùng nhìn ra vùng nào còn là chữ AI chưa soát |
| MIR-08 | Dịch giả cần sửa lỗi raw | Sửa nguồn có chủ đích | P0 thao tác riêng, lịch sử. **Giữ ý, đổi cơ chế (ADR-005):** sửa nguồn vẫn là thao tác riêng có lịch sử (snapshot); không còn "liên kết bị đánh dấu", thay bằng cảnh báo đề xuất AI đã cũ (`baseRev`) | Vùng liên kết chịu ảnh hưởng bị đánh dấu, undo được. Nay: undo được, đề xuất cũ bị đánh dấu *cũ* thay vì đoán vị trí |
| MIR-09 | Đối thủ cung cấp AI/MT; cộng đồng Việt đã chuyển sang dịch AI | AI dịch từ raw có kiểm soát | **Luồng chính bản đầu** ([ADR-002](../decisions/0002-ai-first-translation.md)). **Cập nhật ADR-005:** AI chỉ *đề xuất* (bản dịch trống thì ghi thẳng kèm dấu AI); đơn vị gửi là đoạn, không phải segment ID bền | Job dịch tiếp tục sau lỗi; bản dịch gắn đúng segment; nguồn gốc ghi lại; không ghi đè bản đã sửa. Nay: gắn đúng đoạn (ID `[n]` chỉ sống trong một lần gọi); nguồn gốc ghi mức vùng; không ghi đè chữ đã có |
| MIR-13 | Truyện có nhiều bản raw/bản dịch trung gian | Nhiều nguồn, nguồn chính do người dùng chọn | Bản đầu, sau lát cắt một chương | Ghép chương giữa nguồn; đo chất lượng có/không nguồn phụ |
| MIR-14 | Xưng hô lệch là nỗi đau lớn nhất | Ma trận xưng hô theo tác phẩm | Bản đầu; màn xem trước, AI đề xuất cập nhật sau | QA bắt xưng hô lệch; người dùng duyệt đề xuất |
| MIR-15 | Muốn giữ văn phong bản dịch cũ | Ví dụ văn phong trong prompt | Bản đầu, M3. **Cần thiết kế lại (ADR-005):** cách lấy cặp câu ví dụ từng dựa vào căn chỉnh bản cũ với raw; liên kết bền bị bỏ nên chưa có thiết kế thay (mục mở trong ADR-005) | So chất lượng có/không ví dụ trên corpus |
| MIR-10 | Ebook tools đáp ứng nhập/xuất sách | Mở rộng khi có nhu cầu | Sau P0; không thêm converter ngay | Corpus định dạng và yêu cầu từ người dùng thật |
| MIR-11 | TMS có workflow nhóm | Cá nhân trước | Hoãn cloud/cộng tác/marketplace | Chỉ mở khi có nhu cầu lặp lại và mô hình chi phí |
| MIR-12 | Công cụ cộng đồng có đăng/tải chương | Biên tập độc lập nền tảng | Ngoài P0: crawler/uploader | Quyết định riêng nếu nhu cầu vượt import/export |

## Ưu tiên theo rủi ro

**Điều kiện nền:** MIR-02 + MIR-03 + MIR-05. Ba mục phụ thuộc lẫn nhau: editor hai mode sẽ không đáng dùng nếu liên kết hoặc dữ liệu hỏng. Làm một chương xuyên suốt trước khi nhân rộng quản lý thư viện. *(Cập nhật 2026-10-03, ADR-005: MIR-03 đã hủy và MIR-02 đã đổi dạng, nên điều kiện nền còn lại là MIR-05 — dữ liệu bền — cộng việc duyệt đề xuất AI trong editor không mất chữ.)*

**Hoàn thiện công việc:** MIR-01/04/06/07/08 sau khi mô hình nội dung vượt spike. Màn mẫu hiện có giúp thử bố cục, không thay thế nghiệm thu storage.

**Mở rộng có điều kiện:** MIR-09/10/11/12. Feature đối thủ có không phải lý do đủ để đưa vào roadmap. Dùng [cổng hoàn thành](../delivery/roadmap.md) và [bài kiểm chứng](../delivery/validation.md).

## Giả thuyết khác biệt và cách bác bỏ

| Giả thuyết | Tín hiệu ủng hộ | Tín hiệu bác bỏ / hành động |
| --- | --- | --- |
| Hai mode giảm công đối chiếu | Hoàn thành cùng bài nhanh hơn, ít lỗi, vẫn thích đọc toàn văn | Sửa liên kết tốn nhiều hơn: thu nhỏ auto alignment, cải thiện review trước. *(2026-10-03: chủ sản phẩm đã bỏ hai mode theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md) mà chưa chạy bài kiểm chứng này; giả thuyết thay thế là "duyệt đề xuất AI tại chỗ trong một editor đủ để soát", chưa có số đo.)* |
| Dữ liệu local là lý do đổi công cụ | Người dùng thực hiện offline và restore trong công việc thực | Chỉ quan tâm dịch máy ngay: điều chỉnh nhóm người dùng, không bỏ ràng buộc đã chốt âm thầm |
| Từ điển theo tác phẩm đủ cho P0 | Người dùng quản lý tên ở quy mô mẫu không thấy quá tải | Cần import lặp lại: đặc tả import glossary riêng, chưa tự đưa TM enterprise vào |
| Trải nghiệm truyện có thể mở rộng docs | Mô hình block/document không buộc schema theo câu truyện | Docs phá round-trip/code block: tách dự án nghiên cứu định dạng sau P0 |

Chưa có kết quả đo nào cho các giả thuyết trên. Không dùng bảng này làm tuyên bố quảng cáo.

---

[Mục lục handbook](../README.md)
