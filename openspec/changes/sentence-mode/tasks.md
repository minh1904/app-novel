## 1. Hàng và trạng thái (hàm thuần, dùng chung)

- [x] 1.1 `src/shared/rows.ts`: kiểu `Row`/`RowState`, `rowState(links)` (quy tắc D4, thứ tự ưu tiên khi nhiều liên kết), `buildRows(source, target, links)` trả `rows`, `unlinkedTargets` và `counts`; văn bản dịch của hàng lấy từ đầu segment dịch đầu tới cuối segment dịch cuối
- [x] 1.2 `src/shared/rows.test.ts`: hàng không liên kết, hàng một và nhiều segment dịch, trạng thái từng loại và thứ tự ưu tiên, `unlinkedTargets`, chương 5.000 hàng dựng dưới 50 ms

## 2. Ghi hàng ở main

- [x] 2.1 `linkFile.ts`: `LinkRecord.reviewedAt` (đọc từ `reviewed_at`), `LinkInput.reviewedAt`, `deleteLink`, `markReviewed`; cập nhật test hiện có và dữ liệu mẫu nếu cần, không đổi schema
- [x] 2.2 `src/main/storage/sentenceRows.ts` `saveRow`: kiểm `expectedRev` (conflict), từ chối liên kết nhiều–nhiều (validation), vùng của hàng hoặc vị trí chèn kèm ký tự ngăn cách theo spec, chuẩn hóa một đoạn, thay/chèn/xóa bằng `applyEdits` + `resegment(…, 'vi')`, xóa liên kết cũ rồi `saveText` rồi tạo liên kết `user` đã soát và `setProvenance` human cho segment dịch của hàng; một transaction
- [x] 2.3 `reviewRow` (đặt trạng thái ổn và thời điểm soát, từ chối hàng không có liên kết) và `autoPair` (ghép theo thứ tự các segment dịch chưa liên kết với hàng chưa dịch, liên kết `ai` ở `needs_review`, trả số cặp)
- [x] 2.4 `sentenceRows.test.ts` với kho thật: viết cho hàng đầu/giữa/cuối chưa dịch (đúng vị trí, ký tự ngăn cách khi cùng dòng và khác dòng, ID các hàng khác giữ nguyên), sửa hàng đã dịch, hàng viết hai câu thành hai segment cùng liên kết, xóa trắng (không dấu cách đôi, hàng về *Chưa dịch*), hai hàng cùng dòng sửa một hàng, xung đột revision không đổi dữ liệu, liên kết nhiều–nhiều bị từ chối, xác nhận, ghép theo thứ tự lệch số lượng, mở lại thư viện cho cùng kết quả

## 3. IPC

- [x] 3.1 `channels.ts` (`links:list`, `rows:save`, `rows:review`, `rows:autopair`), schema valibot trong `rows.ts`, handler trong `libraryHandlers.ts` (qua `LibraryStore`: `listLinks`, `saveRow`, `reviewRow`, `autoPair`), `preload/index.ts` và `desktop-api.ts`; cập nhật mock `window.mira` ở bản thử nếu có
- [x] 3.2 Test handler: hợp lệ hóa đầu vào (id sai, văn bản quá dài), kết quả trả về, lỗi `conflict`/`validation` đi qua kênh đúng như `text:save`

## 4. Màn Từng câu

- [x] 4.1 `useSentenceRows`: nạp văn bản hai bên và liên kết, dựng hàng, hàng đợi ghi tuần tự dùng `rev` mới nhất, nháp theo hàng giữ chữ đang gõ, lỗi và xung đột theo hàng, tải lại, ghép theo thứ tự, xác nhận
- [x] 4.2 `SentenceMode`: đầu màn (số hàng theo trạng thái, "Hàng cần xử lý kế tiếp", thông báo và nút "Ghép theo thứ tự" khi có segment dịch chưa ghép), danh sách 50 hàng mỗi trang với `ChapterPager`, hàng gồm số hàng, văn bản gốc chỉ đọc đúng phông, ô `<textarea>` tự co giãn có tên "Bản dịch hàng N", nhãn trạng thái bằng chữ, lỗi dưới hàng
- [x] 4.3 Bàn phím: Enter ghi rồi sang ô hàng kế (Shift+Enter không xuống dòng), Ctrl+Enter xác nhận rồi nhảy hàng cần xử lý kế tiếp, rời ô ghi nếu chữ đổi, rời ô không đổi thì không ghi; nhảy qua trang khác đặt đúng focus
- [x] 4.4 `ChapterWorkspace`: bật tab "Từng câu" (bỏ nhãn "Sắp có"), mode mặc định Toàn văn; sang Từng câu qua `confirmLeave({ reloadOnDiscard: true })` khi Toàn văn chưa lưu; về Toàn văn ghi hàng đang có nháp trước (lỗi thì ở lại), tăng `targetEpoch` để editor dịch dựng lại trên văn bản mới; nút "Lưu" và Ctrl+S, chế độ tập trung, "Thay bản gốc" và chặn rời hoạt động ở cả hai mode

## 5. Kiểm chứng

- [x] 5.1 Chạy trong Electron thật: viết hàng ở Từng câu rồi xem ở Toàn văn (đúng thứ tự và chỗ xuống dòng), bản dịch viết ở Toàn văn rồi ghép theo thứ tự và các hàng *Cần kiểm tra* rồi xác nhận, Enter và Ctrl+Enter, rời ô không sửa, xóa trắng, xung đột khi bản dịch đổi ở nơi khác, ghi lỗi giữ chữ, chuyển mode khi chưa lưu, chặn rời, nhảy hàng cần xử lý qua trang khác; chụp màn hình sáng/tối ở 1280 và 940 px
- [ ] 5.2 Bảng ca IME riêng cho ô hàng (`imeCases.md`): người dùng gõ tay Telex và VNI ở ô hàng trống, ô hàng đã có chữ (sửa giữa câu), Enter giữa lúc đang soạn dở, chuyển hàng bằng Tab và Enter; ghi kết quả; một ca hỏng chặn việc coi change là xong
- [x] 5.3 Đo trong Electron thật với chương 5.000 hàng và bản dịch ~400.000 ký tự: mở Từng câu, đổi trang, ghi một hàng (kỳ vọng dưới 100 ms), nhảy hàng cần xử lý kế tiếp, ghép theo thứ tự 5.000 cặp; ghi vào design và `delivery/validation.md`
- [ ] 5.4 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `delivery/backlog.md` (`sentence-mode` đã triển khai; thêm `merge-split-rows`, `shared-undo-modes`), `maintenance/changelog.md`
