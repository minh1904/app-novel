## 1. Work DB

- [x] 1.1 Thêm migration work v14 (`term_type`, `review_flags`, `context_entry_evidence`, `context_extraction_scan`) trong `workSchema.ts`; test nâng cấp từ v13 có dữ liệu và mục cũ đọc được.
- [x] 1.2 Mở rộng `contextEntries.ts`: ghi ứng viên kèm bằng chứng và cờ trong một transaction, đọc bằng chứng/cờ, ghi/đọc chương đã quét; test alias trùng lưu cờ thay vì lỗi.

## 2. Trích thuật ngữ và duyệt

- [x] 2.1 Thêm `ContextExtractionService` tái dùng `glossaryExtraction.ts` cùng kiểm sản phẩm (trùng approved/pending, mở lại mục đã loại, sai hệ chữ, `not-a-term`); test bằng provider giả, gồm lỗi giữa chừng không đổi mục đã có và trích tăng dần.
- [x] 2.2 Nối lời gọi trích vào cổng ngân sách của task; test chạm trần → `paused(budget)` trước request.
- [x] 2.3 Thêm contract + IPC duyệt (approve, sửa rồi approve, reject, duyệt hàng loạt cùng loại) với guard `updatedAt`; test `conflict`, lô lẫn loại bị từ chối, lô có một mục lỗi trả kết quả từng mục.

## 3. Task

- [x] 3.1 Thêm `contextStrategy` bắt buộc vào lệnh tạo task và capability chat; test lệnh thiếu trường bị từ chối và không đường nào tự trích.
- [x] 3.2 Chạy bước trích trước item đầu, chuyển `waiting_user(context_review)` khi có mục mới; test restart khi chờ, không mục mới thì chạy tiếp, hủy không xóa ứng viên.
- [x] 3.3 Test characterization: duyệt 8/12 → bản chụp đúng 8 mục mới; mục ngoài phạm vi; xóa chương mốc; dòng `recipientPronoun`/`thirdPerson` trong prompt.

## 4. UI và kiểm

- [x] 4.1 Tab Ngữ cảnh `Đang áp dụng` (chỉ đọc, cùng hàm bản chụp) và "Xem và duyệt" mở `GlossaryScreen` với bộ lọc `pending`; màn Từ điển hiện bằng chứng, cờ và lệnh duyệt.
- [x] 4.2 Chạy `node scripts/check.mjs`.
