import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { CHANNELS } from '../../shared/channels'
import type { LibraryStore } from '../storage/library'
import type { FilePicker } from './filePicker'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const MIRA_FILTER = { name: 'Tác phẩm Mira', extensions: ['mira'] }

/** The real dialogs, parented to the main window so they stay on top of it. */
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

export function registerLibraryHandlers(
  library: LibraryStore,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
): void {
  const handlers = guardHandlers(
    createLibraryHandlers(library, electronFilePicker()),
    isTrustedSender
  )
  for (const channel of Object.values(CHANNELS)) {
    ipcMain.handle(channel, (event, raw: unknown) => handlers[channel](event, raw))
  }
}
