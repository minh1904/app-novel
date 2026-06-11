# Quyết Định Tech Stack

---

## Decision Summary

| Tầng | Lựa Chọn | Lý do |
|------|----------|-------|
| Desktop runtime | Electron 42 | Chromium renderer + Node.js main, ecosystem lớn |
| Packaging | Electron Forge | First-party Electron tooling, tích hợp code signing |
| Build | Vite 5 + @electron-forge/plugin-vite | HMR <1s, unified config cho main/preload/renderer |
| UI | React 19 | Concurrent features, Strict Mode phát hiện IPC leak |
| Styling | Tailwind CSS v4 | Utility-first, không cần config file, build-time CSS |
| Language | TypeScript | Type-safe IPC contracts, refactor an toàn |
| Security | contextBridge + sandbox | Ngăn XSS leo thang thành RCE |

---

## Mô Hình 3 Process

```
┌─────────────────────────────────────┐
│  Main Process  (Node.js full access) │
│  src/main/index.ts                   │
│  - Tạo BrowserWindow                 │
│  - Truy cập filesystem, OS APIs      │
│  - Đăng ký IPC handlers              │
└──────────────────┬──────────────────┘
                   │ ipcMain.handle / ipcRenderer.invoke
┌──────────────────▼──────────────────┐
│  Preload Script  (sandboxed bridge)  │
│  src/preload/index.ts                │
│  - contextBridge.exposeInMainWorld() │
│  - Ranh giới bảo mật duy nhất        │
└──────────────────┬──────────────────┘
                   │ window.electronAPI.*
┌──────────────────▼──────────────────┐
│  Renderer Process  (Chromium, web)   │
│  src/renderer/                       │
│  - React app thuần                   │
│  - Không có Node.js access           │
│  - Giao tiếp qua services/ipc.ts     │
└─────────────────────────────────────┘
```

---

## Cấu Trúc Thư Mục

```
src/
  main/                 # Main process
    index.ts
    ipc/                # IPC handlers, tách theo domain
      index.ts          # Đăng ký tất cả handlers
  preload/
    index.ts            # contextBridge
    index.d.ts          # TypeScript types cho window.electronAPI
  renderer/             # React app
    App.tsx
    index.tsx
    index.css
    features/           # Domain modules
    services/           # IPC abstraction layer
      ipc.ts
    components/         # Shared UI primitives
    layouts/
    hooks/
    store/
    types/
  shared/               # Dùng chung giữa các process
    types.ts            # IpcResult<T>, enums, constants
                        # KHÔNG import electron hay Node built-ins
```

---

## Bảo Mật — Bắt Buộc

### BrowserWindow — 6 flags

```typescript
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,              // mặc định true từ Electron 12
    sandbox: true,                       // mặc định true từ Electron 20
    nodeIntegration: false,              // mặc định false
    webviewTag: false,                   // disable <webview> element
    allowRunningInsecureContent: false,  // chặn mixed content
    experimentalFeatures: false,         // chặn unstable Chromium features
  },
});
```

### Content Security Policy

Áp dụng khi packaged — dev server dùng origin khác (`localhost`):

```typescript
if (app.isPackaged) {
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:",
        ],
      },
    });
  });
}
```

### Navigation Guards

Chặn navigation ra ngoài app và cấm mở cửa sổ mới:

```typescript
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedProtocols = app.isPackaged ? ['file:'] : ['file:', 'http:', 'https:'];
    const { protocol } = new URL(url);
    if (!allowedProtocols.includes(protocol)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
```

### DevTools Guard

```typescript
// Dùng app.isPackaged — đáng tin cậy hơn NODE_ENV khi package
if (!app.isPackaged) {
  mainWindow.webContents.openDevTools();
}
```

| Nếu vi phạm | Hậu quả |
|-------------|---------|
| `nodeIntegration: true` | XSS trong renderer → full Remote Code Execution |
| Expose raw `ipcRenderer` | Renderer gọi bất kỳ IPC channel nào |
| `contextIsolation: false` | Renderer đọc scope của preload |
| Không có navigation guard | Renderer có thể navigate đến URL tùy ý |
| Không có CSP | Script injection trong renderer |

---

## IPC — Typed Channel Map Pattern

Dùng `invoke/handle` cho request-response. `IpcChannelMap` trong `src/shared/types.ts` là single source of truth — type error propagate từ main handler đến renderer call:

```typescript
// src/shared/types.ts
export type IpcChannelMap = {
  'ping': { args: []; return: string };
  'story:create': { args: [input: CreateStoryInput]; return: IpcResult<Story> };
};
```

```typescript
// src/preload/index.ts — typed invoke tham chiếu IpcChannelMap
function typedInvoke<K extends keyof IpcChannelMap>(
  channel: K,
  ...args: IpcChannelMap[K]['args']
): Promise<IpcChannelMap[K]['return']> {
  return ipcRenderer.invoke(channel, ...args);
}
```

```typescript
// src/main/ipc/*.ts — handler tự động type từ IpcChannelMap
ipcMain.handle('story:create', async (_event, input: CreateStoryInput) => {
  return storyService.create(input); // phải trả IpcResult<Story>
});
```

Lỗi cross-IPC dùng `IpcResult<T>` từ `src/shared/types.ts`:
```typescript
type IpcResult<T> = { success: true; data: T } | { success: false; error: string };
```

---

## Electron Forge Fuses (đã cấu hình)

| Fuse | Giá trị | Bảo vệ gì |
|------|---------|-----------|
| `RunAsNode` | `false` | Chặn `--inspect` mode |
| `EnableCookieEncryption` | `true` | Mã hóa cookie store |
| `EnableNodeOptionsEnvironmentVariable` | `false` | Chặn `NODE_OPTIONS` injection |
| `EnableEmbeddedAsarIntegrityValidation` | `true` | Kiểm tra tính toàn vẹn ASAR |
| `OnlyLoadAppFromAsar` | `true` | Chỉ load code từ ASAR đã ký |

---

## Tại Sao Electron Forge (không phải electron-builder)

| | Electron Forge | electron-builder |
|---|---|---|
| Tích hợp Vite | Plugin first-party | Cấu hình phức tạp hơn |
| Code signing | Tích hợp sẵn | Cần cấu hình riêng |
| Fuses | Plugin chính thức | Không có |
| Bảo trì | Electron team | Community |
