import path from 'node:path';
import { app, BrowserWindow, Menu } from 'electron';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './ipc';

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 520,
    frame: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // CSP chỉ áp dụng khi packaged — dev server dùng origin khác (localhost)
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // DevTools: mở thủ công bằng Ctrl+Shift+I khi cần
};

// Chặn navigation ra ngoài app và cấm mở cửa sổ mới
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Dev mode cho phép http/https (Vite dev server); production chỉ file:
    const allowedProtocols = app.isPackaged ? ['file:'] : ['file:', 'http:', 'https:'];
    const { protocol } = new URL(url);
    if (!allowedProtocols.includes(protocol)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app.on('ready', () => {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
