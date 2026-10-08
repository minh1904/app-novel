# Phiên làm việc theo tác phẩm

Cập nhật: 2026-10-05 · Trạng thái: **đã triển khai trong working tree** · Chủ trì: phát triển sản phẩm Mira.

Chương này trả lời cách Mira mở nhiều truyện trong cùng cửa sổ và xử lý bản sửa chưa lưu. Quyết
định sản phẩm và phạm vi gốc nằm ở [change work-tabs](../../../openspec/changes/archive/2026-10-05-work-tabs/proposal.md).

## Hành vi đã có

- Mỗi tác phẩm có tối đa một tab. Mở lại từ Thư viện kích hoạt tab cũ; mở chương từ một truyện đổi
  vị trí của chính tab đó. Mỗi tab nhớ chương gần nhất và khu vực trong màn tác phẩm; bộ lọc và
  trang danh sách chương còn trong phiên chạy khi đổi tab hoặc khu vực.
- Thứ tự tab, tab hoạt động và vị trí từng truyện được lưu bằng bản ghi version 1 ở bảng `meta`
  trong `library.db`. Main kiểm tra ID khi khôi phục: bỏ tab có tác phẩm đã mất, đưa chương đã
  mất về trang tác phẩm và báo lý do. Lỗi đọc/ghi phiên tab không chặn Thư viện.
- Chuyển tab giữ editor có chữ chưa lưu cùng selection/undo trong bộ nhớ. Tab ẩn không nhận focus
  hoặc phím tắt; editor chương sạch có thể được tháo và dựng lại từ kho khi chọn. Đóng tab hoặc rời chương
  trong cùng tab hỏi lưu/bỏ/ở lại cho bản sửa liên quan. Thoát cửa sổ kiểm tra mọi tab còn dirty.
- Danh sách chương bỏ phản hồi IPC đến muộn của truyện khác. Phiên chat được giữ theo tác phẩm;
  chunk của request AI được gắn theo ID yêu cầu, kể cả sau khi chuyển tab.
- Thanh tab nằm trong titlebar, cuộn ngang khi nhiều truyện. Ctrl+Tab và Ctrl+Shift+Tab chuyển
  tab; tác vụ trong editor đã nhận phím trước được ưu tiên.

Nguồn triển khai: [`uiStore`](../../../src/renderer/src/stores/uiStore.ts),
[`AppShell`](../../../src/renderer/src/app/AppShell.tsx),
[`LeaveGuard`](../../../src/renderer/src/features/editor/leaveGuard.tsx),
[`WorkspaceService`](../../../src/main/services/workspace/workspaceService.ts).

## Giới hạn và phần tiếp theo

Bản sửa chưa lưu chỉ được giữ khi app vẫn chạy; sau crash, Mira khôi phục vị trí tab nhưng không
khôi phục chữ chưa lưu. Một tab thuộc một truyện, không có tab riêng cho từng chương hoặc chia
pane. Đóng tab không hủy yêu cầu AI/tác vụ Main. Hàng đợi dịch bền, batch translation, usage và
trần chi phí thuộc [Module 7: Tác vụ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md#7-tác-vụ), chưa triển
khai trong change này.

## Nghiên cứu liên quan

- [Những gì nên đặt ở thanh bên](sidebar-research.md): thanh bên của LinguaGacha, Novelcrafter, CAT tool,
  Obsidian; kết luận 2026-10-08: không dùng rail điều hướng.
- [Tính năng của đối thủ và cách lấp chỗ trống](competitor-features.md): tính năng trong từng màn của
  LinguaGacha, AiNiee, GalTransl, công cụ Việt, app viết truyện và CAT tool; 15 tính năng xếp hạng và ba
  cách lấp chỗ trống khi không có rail (đề xuất, chưa chốt).
- [Tính năng toàn app cho thanh bên chung](app-level-features.md): mục cấp app của GalTransl, AiNiee,
  Mihon, Novelcrafter, Notion, CAT tool; đề xuất thanh bên Trang chủ / Thư viện / Tác vụ / tài nguyên
  dùng chung (đề xuất, chưa chốt).
- [Bố cục hai pane ở màn dịch chương](chapter-panes.md): cách Crowdin, Immersive Translate, CAT tool đặt
  bản gốc; đã làm thu gọn bản gốc, kéo chia bề rộng, cuộn cùng và làm sáng đoạn tương ứng.
- [Xuất chương, xuất hàng loạt và chọn nhiều chương](export-and-bulk.md): khóa bản gốc gom vào menu
  pane gốc, phạm vi và tiến độ khi xuất, chọn nhiều chương để xuất hoặc xóa.
