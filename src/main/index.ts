import {
  app,
  BrowserWindow,
  shell,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  type IpcMainInvokeEvent
} from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { isAllowedExternalLink } from '../shared/contracts/aiProviders'
import type { AppInfo, ChromeTheme } from '../shared/contracts/desktopApi'
import { registerLibraryHandlers } from './electron/registerIpc'
import {
  BOOT_BACKGROUND,
  CHROME_COLORS,
  OVERLAY_TITLE_BAR,
  TOP_BAR_HEIGHT
} from './electron/titleBar'
import { pinZoom } from './electron/zoom'
import { LibraryStore } from './services/library/library'

app.enableSandbox()
// Cuộn chuột và touchpad mượt mà thay vì nhảy từng nấc, bất kể cài đặt "smooth-scroll"
// của Windows như thế nào. Chromium đọc cờ lệnh trước khi ứng dụng sẵn sàng nên cờ này đặt ở đây.
app.commandLine.appendSwitch('enable-smooth-scrolling')

/**
 * Không dùng thanh menu File/Edit/View: Mira là ứng dụng một cửa sổ với giao diện riêng, và menu mặc định
 * chỉ cung cấp những thứ ứng dụng đã có hoặc không được phép làm (mở cửa sổ mới, tải lại trang khi đang sửa).
 * Trên macOS, thanh menu nằm trên thanh hệ thống thay vì trong cửa sổ nên được giữ nguyên.
 *
 * Các thao tác cắt, sao chép, dán, hoàn tác và chọn tất cả trong ô nhập văn bản vẫn hoạt động bình thường
 * vì Chromium tự xử lý. Menu trước đây chỉ cung cấp các phím tắt cho nhà phát triển, được gán lại bên dưới.
 */
const MENU_IS_IN_THE_WINDOW = process.platform !== 'darwin'

let mainWindow: BrowserWindow | null = null
let library: LibraryStore | null = null
let stopServices: (() => void) | null = null

/** Nơi lưu trữ thư viện; `MIRA_DATA_DIR` dùng để trỏ đến thư mục khác khi chạy test hoặc Lab. */
const dataDir = (): string => process.env.MIRA_DATA_DIR ?? app.getPath('userData')

/**
 * Theme mà trang báo về gần nhất, dùng cho màu của các nút cửa sổ. Cửa sổ mới bắt đầu theo theme hệ thống,
 * tương tự như trang giao diện khởi động.
 */
let chromeTheme: ChromeTheme = 'dark'

/** Chỉ khung hình trên cùng (top frame) của cửa sổ ứng dụng mới được phép gọi tiến trình main. */
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  return (
    mainWindow !== null &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  )
}

function createWindow(): void {
  chromeTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  const window = new BrowserWindow({
    width: 1320,
    height: 850,
    minWidth: 940,
    minHeight: 600,
    show: false,
    title: 'Mira',
    // Bản cài đặt mang icon.ico, nhưng `pnpm dev` chạy electron.exe nên icon này sẽ hiển thị icon tương ứng.
    icon,
    backgroundColor: BOOT_BACKGROUND[chromeTheme],
    // Trang bắt đầu với theme hệ thống nên các nút cũng bắt đầu theo đó, sau đó được
    // cập nhật qua `app:chrome-theme` nếu trang chọn theme khác.
    ...(OVERLAY_TITLE_BAR && {
      titleBarStyle: 'hidden' as const,
      titleBarOverlay: {
        ...CHROME_COLORS[chromeTheme],
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
  pinZoom(window.webContents)
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  // Trang chặn đóng cửa sổ khi có nội dung đang gõ chưa được lưu. Không thể chờ lưu
  // trong khi cửa sổ đang đóng, nên người dùng phải chọn ở lại hoặc đóng và chấp nhận mất thay đổi.
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      buttons: ['Ở lại', 'Đóng và bỏ thay đổi'],
      defaultId: 0,
      cancelId: 0,
      title: 'Có thay đổi chưa lưu',
      message: 'Một hoặc nhiều chương đang có thay đổi chưa lưu.',
      detail: 'Nếu đóng ngay, các chỗ sửa chưa lưu trong mọi tab sẽ mất.'
    })
    if (choice === 1) event.preventDefault()
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  // Menu trước đây chứa F12 và Ctrl+Shift+I; chỉ giữ lại khi đang ở môi trường phát triển, để bản
  // đóng gói thương mại không mở được DevTools. Tải lại trang (Reload) cố ý không gán lại để tránh mất dữ liệu chưa lưu.
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
    library = LibraryStore.open({ dataDir: dataDir() })
  } catch (error) {
    // Từ chối khởi động sẽ an toàn hơn là chạy mà không có bộ lưu trữ; thông báo sẽ hướng dẫn cần làm gì.
    dialog.showErrorBox(
      'Mira không mở được dữ liệu',
      error instanceof Error ? error.message : String(error)
    )
    app.exit(1)
    return
  }
  stopServices = registerLibraryHandlers(library, isTrustedSender)

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

  // Trang lấy khóa API của nhà cung cấp, mở trong trình duyệt. Chỉ cho phép liên kết https đến các máy chủ trong danh sách.
  ipcMain.handle('app:open-external', async (event, url: unknown): Promise<void> => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender')
    if (typeof url !== 'string' || !isAllowedExternalLink(url)) throw new Error('Link not allowed')
    await shell.openExternal(url)
  })

  ipcMain.handle('app:chrome-theme', (event, theme: unknown): void => {
    if (!isTrustedSender(event)) {
      throw new Error('Untrusted IPC sender')
    }
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error('Unknown chrome theme')
    }
    chromeTheme = theme
    if (OVERLAY_TITLE_BAR) mainWindow?.setTitleBarOverlay(CHROME_COLORS[theme])
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  stopServices?.()
  stopServices = null
  library?.close()
  library = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
