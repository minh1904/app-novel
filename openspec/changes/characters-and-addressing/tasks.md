## 1. Tầng Lưu trữ và Truy vấn Dữ liệu (Storage & Queries)

- [x] 1.1 Cài đặt các kiểu dữ liệu và hợp đồng cho nhân vật (`CharacterItem`) và quan hệ xưng hô (`AddressingDyadItem`) trong `src/shared/contracts/addressing.ts`. Viết unit test cho hợp đồng.
- [x] 1.2 Cài đặt các thao tác CRUD cho nhân vật và cặp xưng hô trong `src/main/infra/storage/addressingEntries.ts` sử dụng bảng `context_entry` và `context_alias` (schema v6), kèm truy vấn các cặp xưng hô có hiệu lực theo chương. Viết unit test cho storage.

## 2. Tích hợp Lõi dịch và Thuật toán (Translation Core & Algorithms)

- [x] 2.1 Cài đặt hàm định dạng Tầng B `formatAddressingLayerB` trong `src/main/services/ai/translate/promptBuilder.ts`, kiểm tra nguyên tắc chỉ đưa các mục `approved` vào prompt và cập nhật tính toán `contextHash`. Viết unit test cho prompt builder.
- [x] 2.2 Cài đặt thuật toán kiểm tra tuân thủ xưng hô thuần `src/shared/algorithms/addressingCompliance.ts` phát hiện đại từ ngoài ma trận trong các đoạn thoại của bản dịch. Viết unit test.
- [x] 2.3 Nối ma trận xưng hô của chương vào luồng dịch trong `src/main/services/library/library.ts` (`getEffectiveAddressing`) và `src/main/services/ai/chapterTranslation.ts`.

## 3. Lớp Dịch vụ và Kênh IPC (Service & IPC)

- [x] 3.1 Xây dựng `src/main/services/context/addressingService.ts` kết nối storage và cung cấp API nghiệp vụ. Viết unit test cho service.
- [x] 3.2 Khai báo các kênh IPC `addressing:*` trong `src/shared/contracts/channels.ts`, mở rộng `DesktopApi` trong `src/shared/contracts/desktop-api.ts` và preload bridge trong `src/preload/index.ts`.
- [x] 3.3 Cài đặt IPC handlers trong `src/main/ipc/handlers/addressing.ts` và tích hợp vào `src/main/ipc/libraryHandlers.ts`. Viết unit test cho IPC handlers.

## 4. Giao diện Người dùng Màn Xưng hô (Addressing UI)

- [x] 4.1 Xây dựng hook `src/renderer/src/features/addressing/useAddressing.ts` kết nối với API IPC `window.mira.addressing`.
- [x] 4.2 Xây dựng các component hộp thoại thêm/sửa nhân vật và thiết lập quan hệ xưng hô trong `src/renderer/src/features/addressing/AddressingDialogs.tsx`.
- [x] 4.3 Xây dựng màn hình `src/renderer/src/features/addressing/AddressingScreen.tsx` với danh sách nhân vật, lưới/danh sách ma trận xưng hô và bộ lọc theo chương; thay thế mock trong `src/renderer/src/features/work/ContextAreaMock.tsx`. Viết component test.

## 5. Kiểm tra Toàn diện và Cập nhật Tài liệu (Validation & Docs)

- [x] 5.1 Chạy toàn bộ kiểm tra bằng `node scripts/check.mjs --build` đảm bảo 0 lỗi lint, 0 lỗi typecheck, tất cả vitest tests pass và bundle build thành công.
- [x] 5.2 Cập nhật handbook (`current-state.md`, `changelog.md`, `roadmap.md`) ghi nhận hoàn thành Module 4.
