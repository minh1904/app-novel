import { app, BrowserWindow, dialog, ipcMain, nativeTheme, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import type { AppInfo } from '../shared/desktop-api'
import { registerLibraryHandlers } from './ipc/library'
import { LibraryStore } from './storage/library'

app.enableSandbox()

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
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#191919' : '#f1f1f1',
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

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
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
