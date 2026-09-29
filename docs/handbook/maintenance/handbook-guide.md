# Xây và duy trì handbook

Cập nhật: 2026-09-29 · Trạng thái: quy ước đề xuất, đã áp dụng để tổ chức handbook 0.1. Chủ trì nội dung: chủ sản phẩm; người thực hiện thay đổi cập nhật trang liên quan.

## Căn cứ thiết kế bộ tài liệu

| Nguồn nghiên cứu | Nguyên tắc học được | Áp dụng cho Mira |
| --- | --- | --- |
| [Diátaxis](https://diataxis.fr/) | Phân biệt tutorial, how-to, reference và explanation theo nhu cầu người đọc | Chương research/vision giải thích; scope tra cứu; hướng dẫn chạy là how-to; tutorial người dùng chỉ viết khi luồng đã chạy |
| [GitLab Handbook Usage](https://handbook.gitlab.com/handbook/about/handbook-usage/) | Một nơi chịu trách nhiệm cho thông tin; liên kết thay vì sao chép; cập nhật theo thay đổi công việc | Chuyển docs cũ thành link, tổ chức theo chức năng và gắn người chịu trách nhiệm |
| [ADR](https://adr.github.io/) | Lưu quyết định cùng bối cảnh và hệ quả | Quyết định lớn có bản ghi, trạng thái và liên kết thay thế |

Đây là cách áp dụng riêng cho dự án nhỏ. Không bê toàn bộ quy trình công ty hoặc buộc một cấu trúc bốn thư mục cứng nhắc. Nghiên cứu thị trường, quyết định sản phẩm và spec phục vụ xây app; hướng dẫn người dùng cuối sẽ bổ sung khi có tính năng thật.

## Hình thức đóng bộ

**Bản gốc:** Markdown trong `docs/handbook/` (ảnh tham khảo cũ ở `docs/assets/` đã gỡ ngày 2026-09-29; ảnh mới chỉ thêm khi chương cần), mục lục ở [README](../README.md). Đọc ngay trong Git/editor, diff được cùng code và không cần thêm framework web.

**Đơn vị thay đổi:** một chủ đề có nơi chịu trách nhiệm duy nhất. Scope mô tả ranh giới, spec chuyên đề mô tả hành vi, current-state mô tả code, ADR lưu lý do. Trang khác dẫn tới chúng thay vì chép toàn văn. Tóm tắt ở README phải ngắn và trỏ nguồn chính.

**Bản đóng mốc:** ghi phiên bản handbook, ngày, commit khi đã commit và changelog. Bản 0.1 hiện là snapshot nội dung trong working tree; không bịa tag/commit. Khi cần chia sẻ ngoài repo có thể xuất HTML/PDF từ cùng nguồn, kèm version/date; file xuất là snapshot, không sửa như bản chuẩn. Chưa cài docs framework, tạo website hay xuất PDF trong đợt này.

## Trạng thái tài liệu và quyền quyết định

| Nhãn | Ý nghĩa | Điều kiện chuyển |
| --- | --- | --- |
| Quan sát | Có nguồn công khai hoặc code cụ thể | Nguồn đổi thì cập nhật/hạ độ chắc chắn |
| Giả thuyết | Suy luận chưa kiểm chứng | Chuyển thành kết luận có báo cáo, không tự thành quyết định |
| Đề xuất / Proposed | Phương án cụ thể đang đánh giá | Accepted khi có quyết định chủ sản phẩm hoặc người có quyền về chủ đề |
| Đã chốt / Accepted | Ràng buộc đã được xác nhận | Thay thế bằng quyết định mới có lý do |
| Đã triển khai | Code đáp ứng phạm vi mô tả | Dẫn code và kết quả kiểm tra; không dựa vào checkbox roadmap |
| Superseded | Bản cũ được thay | Giữ link sang bản mới; lịch sử không bị giả lập lại |

Mỗi trang mới ghi ngày, trạng thái, chủ trì theo vai trò và câu hỏi nó trả lời. Không cần chờ phê duyệt để sửa typo/link hoặc mô tả đúng hiện trạng; thay scope đã chốt cần quyết định, không biến một sửa docs thành quyết định sản phẩm.

## Quy trình cho một thay đổi

1. Tìm chương hiện có và đọc quyết định liên quan trước khi tạo file.
2. Ghi vấn đề/bằng chứng. Nguồn web có URL, ngày đọc, version/gói nếu ảnh hưởng; nguồn code có đường dẫn.
3. Viết thay đổi tại nơi chịu trách nhiệm. Nếu quyết định lớn, dùng ADR mới; nếu nghiên cứu, tách quan sát khỏi suy luận.
4. Cập nhật link ở mục lục và các trang phụ thuộc. Với đổi quyết định, cập nhật decisions, open-questions và spec cùng đợt.
5. Kiểm tra local links, tên brand, trạng thái, ví dụ và khả năng tái hiện. Thay code thì chạy kiểm tra phù hợp; sửa chữ không cần dựng test app mới.
6. Ghi changelog cho thay đổi có ý nghĩa. Khi commit, theo [AGENTS.md](../../../AGENTS.md), một thay đổi logic mỗi commit; không tự coi patch chưa commit là release.

## Khi nào đọc lại

Trước mỗi mốc roadmap: kiểm tra decisions/scope/current-state. Khi một tính năng hoàn thành: cập nhật hiện trạng và hướng dẫn cùng thay đổi. Trước quyết định tích hợp/chi phí: đọc lại nguồn vendor/license. Đề xuất rà soát research theo quý nếu vẫn dùng để ra quyết định; đây là nhịp bảo trì tài liệu, **không phải automation đã được tạo**.

Các quyết định có thể sống lâu; giá/gói và trạng thái release biến động nhanh. Không đổi tất cả ngày cập nhật chỉ để tài liệu trông mới. Nếu chưa kiểm chứng lại, ghi đúng ngày cũ và giới hạn.

## Tiêu chí một chương đủ dùng

Có người đọc cụ thể, câu hỏi rõ, trạng thái, ngày, nguồn/bằng chứng, hành động tiếp theo và liên kết ngược. Không có “đã hỗ trợ” khi chỉ tồn tại mockup. Không chép raw chat làm spec. Không đưa khóa API, dữ liệu truyện riêng hoặc benchmark chưa chạy vào repo như dữ liệu thật.

## Những chương bổ sung khi đủ điều kiện

| Trigger | Tài liệu cần thêm |
| --- | --- |
| Chọn storage/editor | ADR và spec transaction/version/backup |
| Luồng P0 chạy được | Tutorial chương đầu + how-to backup/restore + troubleshooting |
| Thêm định dạng | Reference cú pháp, import/export và corpus hồi quy |
| Thêm AI | Spec dữ liệu gửi, quyền áp dụng, chi phí, lỗi và benchmark |
| Phát hành | Release checklist, changelog app, upgrade/migration, yêu cầu hệ thống |

Không tạo hàng loạt trang rỗng trước khi có nội dung. Dùng [mẫu](templates.md) để đóng các chương đúng lúc.

---

[Mục lục handbook](../README.md)
