## Why

Màn editor hiện chỉ có mode Toàn văn; tab "Từng câu" còn là "Sắp có". Theo [scope](../../../docs/handbook/product/scope.md) S1.4 và [quyết định](../../../docs/handbook/product/decisions.md) "Hai mode", Từng câu là nơi soát bản dịch từng hàng: bản gốc bên trái, bản dịch bên phải, trạng thái từng hàng, nhảy hàng kế. Phần này cần một thứ mà `translation-editor` chưa có: **liên kết giữa segment gốc và segment dịch**. Kho đã có bảng `link` (n:m, trạng thái, `reviewed_at`) và nguồn gốc dịch nhưng chỉ ở mức repository, chưa có IPC. Change này thêm lớp IPC tối thiểu cho liên kết và dựng mode Từng câu trên đó, để về sau job dịch AI chỉ việc ghi bản dịch và liên kết theo từng segment là hàng hiện ra đúng.

## What Changes

- Thêm **mode Từng câu**: tab "Từng câu" dùng được. Mỗi hàng là một segment bản gốc (số hàng, văn bản gốc chỉ đọc) kèm ô bản dịch của hàng đó sửa trực tiếp, nhãn trạng thái, và nút xác nhận. Danh sách phân trang theo hàng.
- **Trạng thái hàng**: *Chưa dịch*, *AI đã dịch*, *Đã soát*, *Cần kiểm tra*, suy ra từ liên kết (không có liên kết; liên kết do AI chưa soát; đã soát; trạng thái cần xem lại). Đầu danh sách có số hàng theo từng trạng thái và lối nhảy tới **hàng cần xử lý kế tiếp**.
- **Sửa một hàng** ghi bản dịch của hàng vào đúng chỗ trong văn bản bản dịch toàn văn (cùng một văn bản với mode Toàn văn): hàng chưa có bản dịch được chèn đúng thứ tự (xuống dòng khi bản gốc xuống dòng, khoảng trắng khi cùng dòng), hàng đã có thì thay đúng vùng của nó, xóa trắng ô thì bỏ bản dịch của hàng. Segment dịch và liên kết được cập nhật trong **một thao tác** với văn bản.
- **Xác nhận hàng** (đánh dấu đã soát) và **ghép theo thứ tự** cho bản dịch đã viết ở Toàn văn mà chưa có liên kết (ghép câu dịch chưa ghép với hàng chưa dịch theo thứ tự, ghi là *Cần kiểm tra* vì chỉ là ước đoán).
- **Chuyển mode an toàn**: sang Từng câu khi Toàn văn còn thay đổi chưa lưu thì hỏi (lưu, bỏ, ở lại); khi quay lại Toàn văn, bản dịch hiện đúng văn bản đã ghi từ các hàng.
- **IPC mới** (renderer chưa gọi được liên kết): liệt kê liên kết của chương, lưu một hàng, xác nhận một hàng, ghép theo thứ tự. Không đổi schema.

Không thuộc change này: job dịch và provider (nên chưa có hàng "AI đã dịch" thật; trạng thái đã có trong mô hình và hiển thị), gộp/tách hàng (S2.7), liên kết nhiều–nhiều sửa từ giao diện, căn chỉnh tự động bằng thuật toán thật, chung một lịch sử hoàn tác giữa hai mode (hoàn tác bắt đầu lại khi đổi mode), cuộn đồng bộ.

## Capabilities

### New Capabilities

- `sentence-mode`: màn Từng câu: các hàng, trạng thái, sửa hàng, xác nhận, nhảy hàng kế, ghép theo thứ tự, chuyển mode.
- `segment-links`: hợp đồng của liên kết giữa segment gốc và dịch ở tầng dữ liệu cho các hàng: ghi một hàng cùng văn bản trong một thao tác, xác nhận, ghép theo thứ tự, và cách trạng thái được suy ra.

### Modified Capabilities

- `full-text-editor`: yêu cầu "Chọn mode" không còn để Từng câu bị tắt. (Spec này đến từ `translation-editor`, chưa archive.)

## Impact

- **Phụ thuộc change khác:** dùng workspace hai pane, `TextEditor`, `segmentMap` và chặn rời của `source-editor` và `translation-editor`; archive theo thứ tự `source-editor` → `translation-editor` → `sentence-mode`.
- **Code:** `src/shared/rows.ts` (kiểu và hàm thuần dựng hàng từ segment và liên kết), `src/main/storage/sentenceRows.ts` (ghi hàng, xác nhận, ghép), `src/shared/channels.ts`, `src/main/ipc/libraryHandlers.ts`, `src/preload/index.ts`, `src/shared/desktop-api.ts` (bốn kênh mới), `src/renderer/src/features/chapter/SentenceMode.tsx` và `ChapterWorkspace.tsx`.
- **Dữ liệu:** không đổi schema; dùng `link`, `link_member`, `provenance` (nguồn `human` cho segment dịch do người viết); `LinkRecord` có thêm `reviewedAt`.
- **Tài liệu:** `current-state.md`, `roadmap.md`, `backlog.md` (`sentence-mode` đã triển khai; thêm `merge-split-rows`, `shared-undo-modes`), `validation.md`, `changelog.md`.
