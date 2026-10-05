## Why

Hiện tại, mã nguồn renderer (`src/renderer/src`) đang quản lý trạng thái bằng React hooks phân tán (`useState`, `useCallback`) và truyền callback lồng nhau qua nhiều tầng props (prop-drilling) tại `App.tsx`, `useLibrary.ts`, `useChapters.ts`, và `useConnections.ts`. Cách tiếp cận này bộc lộ nhiều hạn chế:
1. `App.tsx` bị phình to do phải nắm giữ toàn bộ trạng thái điều hướng, sidebar, theme và các callback tương tác giữa các màn hình.
2. Dữ liệu giữa các view bị phân mảnh và fetch lặp lại: danh sách chương cần cho cả `ChaptersArea` và `ChapterNavSidebar`, danh sách kết nối AI cần cho cả `SettingsScreen`, `AiPanel` và `AiTranslateDialog`.
3. Vòng đời streaming AI trong `useAiChat` bị gắn chặt vào React lifecycle của `AiPanel`; khi người dùng chuyển view hoặc ẩn panel, kết nối stream và state có thể bị hủy hoặc rò rỉ listener.

Việc chuẩn hóa và tái cấu trúc hệ thống state sang **Zustand** giúp quản lý state theo từng domain gọn gàng, hỗ trợ kết nối IPC mượt mà bên ngoài vòng đời component, và chuẩn bị nền tảng vững chắc cho các luồng đề xuất (`proposals`) và tác vụ nền (`jobs`) sắp tới.

## What Changes

- Thêm dependency `zustand` (phiên bản tương thích React 19) vào renderer.
- **Tạo các Zustand stores chuyên biệt theo từng domain:**
  - `useUiStore`: Quản lý điều hướng (`view`), trạng thái thanh bên (`sidebarOpen`), giao diện sáng/tối (`theme`), và các modal toàn cục.
  - `useLibraryStore`: Quản lý danh sách tác phẩm (`works`), trạng thái nạp dữ liệu, thông báo kết quả/lỗi, và các thao tác CRUD/sao lưu tác phẩm.
  - `useChapterStore`: Quản lý danh sách chương của tác phẩm đang làm việc, đồng bộ xuyên suốt giữa màn hình chi tiết và thanh bên soạn thảo.
  - `useConnectionStore`: Quản lý danh sách kết nối AI, API keys và cấu hình model được lưu trữ đệm tại renderer, chia sẻ cho Settings, Chat và Dịch chương.
  - `useAiChatStore`: Tách biệt phiên hội thoại và bộ lắng nghe streaming IPC ra ngoài lifecycle của React component, bảo toàn trạng thái khi ẩn/hiện panel.
- **Tái cấu trúc các component và hook hiện có:**
  - Rút gọn `App.tsx` thành layout router mỏng, loại bỏ prop-drilling.
  - Thay thế hoặc bọc lại các hook cục bộ (`useLibrary`, `useChapters`, `useConnections`, `useAiChat`) bằng các selector của Zustand.
- **Ranh giới bất biến:** Giữ nguyên trạng thái văn bản và con trỏ bên trong CodeMirror 6 (`EditorState`), không đưa nội dung văn bản biên tập vào Zustand.

## Capabilities

### New Capabilities
- `workspace-stores`: Quản lý trạng thái giao diện, bộ nhớ đệm dữ liệu IPC và đồng bộ phiên AI bằng Zustand stores chuyên biệt theo domain.

### Modified Capabilities
<!-- Không thay đổi spec yêu cầu nghiệp vụ bên ngoài của các màn hình, chỉ tái cấu trúc tầng state renderer nội bộ -->

## Impact

- **Dependencies:** Thêm `zustand` vào `package.json`.
- **Renderer Code:**
  - Thêm thư mục `src/renderer/src/stores/` với các store tương ứng.
  - Refactor `App.tsx`, `LibraryScreen.tsx`, `WorkDetailScreen.tsx`, `ChapterWorkspace.tsx`, `AiPanel.tsx`, `SettingsScreen.tsx`.
- **Rủi ro hồi quy:** Cần đảm bảo các hành vi chặn điều hướng (`LeaveGuard`) khi chưa lưu văn bản vẫn hoạt động chính xác trước khi chuyển màn hình.
