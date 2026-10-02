import { contextBridge, ipcRenderer } from 'electron'
import type { BackupExported } from '../shared/backup'
import { CHANNELS } from '../shared/channels'
import type { ChapterChange, ChapterItem, ChaptersChange } from '../shared/chapters'
import type { AppInfo, DesktopApi } from '../shared/desktop-api'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from '../shared/library'
import type { LinkRecord } from '../shared/links'
import type { Result } from '../shared/result'
import type { RowSaved } from '../shared/rows'
import type { SegmentInput, TextRecord, TextSide } from '../shared/text'

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
  },
  text: {
    get: (workId: string, chapterId: string, side: TextSide) =>
      ipcRenderer.invoke(CHANNELS.textGet, { workId, chapterId, side }) as Promise<
        Result<TextRecord>
      >,
    save: (
      workId: string,
      chapterId: string,
      side: TextSide,
      content: string,
      expectedRev: number,
      segments: SegmentInput[]
    ) =>
      ipcRenderer.invoke(CHANNELS.textSave, {
        workId,
        chapterId,
        side,
        content,
        expectedRev,
        segments
      }) as Promise<Result<TextRecord>>
  },
  rows: {
    links: (workId: string, chapterId: string) =>
      ipcRenderer.invoke(CHANNELS.linksList, { workId, chapterId }) as Promise<
        Result<{ links: LinkRecord[] }>
      >,
    save: (
      workId: string,
      chapterId: string,
      sourceId: string,
      text: string,
      expectedRev: number
    ) =>
      ipcRenderer.invoke(CHANNELS.rowSave, {
        workId,
        chapterId,
        sourceId,
        text,
        expectedRev
      }) as Promise<Result<RowSaved>>,
    review: (workId: string, chapterId: string, sourceId: string) =>
      ipcRenderer.invoke(CHANNELS.rowReview, { workId, chapterId, sourceId }) as Promise<
        Result<{ links: LinkRecord[] }>
      >,
    autoPair: (workId: string, chapterId: string) =>
      ipcRenderer.invoke(CHANNELS.rowsAutoPair, { workId, chapterId }) as Promise<
        Result<{ links: LinkRecord[]; paired: number }>
      >
  },
  images: {
    put: (workId: string, data: string) =>
      ipcRenderer.invoke(CHANNELS.imagesPut, { workId, data }) as Promise<Result<{ id: string }>>,
    get: (workId: string, imageId: string) =>
      ipcRenderer.invoke(CHANNELS.imagesGet, { workId, imageId }) as Promise<Result<string | null>>,
    delete: (workId: string, imageId: string) =>
      ipcRenderer.invoke(CHANNELS.imagesDelete, { workId, imageId }) as Promise<Result<void>>
  },
  backup: {
    export: (workId: string) =>
      ipcRenderer.invoke(CHANNELS.backupExport, { workId }) as Promise<Result<BackupExported>>,
    restore: () => ipcRenderer.invoke(CHANNELS.backupRestore) as Promise<Result<WorkSummary>>
  }
}

contextBridge.exposeInMainWorld('mira', desktopApi)
