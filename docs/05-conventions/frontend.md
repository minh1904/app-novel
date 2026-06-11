# Quy Ước Frontend (React + Electron)

React app nằm trong `src/renderer/`. Đây là môi trường Chromium thuần — không có Node.js, không import `electron` trực tiếp.

---

## Cấu Trúc Thư Mục

Tổ chức theo **domain**, không theo loại file:

```
src/renderer/
  App.tsx                 # Root component, setup router
  index.tsx               # Entry — ReactDOM.createRoot() + StrictMode
  index.css               # Global styles
  features/               # Domain modules — CORE của app
    <domain>/
      components/         # UI chỉ dùng trong feature này
      hooks/              # Hooks của feature
      services/           # IPC calls riêng cho feature
      store/              # Zustand slice cho feature
  components/             # Shared UI thuần (Button, Modal, Badge...)
  layouts/                # Layout wrappers
    RootLayout.tsx
  hooks/                  # Global hooks (useWindowSize, useTheme...)
  services/               # IPC abstraction layer
    ipc.ts                # Wrapper window.electronAPI.*
  store/                  # Global Zustand store
  types/                  # Renderer-specific TypeScript types
```

Ví dụ khi app lớn:

```
features/
  editor/
    components/EditorPanel.tsx
    hooks/useAutoSave.ts
    services/editorIpc.ts
    store/editorStore.ts
  settings/
    components/SettingsModal.tsx
    hooks/useSettings.ts
```

---

## IPC Service Layer — Bắt Buộc

**Không gọi `window.electronAPI.*` trực tiếp trong component.** Bọc lại trong `services/ipc.ts`:

```typescript
// src/renderer/services/ipc.ts
export const ipcService = {
  ping: () => window.electronAPI.ping(),
  // saveFile: (content: string) => window.electronAPI.saveFile(content),
};
```

Tại sao:
- Component không bị coupled với IPC API — dễ thay đổi khi preload thay đổi
- Một chỗ duy nhất để mock khi test
- Feature services (`features/editor/services/editorIpc.ts`) import từ đây

```typescript
// features/editor/services/editorIpc.ts
import { ipcService } from '@/services/ipc';

export const editorIpc = {
  save: (content: string) => ipcService.saveFile(content),
};
```

---

## IPC Listeners — Luôn Cleanup

```typescript
useEffect(() => {
  const cleanup = window.electronAPI.onUpdateStatus((status) => {
    setStatus(status);
  });
  return cleanup; // bắt buộc — tránh memory leak, đúng với Strict Mode
}, []);
```

React Strict Mode double-invoke effects để phát hiện missing cleanup. **Không tắt Strict Mode** để workaround leak.

---

## Đặt Tên Component

- **PascalCase** cho tên file và hàm export: `StoryCard.tsx`, `function StoryCard()`
- Một component mỗi file, tên file khớp tên export
- Không dùng `export default` ẩn danh

```typescript
// Đúng
export function StoryCard({ story }: { story: Story }) { ... }

// Sai
export function storyCard(...) { ... }   // lowercase
export default function(...) { ... }     // anonymous
```

---

## Đặt Tên Hook

Tất cả hook bắt đầu bằng `use`, viết camelCase:

```typescript
export function useStories() { ... }
export function useAutoSave(content: string) { ... }
```

---

## Ranh Giới Component

| Loại | Vị trí |
|------|--------|
| Component domain (`StoryCard`, `EditorPanel`) | `features/<domain>/components/` |
| Component dùng nhiều feature (`PageHeader`) | `components/` |
| UI primitive (`Button`, `Input`, `Badge`) | `components/` — dùng shadcn/ui khi cần |
| Layout wrapper | `layouts/` |
| IPC wrapper | `services/ipc.ts` |
| Global hook | `hooks/` |
| Feature hook | `features/<domain>/hooks/` |

---

## State Management

| Loại state | Nơi lưu |
|-----------|---------|
| UI state cục bộ (modal open, form value) | `useState` |
| State dùng giữa nhiều component trong feature | Zustand slice trong `features/<domain>/store/` |
| State global (theme, user prefs) | Zustand store trong `store/` |
| State persist (config, data) | electron-store (main process) → expose qua IPC |

Không dùng Redux — Zustand đủ và nhẹ hơn cho app Electron quy mô vừa.

---

## Styling

Dùng Tailwind utility classes. Không dùng CSS modules, không dùng `style={}` trừ khi cần giá trị động.

```tsx
// Đúng
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">

// Sai
<button style={{ padding: '8px 16px', backgroundColor: '#2563eb' }}>
```

---

## Types

Types của renderer nằm trong `types/`. Types dùng chung giữa main/preload/renderer nằm trong `src/shared/`.

```typescript
// Lấy từ shared — IPC contracts, enums
import type { IpcResult, SourceLanguage } from '@/shared/types';

// Renderer-specific types
import type { EditorState } from '@/types';
```

Không định nghĩa lại type đã có trong `shared/`.
