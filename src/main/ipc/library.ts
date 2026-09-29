import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { CHANNELS } from '../../shared/channels'
import type { LibraryStore } from '../storage/library'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

export function registerLibraryHandlers(
  library: LibraryStore,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
): void {
  const handlers = guardHandlers(createLibraryHandlers(library), isTrustedSender)
  for (const channel of Object.values(CHANNELS)) {
    ipcMain.handle(channel, (event, raw: unknown) => handlers[channel](event, raw))
  }
}
