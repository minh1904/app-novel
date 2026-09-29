## 1. Nền công cụ và smoke-test

- [ ] 1.1 Thêm Vitest và script `pnpm test`; đặt `engines.node` `>=24`; cấu hình test chạy trên Node thường với thư mục tạm
- [ ] 1.2 Lưu script smoke `node:sqlite` chạy trong Electron thật (load, WAL, Unicode, `VACUUM INTO`, `backup`) vào `scripts/` kèm cách chạy; xác nhận pass trên Electron 44.4.5
- [ ] 1.3 Xác nhận electron-vite giữ `node:sqlite` là external khi build main và bản `build:unpack` mở được DB; ghi kết quả vào design (D1)

## 2. Adapter SQLite và kho lưu trữ

- [ ] 2.1 Tạo `src/main/storage/sqlite.ts`: mở DB với PRAGMA (WAL, `synchronous=FULL`, `foreign_keys`, `busy_timeout`), `prepare`, đóng an toàn
- [ ] 2.2 Viết `transaction()` tự quản lý: `BEGIN IMMEDIATE` cho lớp ngoài, `SAVEPOINT` cho lớp lồng, rollback khi lỗi mà không che lỗi gốc, chỉ nhận hàm đồng bộ; test các trường hợp lồng, lỗi trong lớp lồng, trả giá trị
- [ ] 2.3 Tạo bộ chạy migration theo `user_version`, mỗi bước một transaction; từ chối và không ghi khi `user_version` cao hơn bản hiểu; test nâng cấp thành công và lỗi giữa chừng
- [ ] 2.4 Xác định thư mục dữ liệu (`userData`, ghi đè bằng `MIRA_DATA_DIR`), tạo `works/` và `works/.tmp/`, dọn `*.part` mồ côi khi khởi động
- [ ] 2.5 Tạo schema tệp tác phẩm v1 (D4) đầy đủ các bảng (`work`, `chapter`, `text`, `segment`, `link`, `link_member`, `provenance`), `application_id`, chỉ mục và trigger xóa segment; giữ một tệp fixture v1 trong test
- [ ] 2.6 Tạo schema `library.db` (`work_index`, `meta`) và logic đối chiếu khi khởi động: quét `works/*.mira`, upsert, xóa mục mồ côi, trả `problems` cho tệp không mở được
- [ ] 2.7 Viết test: mở lần đầu tạo kho rỗng; tệp tác phẩm hỏng không ảnh hưởng tác phẩm khác; `library.db` bị xóa vẫn dựng lại được từ tệp tác phẩm

## 3. Repository tác phẩm và chương

- [ ] 3.1 Repository tác phẩm: tạo, đọc, đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ, cập nhật `updated_at`; ghi tệp tác phẩm rồi cập nhật chỉ mục
- [ ] 3.2 Repository chương: thêm, đổi tên, sắp xếp lại (reindex trong một transaction), đặt chương gần nhất
- [ ] 3.3 Test: dữ liệu giữ nguyên sau đóng và mở lại; tên rỗng bị từ chối; sắp xếp lại giữ đúng thứ tự; thứ tự hiển thị suy từ vị trí

## 4. IPC có kiểu cho thư viện

- [ ] 4.1 Định nghĩa hợp đồng kênh (tên → vào/ra) và kiểu `Result` với mã lỗi trong `src/shared/`
- [ ] 4.2 Viết hàm bao handler chung: kiểm tra người gửi (dùng lại logic của `app:info`), xác thực đầu vào, bắt lỗi thành `Result`
- [ ] 4.3 Đăng ký handler `work:*` và `chapter:*`; mở rộng preload và `DesktopApi` để phơi đúng các hàm đó
- [ ] 4.4 Test handler: nguồn không tin cậy bị từ chối; ID sai kiểu và trường thiếu/thừa trả `validation` và không đổi dữ liệu

## 5. Thư viện tác phẩm thật trong renderer

- [ ] 5.1 Thêm client gọi `window.mira` và xử lý `Result`; nạp danh sách tác phẩm và `problems` khi mở app, làm mới sau mỗi thao tác
- [ ] 5.2 Xóa `sampleWorks`, nút dữ liệu mẫu và toàn bộ hoạt động gần đây (`ActivityPanel` ở cả hai vị trí, `Activity`, `ActivityKind`, `sampleActivities`); giữ kiểu, nhãn, `isRecent`, `byUpdated`; cột phụ chỉ còn khung "Tiếp tục" và ẩn cả cột khi không có gì để hiện; làm `ChapterRef.excerpt` tùy chọn và ẩn dòng trích khi thiếu
- [ ] 5.3 Hàm chuẩn hóa tìm không dấu (NFD, bỏ dấu tổ hợp, `đ`→`d`, chữ thường) kèm test; nối vào ô tìm và các mục lọc
- [ ] 5.4 Màn tạo tác phẩm: tên + ngôn ngữ nguồn, tùy chọn tên gốc/mô tả; báo lỗi ngay tại trường tên khi rỗng
- [ ] 5.5 Nối đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ vào IPC; hiển thị dòng "không mở được" cho tác phẩm trong `problems`
- [ ] 5.6 Màn tổng quan tác phẩm tối giản: danh sách chương, thêm, đổi tên, sắp xếp; "Tiếp tục" chỉ khả dụng khi có chương gần nhất, chương mở vào màn "editor chưa xây"
- [ ] 5.7 Trạng thái trống của thư viện và của danh sách chương khớp spec `work-library`
- [ ] 5.8 Kiểm tra tay: tạo → đóng/mở app → còn nguyên; đổi tên, tạm dừng, lưu trữ; tìm không dấu; tắt mạng và lặp lại; `pnpm typecheck`, `pnpm lint`, `pnpm test`

