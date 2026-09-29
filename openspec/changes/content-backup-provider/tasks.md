## 1. Repository nội dung

- [ ] 1.1 Repository văn bản: `text:get` và `text:save` với `expectedRev`, lỗi `conflict` khi lỗi thời; thay toàn bộ segment cùng transaction và đặt `text_rev`
- [ ] 1.2 Repository segment, link, `link_member`, `provenance`: ghi/đọc n:m; xóa segment đặt link thành `needs_review`
- [ ] 1.3 Đăng ký handler `text:*` và mở rộng preload
- [ ] 1.4 Test bất biến: văn bản và segment lưu hoặc hủy cùng nhau; đóng/mở giữ nguyên ID, vùng, nội dung từng ký tự (gồm tiếng Việt, CJK, emoji, CRLF)
- [ ] 1.5 Mở rộng test crash hiện có sang ghi văn bản và segment: sau khi kill, văn bản và segment cùng revision hoặc cùng không đổi

## 2. Sao lưu và khôi phục

- [ ] 2.1 `backup:export`: hộp thoại lưu do main mở; `VACUUM INTO` vào `.part`, kiểm tra, đổi tên thành tệp đích; hủy hộp thoại không tạo gì
- [ ] 2.2 `backup:restore`: hộp thoại mở; sao chép vào `works/.tmp`, kiểm tra (`application_id`, `user_version`, `integrity_check`, `foreign_key_check`, bảng bắt buộc), nâng cấp schema nếu cần, ghi `work.id` mới, đổi tên nguyên tử, cập nhật chỉ mục
- [ ] 2.3 Test: khôi phục trên hồ sơ sạch khớp nội dung và giữ cả ảnh bìa; khôi phục khi bản gốc còn tồn tại tạo tác phẩm mới độc lập; tệp không phải Mira, tệp cắt cụt, schema mới hơn đều bị từ chối và thư viện không đổi; gián đoạn giữa restore không để lại tác phẩm dở
- [ ] 2.4 Đo `VACUUM INTO` với tệp tác phẩm vài chục MB; nếu chậm, chuyển sang `backup()` có tiến trình
- [ ] 2.5 Nối "Mở tác phẩm có sẵn" thành khôi phục từ backup và thêm "Sao lưu…" vào menu tác phẩm; kiểm tra tay sao lưu → khôi phục trên `MIRA_DATA_DIR` mới, khi tắt mạng

## 3. Provider dịch và provider giả lập

- [ ] 3.1 Định nghĩa `TranslationProvider`, `TranslateRequest/Response`, `ProviderError` (loại lỗi, `retryable`, `retryAfterMs`)
- [ ] 3.2 Viết hàm thuần `reconcile` (matched/missing/extra/duplicates) và test: đủ ID khác thứ tự, thiếu, thừa, trùng
- [ ] 3.3 Provider giả lập: bản dịch xác định `[giả lập] <nguồn>`, độ trễ và các chế độ lỗi cấu hình được, tôn trọng `AbortSignal`, nguồn gốc `mock`
- [ ] 3.4 Test: dịch ba segment; bật lỗi thiếu ID; giới hạn tốc độ kèm thời gian chờ; hủy giữa chừng không ghi kết quả; xác thực không thử lại được

## 4. Hoàn tất

- [ ] 4.1 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md` và `delivery/roadmap.md`
