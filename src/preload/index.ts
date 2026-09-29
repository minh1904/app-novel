import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/channels'
import type { AppInfo, DesktopApi } from '../shared/desktop-api'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from '../shared/library'
import type { Result } from '../shared/result'

const desktopApi: DesktopApi = {
  getAppInfo: () => ipcRenderer.invoke('app:info') as Promise<AppInfo>,
  works: {
    list: () => ipcRenderer.invoke(CHANNELS.worksList) as Promise<Result<WorkList>>,
    get: (id: string) =>
      ipcRenderer.invoke(CHANNELS.worksGet, { id }) as Promise<Result<WorkSummary>>,
    create: (input: CreateWorkInput) =>
      ipcRenderer.invoke(CHANNELS.worksCreate, input) as Promise<Result<WorkSummary>>,
    update: (id: string, patch: WorkPatch) =>
      ipcRenderer.invoke(CHANNELS.worksUpdate, { id, patch }) as Promise<Result<WorkSummary>>,
    getCover: (id: string) =>
      ipcRenderer.invoke(CHANNELS.worksCoverGet, { id }) as Promise<Result<string | null>>,
    setCover: (id: string, cover: string | null) =>
      ipcRenderer.invoke(CHANNELS.worksCoverSet, { id, cover }) as Promise<Result<WorkSummary>>
  }
}

contextBridge.exposeInMainWorld('mira', desktopApi)
