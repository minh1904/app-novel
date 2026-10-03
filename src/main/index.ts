import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  type IpcMainInvokeEvent
} from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import type { AppInfo } from '../shared/contracts/desktop-api'
import { registerLibraryHandlers } from './electron/registerIpc'
import { CHROME_COLORS, OVERLAY_TITLE_BAR, TOP_BAR_HEIGHT } from './electron/titleBar'
import { LibraryStore } from './services/library/library'

app.enableSandbox()

/**
 * No File/Edit/View menu bar: Mira is one window with its own chrome, and the default menu only
 * offered things the app already does or must not do (new window, reload mid-edit). On macOS the
 * menu lives in the system bar instead of the window, so it is left alone.
 *
 * Cut, copy, paste, undo and select-all in a text field keep working without it — Chromium handles
 * those itself. What the menu did provide are the developer shortcuts, re-bound below.
 */
const MENU_IS_IN_THE_WINDOW = process.platform !== 'darwin'

let mainWindow: BrowserWindow | null = null
let library: LibraryStore | null = null

/** Only the top frame of our own window may call the main process. */
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  return (
    mainWindow !== null &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  )
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1320,
    height: 850,
    minWidth: 940,
    minHeight: 600,
    show: false,
    title: 'Mira',
    // The installed exe carries icon.ico, but `pnpm dev` runs electron.exe, whose icon would show.
    icon,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#191919' : '#f1f1f1',
    // The page starts in the system theme (see useTheme), so the buttons start in it too and are
    // corrected through `app:chrome-theme` if the page then picks the other one.
    ...(OVERLAY_TITLE_BAR && {
      titleBarStyle: 'hidden' as const,
      titleBarOverlay: {
        ...CHROME_COLORS[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'],
        height: TOP_BAR_HEIGHT
      }
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  mainWindow = window
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  // The page holds back a close while there is typing it has not saved. Saving cannot be waited
  // for while a window is closing, so the choice is to stay or to close and lose it.
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      buttons: ['Ở lại', 'Đóng và bỏ thay đổi'],
      defaultId: 0,
      cancelId: 0,
      title: 'Có thay đổi chưa lưu',
      message: 'Bạn đã sửa văn bản của chương nhưng chưa lưu.',
      detail: 'Nếu đóng ngay, những chỗ sửa chưa lưu sẽ mất.'
    })
    if (choice === 1) event.preventDefault()
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  // The menu used to carry F12 and Ctrl+Shift+I; keep them while developing, and only then, so a
  // shipped build has no way in. Reload is deliberately not re-bound: it would drop unsaved typing.
  if (rendererUrl) {
    window.webContents.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown') return
      const devTools = input.key === 'F12' || (input.control && input.shift && input.key === 'I')
      if (devTools) window.webContents.toggleDevTools()
    })
  }

  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (MENU_IS_IN_THE_WINDOW) Menu.setApplicationMenu(null)

  try {
    library = LibraryStore.open({ dataDir: process.env.MIRA_DATA_DIR ?? app.getPath('userData') })
  } catch (error) {
    // Refusing to start is safer than running without storage; the message says what to do.
    dialog.showErrorBox(
      'Mira không mở được dữ liệu',
      error instanceof Error ? error.message : String(error)
    )
    app.exit(1)
    return
  }
  registerLibraryHandlers(library, isTrustedSender)

  ipcMain.handle('app:info', (event): AppInfo => {
    if (!isTrustedSender(event)) {
      throw new Error('Untrusted IPC sender')
    }

    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform
    }
  })

  ipcMain.handle('app:chrome-theme', (event, theme: unknown): void => {
    if (!isTrustedSender(event)) {
      throw new Error('Untrusted IPC sender')
    }
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error('Unknown chrome theme')
    }
    if (OVERLAY_TITLE_BAR) mainWindow?.setTitleBarOverlay(CHROME_COLORS[theme])
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  library?.close()
  library = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
