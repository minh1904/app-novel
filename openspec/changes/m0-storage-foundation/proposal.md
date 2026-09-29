## Why

Mira chưa lưu được gì: thư viện chạy trên dữ liệu mẫu trong bộ nhớ, mở lại là mất. Mọi mốc sau (AI dịch, hai mode, glossary) đều cần một kho dữ liệu bền và an toàn, và [handbook](../../../docs/handbook/delivery/roadmap.md) đã chốt "nền dữ liệu trước". Làm M0 trước để mọi màn hình về sau đọc/ghi dữ liệu thật ngay từ đầu, không phải viết lại.

## What Changes

- Thêm kho lưu trữ SQLite chạy trong main process: `library.db` (chỉ mục) và **một file SQLite cho mỗi tác phẩm**, WAL, `synchronous=FULL`, migration theo `user_version`.
- Thêm mô hình nội dung: tác phẩm → chương → văn bản theo bên (raw/dịch) có revision → segment có ID ổn định → link n:m; provenance của bản dịch.
- Thêm lớp IPC có kiểu giữa renderer và main cho tác phẩm/chương/văn bản; renderer không chạm file hay database.
- Nối màn thư viện vào kho thật: tạo, đổi tên, lưu trữ, tạm dừng tác phẩm; danh sách chương; "tiếp tục chương gần nhất". Bỏ dữ liệu mẫu khỏi đường chạy thật.
- Thêm interface provider dịch và **provider giả lập** offline (độ trễ, lỗi giả lập) để các mốc sau xem/kiểm thử luồng AI không cần khóa API.
- Thêm backup/restore **một tác phẩm** thành một tệp; từ chối an toàn gói lỗi hoặc schema không hỗ trợ, không ghi đè dữ liệu đang dùng.
- Gate đầu tiên: smoke-test `node:sqlite` trong main process Electron 44. Nếu không đạt thì dùng `better-sqlite3`; quyết định ghi vào design.

Không thuộc M0: soạn thảo văn bản, nhập raw, chia câu, job dịch, glossary, gọi AI thật, tài khoản/đồng bộ (xem [scope](../../../docs/handbook/product/scope.md) S1 trở đi).

## Capabilities

### New Capabilities

- `work-storage`: cách lưu bền dữ liệu tác phẩm — hai tầng file SQLite, quyền truy cập chỉ ở main process, tính bền/nhất quán khi ghi, migration schema, đường dẫn lưu.
- `content-model`: hợp đồng dữ liệu nội dung — chương, văn bản theo bên có revision, segment, link n:m, provenance; các bất biến (text + segment ghi cùng transaction, link trỏ segment ID).
- `work-library`: hành vi thư viện thật — tạo/đổi tên/tạm dừng/lưu trữ tác phẩm, danh sách chương, tiếp tục chương gần nhất, trạng thái trống.
- `translation-provider`: hợp đồng provider dịch (yêu cầu/phản hồi theo segment ID, lỗi có phân loại, hủy) và provider giả lập.
- `work-backup`: xuất một tác phẩm ra một tệp, khôi phục thành tác phẩm mới, kiểm tra toàn vẹn và phiên bản schema.

### Modified Capabilities

<!-- Chưa có spec nào trong openspec/specs/. -->

## Impact

- **Code mới:** `src/main/storage/`, `src/main/ipc/`, `src/main/providers/`; mở rộng `src/shared/desktop-api.ts`, `src/preload/index.ts`; sửa `src/renderer/src/App.tsx` và `features/library/*` để dùng dữ liệu thật; `works.ts` chỉ còn kiểu và hàm định dạng.
- **Phụ thuộc:** có thể thêm `better-sqlite3` + `@electron/rebuild` nếu `node:sqlite` không đạt; nếu đạt thì không thêm dependency runtime.
- **Bảo mật:** giữ sandbox, context isolation, kiểm tra người gửi IPC; đường dẫn tệp không nhận từ renderer (dùng hộp thoại của main).
- **Dữ liệu người dùng:** thư mục `userData` mặc định của Electron; chưa có dữ liệu cũ nên không cần migration từ bản trước.
- **Tài liệu:** cập nhật `engineering/current-state.md`, `delivery/roadmap.md` khi hoàn thành; ADR storage nếu chọn `better-sqlite3`.
