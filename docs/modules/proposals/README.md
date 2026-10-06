# Module Đề xuất và phiên AI

Cập nhật: 2026-10-05 · Trạng thái: quyết định sản phẩm đã chốt; OpenSpec và mã đang triển khai.
Chủ trì: chủ sản phẩm và kỹ thuật. Câu hỏi: AI ghi, người duyệt và quay lại kết quả nhiều chương ra sao?

## Phạm vi

Chủ sản phẩm ưu tiên trải nghiệm **Đề xuất → Accept/Deny → Accept all** trong editor, lấy
Antigravity làm tham chiếu UX. Panel AI cần giữ hội thoại khi chỉ bị ẩn, có lịch sử phiên và cho
phép trở lại đề xuất của chương khác. Quyết định hiện hành nằm ở [trang quyết định](decisions.md);
những chi tiết không được ghi tại đó là **đề xuất** cho OpenSpec Module 5.

| Đọc để trả lời | Trang |
| --- | --- |
| Điều gì đã được chốt và thay ADR-005 ở đâu? | [Quyết định hiện hành](decisions.md) |
| Người dịch thấy gì và thao tác ra sao? | [Luồng duyệt](review-flow.md) |
| Phiên AI, lượt dịch nhiều chương và hàng chờ quan hệ thế nào? | [Phiên và nhiều chương](sessions-and-jobs.md) |
| Dữ liệu nào phải lưu và điều kiện nào cho phép ghi? | [Dữ liệu và an toàn](data-and-safety.md) |
| Antigravity thực sự cho thấy gì; mã Mira hiện làm gì? | [Bằng chứng và câu hỏi mở](evidence.md) |
| Panel AI nên trình bày câu trả lời và ngữ cảnh ra sao? | [Nghiên cứu lại panel AI](chat-panel-research.md) |

## Ranh giới quyết định

- **Đã chốt:** mọi kết quả AI thay chữ đều có hồ sơ đề xuất, kể cả pane trống; mặc định duyệt trước,
  mode Áp dụng thẳng tự Accept khi an toàn; Accept/Deny/Accept all theo phạm vi rõ; panel và lịch sử
  phiên theo tác phẩm, không mất khi ẩn/tắt app; xem
  [quyết định](decisions.md). Đơn vị chương/đoạn và SQLite vẫn theo ADR-005.
- **OpenSpec đã hoàn tất:** [change `proposals`](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/proposals/tasks.md)
  mô tả bảng, neo vùng, quyết định từng phần và nghiệm thu. Toàn bộ 27/27 task đã được triển khai và kiểm chứng.
- **Đã hoàn tất trong mã nguồn:** schema tác phẩm v7, phiên/lượt AI, đề xuất bền, Accept/Deny/Accept
  all/Hoàn tác có checkpoint, composer với hành động theo lượt, lớp diff trong editor, SafeMarkdown,
  badge hàng chờ theo chương, lọc đề xuất theo phiên, điều hướng đề xuất giữa các chương, và đường dịch chương theo dòng không
  trống vào nhóm đề xuất. Hộp dịch mặc định Duyệt trước; Áp dụng thẳng chỉ tự ghi khi bản dịch còn
  trống và không đổi. Xem [kho](../../../src/main/infra/storage/aiProposals.ts),
  [service duyệt](../../../src/main/services/proposals/proposalService.ts),
  [dịch theo đoạn](../../../src/main/services/ai/paragraphTranslation.ts).

Module 5 dựng đường duyệt và dữ liệu đề xuất. [Module 7 Tác vụ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#7-tác-vụ)
chịu trách nhiệm chạy, tạm dừng và tiếp tục dịch nhiều chương sau khi app tắt. Module 5 cần có hàng
chờ theo chương ngay từ đầu để Module 7 có chỗ đưa kết quả vào; không đồng nhất lịch sử hội thoại với
trạng thái tiến độ tác vụ. [Module 8 Gỡ Từng câu](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#8-gỡ-từng-câu)
mới xóa các bảng và đường dữ liệu segment/link/provenance.

Tài liệu này phân biệt quyết định đã chốt, OpenSpec và phần mã mới đang chờ nghiệm thu.

[Về mục lục module](../README.md)