**Điểm dừng để đánh giá:** hết nhóm 5 là lát cắt "thư viện tác phẩm chạy trên dữ liệu thật". Xem và chốt trước khi làm các nhóm sau.

## 6. Repository nội dung (văn bản, segment, liên kết)

- [ ] 6.1 Repository văn bản: `text:get` và `text:save` với `expectedRev`, lỗi `conflict` khi lỗi thời; thay toàn bộ segment cùng transaction và đặt `text_rev`
- [ ] 6.2 Repository segment, link, `link_member`, `provenance`: ghi/đọc n:m; xóa segment đặt link thành `needs_review`
- [ ] 6.3 Đăng ký handler `text:*` và mở rộng preload
- [ ] 6.4 Test bất biến: văn bản và segment lưu hoặc hủy cùng nhau; đóng/mở giữ nguyên ID, vùng, nội dung từng ký tự (gồm tiếng Việt, CJK, emoji, CRLF)
- [ ] 6.5 Test crash: tiến trình con ghi rồi bị kill giữa transaction; mở lại thấy trạng thái trước hoặc sau, không nửa vời; thao tác đã báo thành công vẫn còn

## 7. Backup và restore

- [ ] 7.1 `backup:export`: hộp thoại lưu do main mở; `VACUUM INTO` vào `.part`, kiểm tra, đổi tên thành tệp đích; hủy hộp thoại không tạo gì
- [ ] 7.2 `backup:restore`: hộp thoại mở; sao chép vào `works/.tmp`, kiểm tra (`application_id`, `user_version`, `integrity_check`, `foreign_key_check`, bảng bắt buộc), nâng cấp schema nếu cần, ghi `work.id` mới, đổi tên nguyên tử, upsert chỉ mục
- [ ] 7.3 Test: khôi phục trên hồ sơ sạch khớp nội dung; khôi phục khi bản gốc còn tồn tại tạo tác phẩm mới độc lập; tệp không phải Mira, tệp cắt cụt, schema mới hơn đều bị từ chối và thư viện không đổi; gián đoạn giữa restore không để lại tác phẩm dở
- [ ] 7.4 Đo `VACUUM INTO` với tệp tác phẩm vài chục MB; nếu chậm, chuyển sang `backup()` có tiến trình
- [ ] 7.5 Nối "Mở tác phẩm có sẵn" thành khôi phục từ backup và thêm hành động sao lưu một tác phẩm trên thư viện; kiểm tra tay sao lưu → khôi phục trên `MIRA_DATA_DIR` mới, khi tắt mạng

## 8. Provider dịch và provider giả lập

- [ ] 8.1 Định nghĩa `TranslationProvider`, `TranslateRequest/Response`, `ProviderError` (loại lỗi, `retryable`, `retryAfterMs`)
- [ ] 8.2 Viết hàm thuần `reconcile` (matched/missing/extra/duplicates) và test: đủ ID khác thứ tự, thiếu, thừa, trùng
- [ ] 8.3 Provider giả lập: bản dịch xác định `[giả lập] <nguồn>`, độ trễ và các chế độ lỗi cấu hình được, tôn trọng `AbortSignal`, nguồn gốc `mock`
- [ ] 8.4 Test: dịch ba segment; bật lỗi thiếu ID; giới hạn tốc độ kèm thời gian chờ; hủy giữa chừng không ghi kết quả; xác thực không thử lại được

## 9. Hoàn tất và tài liệu

- [ ] 9.1 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và `build:unpack`; mở bản unpack kiểm tra tạo/đọc dữ liệu
- [ ] 9.2 Cập nhật `docs/handbook/engineering/current-state.md` (đúng phạm vi đã có bằng chứng), `delivery/roadmap.md` (trạng thái M0), `product/open-questions.md`; ghi ADR bộ công nghệ và ADR storage vào `docs/handbook/decisions/`
- [ ] 9.3 Chốt câu hỏi mở còn lại trong design (đuôi tệp) trước khi archive change
