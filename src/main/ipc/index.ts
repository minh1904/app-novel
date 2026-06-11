import { ipcMain } from 'electron';

export function registerIpcHandlers(): void {
  // Add IPC handlers here as the app grows
  // Example:
  // ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('ping', () => 'pong');
}
