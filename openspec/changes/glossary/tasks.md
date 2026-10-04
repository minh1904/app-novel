## 1. Schema và Lưu trữ SQLite

- [x] 1.1 Nâng cấp `src/main/infra/storage/workSchema.ts` lên schema version 6, tạo bảng `context_entry` và `context_alias`. Viết migration test trong `workSchema.test.ts` đảm bảo nâng cấp mượt mà từ v5 lên v6.
- [x] 1.2 Cài đặt module `src/main/infra/storage/contextEntries.ts` với các thao tác CRUD cho thuật ngữ, truy vấn hiệu lực theo chương, và quản lý các dạng viết (alias). Viết unit tests cho tầng lưu trữ.

## 2. Thuật toán Phân tích và So khớp

- [x] 2.1 Cài đặt `src/shared/algorithms/namesParser.ts` phân tích cú pháp tệp `Names.txt` (dạng `Từ_gốc=Từ_dịch`, lọc comment `#`, `//`). Viết unit tests bao phủ các ca hợp lệ, lỗi định dạng và dòng trống.
- [x] 2.2 Cài đặt `src/shared/algorithms/contextMatching.ts` so khớp thuật ngữ trong văn bản nguồn (longest-match cho CJK, ranh giới từ `\b` cho Latin/EN, chặn từ quá ngắn, khớp qua alias). Viết unit tests.
- [x] 2.3 Cài đặt `src/shared/algorithms/glossaryCompliance.ts` kiểm tra tuân thủ thuật ngữ trên bản dịch (cờ cảnh báo khi thiếu bản dịch đích hoặc xuất hiện thuật ngữ bị cấm). Viết unit tests.

## 3. Tích hợp Lõi dịch và Dịch vụ IPC

- [x] 3.1 Nối thuật ngữ đã duyệt và đã khớp vào Tầng C (`layerC`) của `buildTranslateSystemPrompt()`, tính toán `contextHash` và kiểm tra nguyên tắc dữ liệu chưa duyệt (`pending`, `rejected`) không bao giờ rời máy.
- [x] 3.2 Xây dựng lớp dịch vụ `src/main/services/context/glossaryService.ts` kết nối tầng lưu trữ và tầng so khớp ngữ cảnh.
- [x] 3.3 Bổ sung các kênh IPC `glossary:*` trong `src/shared/contracts/channels.ts` và cài đặt handlers trong `src/main/ipc/handlers/glossaryHandlers.ts`. Viết tests kiểm thử IPC handlers.

## 4. Giao diện Màn Thuật ngữ (Glossary Screen)

- [x] 4.1 Xây dựng component danh sách thuật ngữ với tìm kiếm, lọc theo trạng thái (`approved`, `pending`, `rejected`) trong `src/renderer/src/features/glossary/`.
- [x] 4.2 Xây dựng form thêm mới, chỉnh sửa thuật ngữ và modal tải lên/nhập tệp `Names.txt`.
- [x] 4.3 Thay thế minh họa `ContextAreaMock` tại tab Ngữ cảnh (`WorkAreaHost`) bằng màn hình `GlossaryScreen` thật và kết nối các kênh IPC.

## 5. Nghiệm thu và Tài liệu

- [x] 5.1 Kiểm tra toàn bộ hệ thống bằng lệnh `node scripts/check.mjs --build` đạt 0 lỗi lint, typecheck và pass toàn bộ tests.
- [x] 5.2 Cập nhật handbook (`current-state.md`, `changelog.md`, `roadmap.md`) ghi nhận hoàn thành Module 3.
