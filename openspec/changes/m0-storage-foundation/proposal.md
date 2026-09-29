## Why

Mira chưa lưu được gì: thư viện chạy trên dữ liệu mẫu trong bộ nhớ, mở lại là mất. Mọi mốc sau (chương, editor, AI dịch) đều cần một kho dữ liệu bền và an toàn, và [handbook](../../../docs/handbook/delivery/roadmap.md) đã chốt "nền dữ liệu trước". Làm phần này trước để mọi màn hình về sau đọc/ghi dữ liệu thật ngay từ đầu.

## What Changes

- Thêm kho lưu trữ SQLite chạy trong main process: `library.db` (chỉ mục, dựng lại được) và **một tệp `.mira` cho mỗi tác phẩm** là nguồn sự thật; WAL, `synchronous=FULL`, migration theo `user_version` (hiện là schema v3).
- Thêm lớp IPC có kiểu giữa renderer và main cho tác phẩm và ảnh bìa; renderer không chạm tệp hay database; lỗi trả về dạng dữ liệu; chỉ nhận yêu cầu từ khung chính của cửa sổ chính.
- Nối màn thư viện vào kho thật: tạo tác phẩm (tên, ngôn ngữ nguồn, tên gốc, tác giả, thể loại/bối cảnh, mô tả, ảnh bìa), đổi tên, tạm dừng/tiếp tục, lưu trữ, tìm không dấu, thông báo tệp không mở được. Bỏ dữ liệu mẫu và khung hoạt động gần đây.
- Thêm ảnh bìa: nén ở renderer, lưu trong tệp tác phẩm, hiển thị ở danh sách và thanh bên.
- Thêm bộ công cụ kiểm thử (Vitest) gồm test crash: kill tiến trình đang ghi rồi kiểm tra dữ liệu.

**Đã chuyển sang change khác (không thuộc phạm vi đã hoàn thành ở đây):**

- Nội dung dịch, sao lưu/khôi phục, provider dịch giả lập → `content-backup-provider`.
- Danh sách chương, màn chi tiết truyện, "Tiếp tục chương gần nhất" → `work-detail-screen`.

## Capabilities

### New Capabilities

- `work-storage`: cách lưu bền dữ liệu tác phẩm — hai tầng tệp SQLite, quyền truy cập chỉ ở main process, tính bền khi ghi, migration schema, đường dẫn lưu, hoạt động khi không có mạng.
- `work-library`: hành vi thư viện thật — tạo, quản lý, ảnh bìa, tìm và lọc, trạng thái trống.

### Modified Capabilities

<!-- Chưa có spec nào trong openspec/specs/. -->

## Impact

- **Code mới:** `src/main/storage/`, `src/main/ipc/`; mở rộng `src/shared/`, `src/preload/index.ts`; sửa `App.tsx` và `features/library/*` để dùng dữ liệu thật.
- **Phụ thuộc:** `valibot` (runtime), `vitest` và `esbuild` (dev). Không dùng module native (`node:sqlite` có sẵn trong Node của Electron 44).
- **Bảo mật:** giữ sandbox và context isolation; đường dẫn tệp không bao giờ đi qua IPC.
- **Dữ liệu người dùng:** thư mục `userData` của Electron (hoặc `MIRA_DATA_DIR`); schema đã qua ba phiên bản và dữ liệu cũ được nâng cấp tại chỗ.
- **Tài liệu:** ADR-002, ADR-003; cập nhật `engineering/current-state.md` và `delivery/roadmap.md`.
