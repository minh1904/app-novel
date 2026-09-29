# ADR-003 — Bộ công nghệ lưu trữ và soạn thảo

Ngày: 2026-09-29 · Trạng thái: **Accepted** · Người quyết định: chủ sản phẩm qua trao đổi ngày 2026-09-29, dựa trên so sánh có chạy thử ở [khả thi kỹ thuật](../research/technical-feasibility.md).

## Bối cảnh

Trước khi làm M0 cần chốt các lựa chọn khó đổi: engine SQLite, editor, tầng dữ liệu, kiểm tra đầu vào, test và IPC. Ba đợt so sánh có đo trong thư mục thử nghiệm ngoài repo (Electron 44.4.5, Node 24.21.0, Windows 11) cho kết quả dưới đây. Môi trường và số đo là của một máy; ổ đĩa nhanh, chưa thử cắt nguồn điện.

## Quyết định

| Hạng mục | Chọn | Lý do chính (bằng chứng) | Điều kiện xem lại |
| --- | --- | --- | --- |
| Engine SQLite | **`node:sqlite`** sau một adapter mỏng | Không dependency, không file native để ký/đóng gói; ghi 50k ký tự chặn ~1 ms (ngang `better-sqlite3`); 100/100 lần kill giữa lúc ghi không lỗi; có sessions/changeset và `backup()`; bản cài nhỏ hơn 8,8 MB | API đổi/vỡ khi nâng Electron (đang ở mức release candidate); cần API ổn định theo semver |
| Editor | **CodeMirror 6**, một `EditorState` dùng chung cho hai mode | Ánh xạ vùng segment qua chỉnh sửa và undo chung với thao tác căn chỉnh đã chạy; 0,3–0,5 ms mỗi phím với 200k ký tự + 1.000 segment trong Electron 44 | **Thử tay IME** (Telex, VNI, Pinyin) thất bại trên CM6 nhưng qua trên `<textarea>`; xem lỗi Chromium 149+ |
| Định dạng nội dung | **Markdown mức tối thiểu**, Source editor + Reading view; Live Preview để sau | Giữ văn bản thuần là nguồn duy nhất, không chuẩn hóa ngầm | Người dùng chính không dùng nổi Source mode |
| Tầng dữ liệu | **SQL thuần + repository viết tay**, migration theo `PRAGMA user_version` chạy theo từng tệp | Kysely/Drizzle không có đường `node:sqlite` ổn định; trigger, CHECK, `VACUUM INTO` cần lối thoát thô | Bề mặt truy vấn phình lên (bộ lọc động, tìm kiếm) |
| Kiểm tra đầu vào IPC | **valibot** | 4,7 KB; 5.000 segment kiểm tra ~1,3 ms; kiểu suy ra từ schema | Muốn hệ sinh thái quen hơn thì zod |
| Test | **Vitest 5** | Import `node:sqlite` chạy được; test kill tiến trình đã chạy; có jsdom cho React | — |
| Hợp đồng IPC | **Tự viết** (bản đồ kênh có kiểu, kiểm tra người gửi, `Result`) | Thư viện có sẵn không cung cấp cả `Result` lẫn kiểm tra người gửi; chỉ đọc metadata, chưa thử từng thư viện | Xuất hiện thư viện đáp ứng đủ và được duy trì |
| Bố cục tệp | **Một tệp SQLite cho mỗi tác phẩm** + `library.db` chỉ mục; đuôi **`.mira`** | Backup/restore một tác phẩm là một tệp; lỗi không lan | Chưa đo riêng so với một DB duy nhất; đo nếu thấy chậm khi có hàng trăm tác phẩm |

Đã loại: `better-sqlite3` (dự phòng tốt: bản 13 có binary dựng sẵn cho Electron 44, nhưng thêm file native chưa ký và cần `npmRebuild: false` trong electron-builder), libsql, sqlite3, sql.js/wa-sqlite, ProseMirror/TipTap, Lexical, Slate, Monaco, Kysely, Drizzle.

## Hệ quả

- Phải tự viết hàm `transaction()` (`BEGIN IMMEDIATE`, `SAVEPOINT` cho lớp lồng, rollback không che lỗi gốc) vì `node:sqlite` không có sẵn.
- Ghim phiên bản Electron và chạy smoke test `node:sqlite` mỗi lần nâng.
- `valibot` phải nằm trong `dependencies` vì electron-vite coi dependency của main/preload là external.
- Tìm không dấu tiếng Việt cần hàm chuẩn hóa riêng (NFD, bỏ dấu, `đ`→`d`); FTS5 `remove_diacritics` không xử lý `đ`.
- Neo segment: đầu vùng gắn bên phải, cuối vùng gắn bên trái, tự phát hiện vùng bị xóa; cờ "đã chạm/đã xóa" cần effect nghịch đảo để undo đúng. Đây là chi phí thật của M1, không miễn phí.
- Chưa kiểm chứng: IME tiếng Việt trong Electron 44, mất điện đột ngột, máy không có Visual Studio Build Tools, hành vi `node:sqlite` khi đóng gói (task 1.3 và 9.1 của change M0).

## Liên kết

[ADR-002](0002-ai-first-translation.md) · [Khả thi kỹ thuật](../research/technical-feasibility.md) · [Kiến trúc](../engineering/architecture.md) · change `m0-storage-foundation` trong `openspec/changes/`

---

[Mục lục handbook](../README.md)
