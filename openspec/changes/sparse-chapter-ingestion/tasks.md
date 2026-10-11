## 1. Storage & Bi-directional Insertion Core

- [x] 1.1 Bổ sung hàm `insertChapterAt` trong `src/main/infra/storage/chapterFile.ts` và phương thức `createChapterAt` trong `LibraryStore` (`src/main/services/library/library.ts`), cho phép chèn chương tại `targetPosition` và dịch chuyển các chương phía sau lên 1; kiểm tra bằng unit test trong `src/main/services/library/chapters.test.ts`.
- [x] 1.2 Cập nhật handler `sources:catalog:download` trong `src/main/ipc/handlers/sources.ts` tính toán `targetPosition` hai chiều dựa trên tiền nhiệm $P$ và kế nhiệm $S$, xử lý xung đột $P.position \ge S.position$ bằng cách ưu tiên tiền nhiệm $P$; kiểm tra bằng unit test trong `src/main/ipc/sourcesHandlers.test.ts`.
- [x] 1.3 Bổ sung hàm `reorderByCatalog` trong `src/main/infra/storage/sourceStorage.ts` và IPC handler `sources:catalog:reorder-by-source` để sắp xếp lại các chương đã tải theo `ordinal_key`; kiểm tra bằng unit test trong `src/main/ipc/sourcesHandlers.test.ts`.

## 2. Robust Multi-source Matching & Normalization

- [x] 2.1 Cập nhật `src/main/sources/matching.ts`: bổ sung chuẩn hóa số full-width sang half-width, siết chặt regex `extractChapterNumber` (bắt buộc tiền tố hoặc neo đầu chuỗi) tránh bắt nhầm năm/số lượng, và bổ sung tầng fallback theo thứ tự tương đối khi tiêu đề không chứa số; kiểm tra bằng unit test trong `src/main/sources/matching.test.ts`.
- [x] 2.2 Chuẩn hóa chỉ số `order` trong `src/main/sources/kakuyomu/parser.ts` bắt đầu từ 1 (1-based) để thống nhất với các adapter khác; cập nhật fixture tests trong `src/main/sources/kakuyomu/kakuyomu.test.ts`.

## 3. Backend Bulk & Range Ingestion

- [x] 3.1 Bổ sung hàm tiện ích `parseRangeString` trong `src/shared/text/rangeParser.ts` hỗ trợ phân tích dải số chương (ví dụ `1, 5, 10-25`) và kiểm tra bằng unit test.
- [x] 3.2 Bổ sung IPC handler `sources:catalog:download-range` trong `src/main/ipc/handlers/sources.ts` nhận `{ workId, bindingId, range }`, truy vấn trực tiếp bảng `source_catalog_item`, tải tuần tự qua network broker và phát sự kiện tiến độ `sources:download:progress`.
- [x] 3.3 Nâng cấp giao diện danh mục trong `src/renderer/src/modules/workspace/work-detail/SourcesArea.tsx`: bổ sung ô nhập dải chương, nút "Tải dải chương", và hiển thị thanh tiến độ ProgressBar tải nền độc lập với phân trang.

## 4. UI Clean-up, Smart Jump & Gap Indicators

- [x] 4.1 Bổ sung hàm định dạng nhãn chương `formatChapterLabel` trong `src/renderer/src/modules/workspace/work-detail/chapterList.ts` để loại bỏ tiền tố số lặp `{chapter.number}.` khi tiêu đề đã có tiền tố số rõ ràng; áp dụng đồng bộ cho `ChapterNavSidebar.tsx` và `ChaptersArea.tsx`.
- [x] 4.2 Cập nhật `parseQuery` trong `chapterList.ts` hỗ trợ nhảy chương (Jump) theo cả số thứ tự danh sách lẫn số hiệu trích xuất từ tiêu đề; kiểm tra bằng unit test trong `chapterList.test.ts`.
- [x] 4.3 Xây dựng component `ChapterGapItem` và render dải phân cách khoảng khuyết giữa các chương có hiệu số chương chênh lệch $> 1$ trên `ChapterNavSidebar.tsx` và `ChaptersArea.tsx`.
- [x] 4.4 Bổ sung hành động "Sắp xếp theo nguồn raw" trong menu thao tác của `ChaptersArea.tsx` kèm hộp thoại xác nhận khi người dùng muốn khôi phục trật tự catalog gốc.

## 5. Gap-Aware Editor Navigation

- [x] 5.1 Bổ sung phím tắt `Alt+Down` và `Alt+Up` trong `ChapterWorkspace.tsx` để chuyển chương kế tiếp / trước đó.
- [x] 5.2 Tích hợp kiểm tra khoảng khuyết khi chuyển chương: nếu phát hiện nguồn raw primary có chương liền kề chưa nạp, hiển thị thông báo với lựa chọn "Tải & Mở chương kế" hoặc "Chuyển tới chương tiếp có sẵn"; kiểm tra phản hồi khi thao tác.

## 6. Verification & Checks

- [x] 6.1 Chạy toàn bộ kiểm thử, typecheck và linter qua lệnh `node scripts/check.mjs` để xác nhận không phát sinh lỗi hồi quy.
