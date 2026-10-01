## 1. Repository nội dung

- [ ] 1.1 Hàm thuần kiểm tra vùng segment (UTF-16, sắp xếp, không chồng, trong độ dài) và giới hạn kích thước, có test với emoji, chữ Hán mặt phẳng phụ, CRLF, vùng rỗng và vùng sát biên
- [ ] 1.2 Repository văn bản: đọc bên chưa ghi trả rỗng `rev 0`; `save` với `expectedRev` (lần đầu tạo hàng, `rev = 1`), lỗi `conflict` khi lỗi thời; thay toàn bộ segment cùng transaction, giữ ID được truyền vào, từ chối ID của chương/bên khác, đặt `text_rev`
- [ ] 1.3 Repository segment, link, `link_member`, `provenance`: ghi/đọc n:m; xóa segment đặt link thành `needs_review`; chưa mở IPC
- [ ] 1.4 `ChapterItem` thêm `hasSource` và `hasTarget` tính bằng `EXISTS` trong `listChapters`; mọi kênh `chapters:*` trả đúng cờ; test khớp sau ghi, ghi rỗng và xóa chương
- [ ] 1.5 Kênh `text:get` và `text:save` qua `createHandler` và `guardHandlers` (schema valibot gồm giới hạn kích thước, `to`/`rev` nguyên, ID hợp lệ); mở rộng preload và `DesktopApi`; test handler: đầu vào sai kiểu, ID của tác phẩm khác, văn bản quá dài, nguồn không tin cậy
- [ ] 1.6 Test bất biến: văn bản và segment lưu hoặc hủy cùng nhau; đóng/mở giữ nguyên ID, vùng, nội dung từng ký tự; ghi lỗi giữa chừng rollback; test ngẫu nhiên so với mô hình đơn giản cho dãy ghi/xóa/đổi vị trí chương có nội dung
- [ ] 1.7 Mở rộng test crash hiện có sang ghi văn bản và segment: sau khi kill, văn bản và segment cùng revision hoặc cùng không đổi
- [ ] 1.8 Hộp xóa chương nêu bên nào sẽ mất khi `hasSource`/`hasTarget` và gợi ý sao lưu; chương không có nội dung giữ câu cũ

## 2. Sao lưu và khôi phục

- [ ] 2.1 `backup:export`: hộp thoại lưu do main mở (cửa sổ cha là cửa sổ chính), gợi ý tên `<tên> — <ngày>.mira` đã bỏ ký tự không hợp lệ; `VACUUM INTO` vào `.part`, kiểm tra, đổi tên thành tệp đích; hủy hộp thoại trả `cancelled` và không tạo gì; lỗi ghi không để lại `.part`
- [ ] 2.2 `backup:restore`: hộp thoại mở; sao chép vào `works/.tmp`, kiểm tra (`application_id` trước hết, `user_version`, `integrity_check`, `foreign_key_check`, bảng bắt buộc), nâng cấp schema nếu cần, ghi `work.id` mới (giữ trạng thái, chương gần nhất, mốc thời gian), đổi tên nguyên tử, cập nhật chỉ mục; không mở tệp gốc tại chỗ và không khóa nó
- [ ] 2.3 Test: khôi phục trên hồ sơ sạch khớp nội dung và giữ cả ảnh bìa; giữ "Tạm dừng" và chương gần nhất; khôi phục khi bản gốc còn tồn tại tạo tác phẩm mới độc lập; tệp không phải Mira, tệp cắt cụt, schema mới hơn đều bị từ chối và thư viện không đổi; tệp gốc không đổi và xóa được ngay sau khi khôi phục; gián đoạn giữa restore không để lại tác phẩm dở
- [ ] 2.4 Đo `VACUUM INTO` với tệp tác phẩm vài chục MB và 5.000 chương có nội dung; nếu chậm, chuyển sang `backup()` có tiến trình
- [ ] 2.5 "Mở tác phẩm có sẵn" mở hộp chọn tệp ngay (bỏ màn giữ chỗ); thông báo thành công kèm nút mở tác phẩm; hủy không báo gì; lỗi nêu lý do
- [ ] 2.6 "Sao lưu…" trong `WorkMenu` ở thư viện và `WorkHeader` ở màn chi tiết, dùng chung một kênh; thông báo đã lưu/lỗi; kiểm tra tay sao lưu → khôi phục trên `MIRA_DATA_DIR` mới khi tắt mạng, trong Electron thật, kèm chụp màn hình

## 3. Provider dịch và provider giả lập

- [ ] 3.1 Định nghĩa `TranslationProvider`, `TranslateRequest/Response`, `ProviderError` (loại lỗi, `retryable`, `retryAfterMs`)
- [ ] 3.2 Viết hàm thuần `reconcile` (matched/missing/extra/duplicates) và test: đủ ID khác thứ tự, thiếu, thừa, trùng
- [ ] 3.3 Provider giả lập: bản dịch xác định `[giả lập] <nguồn>`, độ trễ và các chế độ lỗi cấu hình được, tôn trọng `AbortSignal`, nguồn gốc `mock`
- [ ] 3.4 Test: dịch ba segment; bật lỗi thiếu ID; giới hạn tốc độ kèm thời gian chờ; hủy giữa chừng không ghi kết quả; xác thực không thử lại được

## 4. Hoàn tất

- [ ] 4.1 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md` và `delivery/backlog.md` (đánh dấu `chapter-content-presence` có dữ liệu nhưng chưa có cột; thêm "sao lưu cả thư viện" và "sao lưu định kỳ" ở trạng thái Backlog)
