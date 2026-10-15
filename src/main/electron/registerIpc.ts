import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CHANNELS, EVENT_CHANNELS } from '../../shared/contracts/channels'
import { createServices } from '../services/createServices'
import { electronFetch } from './netFetch'
import { electronSafeStorage } from './safeStorage'
import type { LibraryStore } from '../services/library/library'
import type { FilePicker } from '../ipc/filePicker'
import { createLibraryHandlers, guardHandlers } from '../ipc/libraryHandlers'
import type { WindowBroadcast } from '../ipc/handler'
import { electronExportFilePicker, electronPdfPrinter } from './exportElectron'
import { ExportService } from '../services/export/exportService'

const MIRA_FILTER = { name: 'Tác phẩm Mira', extensions: ['mira'] }

/** Các hộp thoại thật của hệ thống, gắn với cửa sổ chính để luôn hiển thị phía trên. */
function electronFilePicker(): FilePicker {
  const parent = (): BrowserWindow | undefined =>
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  return {
    async chooseSavePath(suggestedName) {
      const options = {
        title: 'Sao lưu tác phẩm',
        defaultPath: join(app.getPath('documents'), suggestedName),
        filters: [MIRA_FILTER]
      }
      const window = parent()
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options)
      return result.canceled || !result.filePath ? null : result.filePath
    },
    async chooseOpenPath() {
      const options = {
        title: 'Mở tác phẩm có sẵn',
        properties: ['openFile' as const],
        filters: [MIRA_FILTER]
      }
      const window = parent()
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
    }
  }
}

/** Mọi cửa sổ đang mở: lượt Trợ lý thuộc Main nên mọi cửa sổ đều nhận sự kiện của nó. */
function electronWindows(): WindowBroadcast {
  return {
    send(channel, payload) {
      const reached: number[] = []
      for (const window of BrowserWindow.getAllWindows()) {
        const contents = window.webContents
        if (contents.isDestroyed()) continue
        contents.send(channel, payload)
        reached.push(contents.id)
      }
      return reached
    },
    onClosed(callback) {
      const watch = (window: BrowserWindow) => {
        const id = window.webContents.id
        window.webContents.once('destroyed', () => callback(id))
      }
      for (const window of BrowserWindow.getAllWindows()) watch(window)
      app.on('browser-window-created', (_event, window) => watch(window))
    }
  }
}

export function registerLibraryHandlers(
  library: LibraryStore,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
): () => void {
  const { connections, translator, paragraphTranslator, chat, sources, agent, tasks } =
    createServices({
      library,
      crypto: electronSafeStorage,
      fetch: electronFetch,
      userAgent: 'Mira/' + app.getVersion(),
      // Dịch vụ đăng nhập tự kiểm tra host (auth.openai.com, github.com) trước khi yêu cầu mở URL này.
      openExternal: (url) => shell.openExternal(url)
    })
  const exportService = new ExportService(
    library,
    electronExportFilePicker(),
    electronPdfPrinter(),
    writeFile,
    // Nếu là thư mục (xuất mỗi chương một tệp) thì mở thư mục; nếu là tệp thì hiển thị và chọn tệp trong thư mục.
    (path) => {
      if (statSync(path, { throwIfNoEntry: false })?.isDirectory()) void shell.openPath(path)
      else shell.showItemInFolder(path)
    }
  )
  const windows = electronWindows()
  windows.onClosed((id) => agent.windowClosed(id))
  // Tasks have no window that asked: their write intents and changes go to every window.
  tasks.connect({
    publishIntent: (intent) => windows.send(EVENT_CHANNELS.agentTargetWriteIntent, intent),
    changed: (event) => {
      windows.send(EVENT_CHANNELS.agentTaskChanged, event)
    },
    targetChanged: (event) => windows.send(EVENT_CHANNELS.agentTargetChanged, event)
  })
  const handlers = guardHandlers(
    createLibraryHandlers(
      library,
      electronFilePicker(),
      connections,
      translator,
      chat,
      undefined,
      undefined,
      paragraphTranslator,
      exportService,
      sources,
      agent,
      windows,
      tasks
    ),
    isTrustedSender,
    // `event.sender` là cửa sổ đã gọi, nên chunk về đúng chỗ hỏi. Khai hẹp lại thành `ChunkSink` để
    // tầng handler không phải import Electron và test được không cần một cửa sổ thật.
    (event) => ({
      send: (channel, payload) => event.sender.send(channel, payload),
      isDestroyed: () => event.sender.isDestroyed(),
      onDestroyed: (callback) => event.sender.once('destroyed', callback),
      senderId: event.sender.id
    })
  )
  for (const channel of Object.values(CHANNELS)) {
    ipcMain.handle(channel, (event, raw: unknown) => handlers[channel](event, raw))
  }
  // Tasks first: they write paused(app_closed) while the library is still open.
  return () => {
    tasks.shutdown()
    agent.shutdown()
  }
}
