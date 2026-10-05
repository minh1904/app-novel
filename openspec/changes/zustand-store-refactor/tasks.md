## 1. Hạ tầng và Cài đặt Thư viện

- [x] 1.1 Thêm dependency `zustand` vào `package.json` và kiểm tra typecheck (`node scripts/check.mjs`) thành công
- [x] 1.2 Tạo cấu trúc thư mục `src/renderer/src/stores/` kèm tiện ích reset store dùng cho test và kiểm tra import hợp lệ

## 2. Store Giao diện & Điều hướng (UI Store)

- [x] 2.1 Xây dựng `src/renderer/src/stores/uiStore.ts` quản lý `view`, `sidebarOpen`, `theme`, `beforeSettings` và viết unit test kiểm tra các action điều hướng
- [x] 2.2 Tích hợp `LeaveGuard` vào `uiStore.navigate` và viết unit test kiểm tra hành vi chặn điều hướng khi có nội dung chưa lưu
- [x] 2.3 Refactor `App.tsx` sử dụng `useUiStore`, loại bỏ prop-drilling điều hướng và kiểm tra các màn hình chuyển đổi chính xác

## 3. Store Thư viện Tác phẩm (Library Store)

- [x] 3.1 Xây dựng `src/renderer/src/stores/libraryStore.ts` thay thế `useLibrary.ts` và viết unit test kiểm tra nạp danh sách, cập nhật tác phẩm, thông báo lỗi
- [x] 3.2 Refactor `LibraryScreen.tsx`, `LibrarySidebar.tsx`, `WorkDetailScreen.tsx` sang dùng `useLibraryStore` và kiểm tra thao tác CRUD/sao lưu tác phẩm hoạt động đúng

## 4. Store Danh sách Chương (Chapter Store)

- [x] 4.1 Xây dựng `src/renderer/src/stores/chapterStore.ts` thay thế `useChapters.ts` và viết unit test kiểm tra tạo, đổi tên, di chuyển và xóa chương
- [x] 4.2 Cập nhật `ChaptersArea.tsx` và `ChapterNavSidebar.tsx` cùng dùng chung `useChapterStore` và kiểm tra danh sách chương đồng bộ giữa hai màn hình

## 5. Store Kết nối AI & Cấu hình Model (Connection Store)

- [x] 5.1 Xây dựng `src/renderer/src/stores/connectionStore.ts` thay thế `useConnections.ts` và viết unit test kiểm tra nạp kết nối, lưu API key và cập nhật mục model
- [x] 5.2 Cập nhật `SettingsScreen.tsx`, `AiPanel.tsx` và `ModelSelectionMenu.tsx` sử dụng `useConnectionStore` và kiểm tra việc chọn model không bị fetch lặp lại qua IPC

## 6. Store Phiên AI & Streaming (AI Chat Store)

- [x] 6.1 Xây dựng `src/renderer/src/stores/aiChatStore.ts` quản lý phiên chat, nhận streaming chunks trực tiếp từ kênh IPC và viết unit test mô phỏng stream
- [x] 6.2 Refactor `AiPanel.tsx` và `useAiChat.ts` sang `useAiChatStore` và kiểm tra nội dung stream không bị mất khi toggle ẩn/hiện panel

## 7. Kiểm tra Toàn diện & Hồi quy

- [x] 7.1 Chạy toàn bộ test suite và linter qua `node scripts/check.mjs` để xác minh không có lỗi typecheck hay test hồi quy
- [x] 7.2 Kiểm tra xác nhận gõ văn bản trong `TextEditor.tsx` không bị ảnh hưởng hiệu năng và bộ gõ tiếng Việt (IME) hoạt động trơn tru
