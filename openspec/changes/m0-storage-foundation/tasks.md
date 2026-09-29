## 1. Nền công cụ và smoke-test

- [x] 1.1 Thêm Vitest và script `pnpm test`; đặt `engines.node` `>=24`; cấu hình test chạy trên Node thường với thư mục tạm
- [x] 1.2 Lưu script smoke `node:sqlite` chạy trong Electron thật (load, WAL, Unicode, `VACUUM INTO`, `backup`) vào `scripts/` kèm cách chạy; xác nhận pass trên Electron 44.4.5
- [x] 1.3 Xác nhận electron-vite giữ `node:sqlite` là external khi build main và bản `build:unpack` mở được DB; ghi kết quả vào design (D1)

## 2. Adapter SQLite và kho lưu trữ

- [x] 2.1 Tạo `src/main/storage/sqlite.ts`: mở DB với PRAGMA (WAL, `synchronous=FULL`, `foreign_keys`, `busy_timeout`), `prepare`, đóng an toàn
- [x] 2.2 Viết `transaction()` tự quản lý: `BEGIN IMMEDIATE` cho lớp ngoài, `SAVEPOINT` cho lớp lồng, rollback khi lỗi mà không che lỗi gốc, chỉ nhận hàm đồng bộ; test các trường hợp lồng, lỗi trong lớp lồng, trả giá trị
- [x] 2.3 Tạo bộ chạy migration theo `user_version`, mỗi bước một transaction; từ chối và không ghi khi `user_version` cao hơn bản hiểu; test nâng cấp thành công và lỗi giữa chừng
- [x] 2.4 Xác định thư mục dữ liệu (`userData`, ghi đè bằng `MIRA_DATA_DIR`), tạo `works/` và `works/.tmp/`, dọn `*.part` mồ côi khi khởi động
- [x] 2.5 Tạo schema tệp tác phẩm v1 (D4) đầy đủ các bảng (`work`, `chapter`, `text`, `segment`, `link`, `link_member`, `provenance`), `application_id`, chỉ mục và trigger xóa segment; giữ một tệp fixture v1 trong test
- [x] 2.6 Tạo schema `library.db` (`work_index`, `meta`) và logic đối chiếu khi khởi động: quét `works/*.mira`, upsert, xóa mục mồ côi, trả `problems` cho tệp không mở được
- [x] 2.7 Viết test: mở lần đầu tạo kho rỗng; tệp tác phẩm hỏng không ảnh hưởng tác phẩm khác; `library.db` bị xóa vẫn dựng lại được từ tệp tác phẩm

## 3. Repository tác phẩm và chương

- [x] 3.1 Repository tác phẩm: tạo, đọc, đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ, cập nhật `updated_at`; ghi tệp tác phẩm rồi cập nhật chỉ mục

## 4. IPC có kiểu cho thư viện

- [x] 4.1 Định nghĩa hợp đồng kênh (tên → vào/ra) và kiểu `Result` với mã lỗi trong `src/shared/`
- [x] 4.2 Viết hàm bao handler chung: kiểm tra người gửi (dùng lại logic của `app:info`), xác thực đầu vào, bắt lỗi thành `Result`
- [x] 4.3 Đăng ký handler `works:*`; mở rộng preload và `DesktopApi` để phơi đúng các hàm đó (`chapters:*` thuộc change `work-detail-screen`)
- [x] 4.4 Test handler: nguồn không tin cậy bị từ chối; ID sai kiểu và trường thiếu/thừa trả `validation` và không đổi dữ liệu

## 5. Thư viện tác phẩm thật trong renderer

- [x] 5.1 Thêm client gọi `window.mira` và xử lý `Result`; nạp danh sách tác phẩm và `problems` khi mở app, làm mới sau mỗi thao tác
- [x] 5.2 Xóa `sampleWorks`, nút dữ liệu mẫu và toàn bộ hoạt động gần đây (`ActivityPanel` ở cả hai vị trí, `Activity`, `ActivityKind`, `sampleActivities`); giữ kiểu, nhãn, `isRecent`, `byUpdated`; cột phụ chỉ còn khung "Tiếp tục" và ẩn cả cột khi không có gì để hiện; làm `ChapterRef.excerpt` tùy chọn và ẩn dòng trích khi thiếu
- [x] 5.3 Hàm chuẩn hóa tìm không dấu (NFD, bỏ dấu tổ hợp, `đ`→`d`, chữ thường) kèm test; nối vào ô tìm và các mục lọc
- [x] 5.4 Màn tạo tác phẩm: tên + ngôn ngữ nguồn, tùy chọn tên gốc/mô tả; báo lỗi ngay tại trường tên khi rỗng
- [x] 5.5 Nối đổi tên, tạm dừng/tiếp tục, lưu trữ/bỏ lưu trữ vào IPC; hiển thị dòng "không mở được" cho tác phẩm trong `problems`
- [x] 5.9 Ảnh bìa: lưu trong tệp tác phẩm (schema v3), IPC `works:cover:get` và `works:cover:set`, kiểm tra JPEG ở main, nén ảnh ở renderer, có test
- [x] 5.10 Bộ chọn ảnh bìa trong form tạo (chọn tệp, kéo thả, gỡ), menu hàng "Thêm/Đổi/Gỡ ảnh bìa", bìa hiển thị ở danh sách và thanh bên; dựng lại bố cục form cho cân đối
- [x] 5.8 Kiểm tra: tạo → đóng/mở app → còn nguyên; đổi tên, tạm dừng, lưu trữ; tìm không dấu; ảnh bìa; chủ sản phẩm đã xem và chấp nhận. Chưa thử tắt mạng thật vì ở phạm vi này ứng dụng không có truy cập mạng nào (CSP `connect-src 'self'`, main không gọi mạng)

## 6. Hoàn tất và tài liệu

- [x] 6.1 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và `build:unpack`; mở bản unpack kiểm tra tạo/đọc dữ liệu
- [x] 6.2 Cập nhật `docs/handbook/engineering/current-state.md` (đúng phạm vi đã có bằng chứng), `delivery/roadmap.md` (trạng thái M0), `product/open-questions.md`; ghi ADR bộ công nghệ và ADR storage vào `docs/handbook/decisions/`
- [x] 6.3 Chốt câu hỏi mở còn lại trong design (đuôi tệp) trước khi archive change

## Đã chuyển sang change khác

- `content-backup-provider`: repository văn bản/segment/liên kết, sao lưu và khôi phục, provider dịch giả lập.
- `work-detail-screen`: thêm/đổi tên/sắp xếp chương (repository và IPC `chapters:*`), màn chi tiết truyện, trạng thái trống của danh sách chương, "Tiếp tục chương gần nhất".
