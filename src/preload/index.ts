import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/channels'
import type { ChapterChange, ChapterItem, ChaptersChange } from '../shared/chapters'
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
  },
  chapters: {
    list: (workId: string) =>
      ipcRenderer.invoke(CHANNELS.chaptersList, { workId }) as Promise<
        Result<{ chapters: ChapterItem[] }>
      >,
    create: (workId: string, title?: string) =>
      ipcRenderer.invoke(CHANNELS.chaptersCreate, { workId, title }) as Promise<
        Result<ChapterChange>
      >,
    rename: (workId: string, chapterId: string, title: string) =>
      ipcRenderer.invoke(CHANNELS.chaptersRename, { workId, chapterId, title }) as Promise<
        Result<ChapterChange>
      >,
    move: (workId: string, chapterId: string, to: number) =>
      ipcRenderer.invoke(CHANNELS.chaptersMove, { workId, chapterId, to }) as Promise<
        Result<ChaptersChange>
      >,
    delete: (workId: string, chapterId: string) =>
      ipcRenderer.invoke(CHANNELS.chaptersDelete, { workId, chapterId }) as Promise<
        Result<ChaptersChange>
      >,
    open: (workId: string, chapterId: string) =>
      ipcRenderer.invoke(CHANNELS.chaptersOpen, { workId, chapterId }) as Promise<
        Result<{ work: WorkSummary }>
      >
  }
}

contextBridge.exposeInMainWorld('mira', desktopApi)
