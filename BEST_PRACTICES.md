# Electron Best Practices — my-app

Tài liệu này tổng hợp các best practices cho project Electron này dựa trên stack hiện tại:
- **Electron 42** + **Electron Forge** + **Vite plugin**
- TypeScript, chưa có React (có thể thêm sau)

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Bảo mật (ưu tiên số 1)](#2-bảo-mật-ưu-tiên-số-1)
3. [IPC Communication](#3-ipc-communication)
4. [Cấu trúc thư mục đề xuất](#4-cấu-trúc-thư-mục-đề-xuất)
5. [Vấn đề hiện tại trong code](#5-vấn-đề-hiện-tại-trong-code)
6. [Thêm React (khi cần)](#6-thêm-react-khi-cần)
7. [Packaging & Distribution](#7-packaging--distribution)
8. [Testing](#8-testing)
9. [Bảng Anti-Patterns](#9-bảng-anti-patterns)

---

## 1. Tổng quan kiến trúc

Electron chạy **3 process riêng biệt** — mỗi process có quyền truy cập khác nhau:

```
┌─────────────────────────────────────────────┐
│  Main Process  (Node.js full access)        │
│  src/main.ts                                │
│  - Tạo BrowserWindow                        │
│  - Truy cập filesystem, OS APIs             │
│  - Đăng ký IPC handlers                     │
└───────────────────┬─────────────────────────┘
                    │ IPC (invoke/handle)
┌───────────────────▼─────────────────────────┐
│  Preload Script  (sandboxed Node bridge)    │
│  src/preload.ts                             │
│  - contextBridge.exposeInMainWorld()        │
│  - Bridge duy nhất giữa main ↔ renderer     │
└───────────────────┬─────────────────────────┘
                    │ window.electronAPI.*
┌───────────────────▼─────────────────────────┐
│  Renderer Process  (browser only, no Node)  │
│  src/renderer.ts + index.html               │
│  - Chỉ được dùng web APIs                   │
│  - Giao tiếp qua window.electronAPI         │
└─────────────────────────────────────────────┘
```

**Quy tắc vàng:** Renderer không được phép biết rằng nó đang chạy trong Electron.

---

## 2. Bảo mật (ưu tiên số 1)

### 2.1 BrowserWindow — bắt buộc

```typescript
// src/main.ts
const mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,   // ✅ BẮT BUỘC — mặc định true từ Electron 12
    sandbox: true,            // ✅ BẮT BUỘC — mặc định true từ Electron 20
    nodeIntegration: false,   // ✅ BẮT BUỘC — mặc định false
  },
});
```

> **Lý do:** Nếu `contextIsolation: false` hoặc `nodeIntegration: true`, bất kỳ XSS nào trong renderer có thể leo thang thành **Remote Code Execution** toàn quyền trên máy người dùng.

### 2.2 Preload — dùng contextBridge

```typescript
// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Request-response
  loadPreferences: () => ipcRenderer.invoke('load-prefs'),
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),

  // Subscription (trả về cleanup function)
  onUpdateStatus: (callback: (status: string) => void) => {
    const handler = (_e: IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
```

**KHÔNG BAO GIỜ expose raw `ipcRenderer`:**

```typescript
// ❌ SAI — renderer có full IPC access
contextBridge.exposeInMainWorld('electron', { ipcRenderer });

// ✅ ĐÚNG — chỉ expose các function cụ thể
contextBridge.exposeInMainWorld('electronAPI', {
  doSpecificThing: () => ipcRenderer.invoke('specific-channel'),
});
```

### 2.3 Content Security Policy

Thêm vào `src/main.ts` sau khi tạo window:

```typescript
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
      ],
    },
  });
});
```

### 2.4 Fuses — đã cấu hình tốt ✅

`forge.config.ts` hiện tại đã bật các fuses quan trọng:

| Fuse | Giá trị | Ý nghĩa |
|------|---------|---------|
| `RunAsNode` | `false` | Chặn `--inspect` mode |
| `EnableCookieEncryption` | `true` | Mã hóa cookie |
| `EnableNodeOptionsEnvironmentVariable` | `false` | Chặn `NODE_OPTIONS` injection |
| `EnableEmbeddedAsarIntegrityValidation` | `true` | Kiểm tra tính toàn vẹn ASAR |
| `OnlyLoadAppFromAsar` | `true` | Chỉ load code từ ASAR đã ký |

---

## 3. IPC Communication

### 3.1 Dùng invoke/handle (không dùng send/on cho request-response)

```typescript
// ✅ ĐÚNG — invoke/handle có async/await và error propagation
// Renderer
const result = await window.electronAPI.saveFile(content);

// Main
ipcMain.handle('save-file', async (_event, content: string) => {
  // ...
});

// ❌ SAI cho request-response
ipcRenderer.send('save-file', content);
ipcMain.on('save-file', (event, content) => {
  event.reply('save-file-reply', result); // awkward, no error handling
});
```

### 3.2 Pattern Result Type — bắt buộc cho cross-IPC errors

Electron chỉ serialize property `message` của Error object khi truyền qua IPC. Dùng Result type:

```typescript
// src/types/ipc.ts
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Main handler
ipcMain.handle('save-file', async (_event, content: string): Promise<IpcResult<string>> => {
  try {
    const filePath = await saveFileToDisk(content);
    return { success: true, data: filePath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Renderer
const result = await window.electronAPI.saveFile(content);
if (!result.success) {
  console.error('Save failed:', result.error);
}
```

### 3.3 Validate arguments từ renderer

Renderer có thể bị compromise — **không tin tưởng input từ renderer**:

```typescript
import { z } from 'zod'; // hoặc validate thủ công

const SaveFileSchema = z.object({
  content: z.string().max(10_000_000), // 10MB limit
  fileName: z.string().regex(/^[\w\-. ]+$/), // no path traversal
});

ipcMain.handle('save-file', async (_event, args: unknown) => {
  const parsed = SaveFileSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: 'Invalid arguments' };
  }
  // proceed with parsed.data
});
```

### 3.4 Typed IPC channels

```typescript
// src/types/ipc-channels.ts
export type IpcChannelMap = {
  'load-prefs': { args: []; return: UserPreferences };
  'save-file': { args: [content: string, fileName: string]; return: IpcResult<string> };
  'open-dialog': { args: [options: OpenDialogOptions]; return: string[] };
};

// Khai báo cho window object
// src/preload/index.d.ts
export interface ElectronAPI {
  loadPreferences: () => Promise<UserPreferences>;
  saveFile: (content: string, fileName: string) => Promise<IpcResult<string>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## 4. Cấu trúc thư mục

### Tầng Electron (top-level `src/`)

```
src/
├── main/                    # Main process (Node.js full access)
│   ├── index.ts             # Entry point
│   └── ipc/                 # IPC handlers, tách theo domain khi app lớn
│       ├── index.ts         # Đăng ký tất cả handlers
│       ├── file-handlers.ts
│       └── prefs-handlers.ts
│
├── preload/                 # Secure bridge (sandboxed)
│   ├── index.ts             # contextBridge.exposeInMainWorld()
│   └── index.d.ts           # Type declarations cho window.electronAPI
│
├── renderer/                # React app (Chromium, no Node access)
│   └── ...                  # Xem tầng React bên dưới
│
└── shared/                  # Dùng chung giữa CÁC processes
    └── types.ts             # IpcResult<T>, shared constants
                             # KHÔNG import từ 'electron' hay Node built-ins
```

> **Quy tắc `shared/`:** Chỉ chứa pure TypeScript — không import `electron`, không import Node built-ins. Main và renderer đều có thể import.

### Tầng React (bên trong `src/renderer/`)

```
src/renderer/
├── App.tsx                  # Root component, setup router
├── index.tsx                # Entry — ReactDOM.createRoot() + StrictMode
├── index.css                # Global styles
│
├── features/                # CORE — tổ chức theo domain, không theo loại file
│   └── [feature-name]/
│       ├── components/      # UI chỉ dùng trong feature này
│       ├── hooks/           # Hooks của feature
│       ├── services/        # IPC calls cho feature này
│       └── store/           # Zustand slice cho feature này
│
├── components/              # Shared UI components (Button, Modal, Input...)
│                            # Không chứa business logic
├── hooks/                   # Global hooks (useTheme, useWindowSize...)
├── layouts/                 # Layout components
│   └── RootLayout.tsx
├── services/                # IPC abstraction layer — wrapper window.electronAPI
│   └── ipc.ts
├── store/                   # Global Zustand store (shared state)
└── types/                   # Renderer-specific TypeScript types
```

**Ví dụ feature module** khi app lớn:

```
features/
├── editor/
│   ├── components/EditorPanel.tsx
│   ├── hooks/useAutoSave.ts
│   ├── services/editorIpc.ts   ← gọi ipcService.saveFile(...)
│   └── store/editorStore.ts
└── settings/
    ├── components/SettingsModal.tsx
    └── hooks/useSettings.ts
```

---

## 5. Trạng thái bảo mật hiện tại

Tất cả issues đã được fix ✅:

| ✅ | Chi tiết |
|----|---------|
| `contextIsolation: true` | Khai báo tường minh trong BrowserWindow |
| `sandbox: true` | Khai báo tường minh trong BrowserWindow |
| `nodeIntegration: false` | Khai báo tường minh trong BrowserWindow |
| `webviewTag: false` | Disable `<webview>` element |
| `allowRunningInsecureContent: false` | Chặn mixed content |
| `experimentalFeatures: false` | Chặn unstable Chromium features |
| Content Security Policy | Áp dụng khi `app.isPackaged` |
| Navigation guards | `will-navigate` + `setWindowOpenHandler` |
| DevTools guard | `!app.isPackaged` thay vì `NODE_ENV` |
| contextBridge | preload expose API qua function wrappers |
| Type declarations | `window.electronAPI` có đầy đủ TypeScript types |
| IpcChannelMap | Single source of truth cho IPC contracts |
| TypeScript strict | `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` |
| Path aliases | `@/` và `@shared/` trong tsconfig + vite configs |

---

## 6. React trong Renderer

### Services layer — bắt buộc khi app lớn

Không gọi `window.electronAPI.*` trực tiếp trong components. Bọc lại trong `services/ipc.ts`:

```typescript
// src/renderer/services/ipc.ts
export const ipcService = {
  ping: () => window.electronAPI.ping(),
  // saveFile: (content: string) => window.electronAPI.saveFile(content),
};
```

**Lợi ích:**
- Renderer không bị coupled vào IPC API — dễ mock khi test
- Một chỗ duy nhất để thay đổi khi preload API thay đổi
- Feature services import từ đây, không import trực tiếp `window.electronAPI`

### IPC listener trong useEffect — luôn cleanup

```tsx
useEffect(() => {
  const cleanup = window.electronAPI.onUpdateStatus((status) => {
    setStatus(status);
  });
  return cleanup; // bắt buộc — tránh memory leak và double-register trong Strict Mode
}, []);
```

**React Strict Mode** double-invoke effects để phát hiện missing cleanup — nên bật:

```tsx
// src/renderer/index.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### State management

```
Global shared state  →  Zustand store  (src/renderer/store/)
Feature-local state  →  Zustand slice   (src/renderer/features/[name]/store/)
Persistent state     →  electron-store  (main process, expose qua IPC)
Server/async state   →  TanStack Query  (nếu có external API)
```

Không dùng Redux cho app Electron quy mô vừa — Zustand đủ và nhẹ hơn nhiều.

---

## 7. Packaging & Distribution

### 7.1 Hiện tại đã có (`forge.config.ts`)

- ✅ `asar: true` — code được đóng gói, khó reverse engineer hơn
- ✅ Makers cho Windows (Squirrel), macOS (ZIP), Linux (deb, rpm)
- ✅ FusesPlugin với cấu hình bảo mật tốt

### 7.2 Thiếu — Code Signing

Chưa có code signing → OS sẽ hiện cảnh báo khi người dùng cài đặt.

```typescript
// forge.config.ts — thêm vào packagerConfig
packagerConfig: {
  asar: true,
  // macOS
  osxSign: {
    identity: process.env.APPLE_IDENTITY,
  },
  osxNotarize: {
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  },
  // Windows (dùng trong CI)
  // Cấu hình qua SIGNTOOL_PATH và certificate
},
```

### 7.3 Auto Updates

```bash
npm install electron-updater
```

```typescript
// src/main/index.ts
import { autoUpdater } from 'electron-updater';

app.on('ready', () => {
  createWindow();
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});
```

### 7.4 Lệnh build

```bash
npm run start    # Dev mode với HMR
npm run package  # Build ra thư mục out/
npm run make     # Build + tạo installers
npm run publish  # Build + upload lên GitHub Releases
```

---

## 8. Testing

### 8.1 Unit tests (Vitest)

```bash
npm install -D vitest
```

```typescript
// vite.config.test.ts
import { defineConfig } from 'vite';
export default defineConfig({
  test: { environment: 'node' },
});
```

### 8.2 E2E tests (Playwright — thay thế Spectron đã deprecated)

```bash
npm install -D @playwright/test playwright
```

```typescript
// e2e/app.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window).toHaveTitle(/my-app/);
  await app.close();
});
```

---

## 9. Bảng Anti-Patterns

| Anti-Pattern | Vấn đề | Giải pháp |
|---|---|---|
| `nodeIntegration: true` | XSS → full RCE | Giữ `false` (mặc định) |
| Expose raw `ipcRenderer` qua contextBridge | Renderer có full IPC access | Chỉ expose function wrappers cụ thể |
| `contextIsolation: false` | Renderer đọc được scope của preload | Giữ `true` (mặc định từ Electron 12) |
| Không validate args từ renderer | Injection attacks | Validate với Zod hoặc thủ công |
| Trả về raw `Error` qua IPC | Mất stack trace, message bị mất | Dùng Result type `{success, data, error}` |
| `openDevTools()` trong production | Expose internals | Chỉ mở khi `NODE_ENV === 'development'` |
| Không có CSP | Script injection | Set `Content-Security-Policy` header |
| Bind server vào `0.0.0.0` | Network-exposed | Bind vào `127.0.0.1` |
| Dùng Spectron cho testing | Deprecated, max Electron 13 | Dùng Playwright |
| Publish không sign | OS security warnings | Sign + notarize cho tất cả platform |

---

## Tài liệu tham khảo

- [Electron Security Docs](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Forge Docs](https://www.electronforge.io/)
- [Playwright Electron Support](https://playwright.dev/docs/api/class-electron)
- [electron-updater](https://www.electron.build/auto-update.html)
