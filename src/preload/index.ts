import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo, DesktopApi } from '../shared/desktop-api'

const desktopApi: DesktopApi = {
  getAppInfo: () => ipcRenderer.invoke('app:info') as Promise<AppInfo>
}

contextBridge.exposeInMainWorld('miyati', desktopApi)
