## Context

Hiện trạng quản lý state tại `src/renderer/src` dựa hoàn toàn vào React primitives (`useState`, `useCallback`, `useRef`) phân tán ở các custom hooks (`useLibrary`, `useChapters`, `useConnections`, `useAiChat`). `App.tsx` đảm nhận việc lưu trữ view và chuyển giao trạng thái qua callback props. Chi tiết động lực xem tại [proposal.md](proposal.md).

## Goals / Non-Goals

**Goals:**
- Tách bạch các domain state thành các Zustand stores chuyên biệt, loại bỏ prop-drilling tại `App.tsx` và các component trung gian.
- Cho phép IPC event listener tương tác trực tiếp với Zustand store bên ngoài React lifecycle (đặc biệt cho streaming chat và background jobs sau này).
- Đảm bảo tính tương thích tuyệt đối với React 19 (sử dụng `useSyncExternalStore` tiêu chuẩn của Zustand v5).
- Tối ưu hóa render bằng fine-grained selectors, tránh render thừa tại editor khi các trạng thái UI hoặc thanh bên thay đổi.

**Non-Goals:**
- Không đưa nội dung văn bản biên tập, con trỏ hay lịch sử undo/redo của CodeMirror 6 vào Zustand.
- Không thay thế SQLite ở Main process; Zustand chỉ đóng vai trò client-side view state và cache ngắn hạn.
- Không đưa các form input tạm thời (form validation bằng Valibot trong các dialog modal) vào global store.

## Decisions

### Quyết định 1: Phân tách thành 5 Store theo từng Domain thay vì 1 Store đơn khối
- **Lựa chọn:** Tạo các store độc lập tại `src/renderer/src/stores/`:
  - `uiStore.ts`: `view`, `sidebarOpen`, `theme`, `activeModal`.
  - `libraryStore.ts`: `works`, `problems`, `load`, `notice`, `success`.
  - `chapterStore.ts`: `currentWorkId`, `chapters`, `activeChapterId`.
  - `connectionStore.ts`: `connections`, `tests`, `selectedModelId`.
  - `aiChatStore.ts`: `session`, `isStreaming`, `currentTurnId`.
- **Lý do:** Tránh monolithic store khó bảo trì, giúp code theo đúng kiến trúc modular của repo. Component chỉ cần import đúng store mà nó quan tâm.
- **Phương án thay thế đã loại bỏ:** Dùng Slice Pattern gộp chung vào 1 `useAppStore`. Phương án này khiến typing phức tạp và dễ gây import chéo vòng tròn.

### Quyết định 2: Tích hợp IPC Listener trực tiếp ngoài React Lifecycle
- **Lựa chọn:** Các sự kiện IPC dạng push như `ai:chat:chunk` (và sau này là `job:progress`) đăng ký callback trực tiếp gọi `useAiChatStore.getState().appendChunk(...)`.
- **Lý do:** Loại bỏ nguy cơ mất gói tin hoặc rò rỉ bộ nhớ khi component React unmount / remount lúc người dùng chuyển tab hoặc ẩn panel.
- **Phương án thay thế đã loại bỏ:** Đăng ký trong `useEffect` của component. Cách này dễ gặp race condition và mất state khi component bị unmount.

### Quyết định 3: Phối hợp giữa `useUiStore` và `LeaveGuard`
- **Lựa chọn:** Phương thức `navigate(nextView)` trong `useUiStore` kiểm tra qua `LeaveGuardRegistry` trước khi thay đổi trạng thái `view`. Nếu có cảnh báo chưa lưu, việc chuyển view sẽ tạm dừng cho đến khi người dùng xác nhận.
- **Lý do:** Giữ nguyên cam kết không bao giờ làm mất nội dung người dùng đang gõ dở.

### Quyết định 4: Hỗ trợ Reset Store phục vụ Unit Test
- **Lựa chọn:** Mỗi store xuất ra một hàm `reset()` để đưa trạng thái về ban đầu (`initialState`), dùng trong `beforeEach` của Vitest.
- **Lý do:** Đảm bảo các test case chạy độc lập, không bị ảnh hưởng bởi dữ liệu thừa từ test case trước.

## Risks / Trade-offs

- **[Nguy cơ xung đột peer dependency React 19]** → Cần chỉ định phiên bản `zustand` mới nhất (v5.0+) hỗ trợ chuẩn React 19 mà không cần flag `--legacy-peer-deps`.
- **[Nguy cơ lạm dụng global state cho văn bản]** → Quy định ranh giới nghiêm ngặt trong docs và linter: TextEditor sở hữu toàn quyền `EditorState` của CodeMirror.
- **[State phân mảnh khi không đồng bộ với SQLite]** → Mọi action làm thay đổi dữ liệu đều tuân theo mô hình: gọi IPC -> nhận `Result` thành công -> cập nhật Zustand store. Nếu IPC thất bại, báo lỗi qua `notice` và rollback store.

## Migration Plan

1. Cài đặt `zustand` qua pnpm (chú ý giữ lockfile không đổi version theo quy định repo).
2. Tạo cấu trúc thư mục `src/renderer/src/stores/` và viết các unit test cho từng store.
3. Chuyển đổi `App.tsx` sang dùng `useUiStore`.
4. Thay thế `useLibrary.ts` bằng `useLibraryStore` và cập nhật các component thư viện.
5. Thay thế `useChapters.ts` bằng `useChapterStore` cho `ChaptersArea` và `ChapterNavSidebar`.
6. Thay thế `useConnections.ts` bằng `useConnectionStore`.
7. Chuyển đổi `useAiChat.ts` sang `useAiChatStore`.
8. Chạy toàn bộ test suite (`node scripts/check.mjs`) kiểm tra hồi quy.
