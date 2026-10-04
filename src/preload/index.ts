import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ChatChunk, ChatSendInput } from '../shared/contracts/aiChat'
import type {
  AddModelEntriesInput,
  ConnectionTestResult,
  ConnectionView,
  CreateConnectionInput,
  ModelEntryTestResult,
  UpdateConnectionInput,
  UpdateModelEntryInput
} from '../shared/contracts/aiConnections'
import type {
  TranslateBatchInput,
  TranslateBatchResult,
  TranslatePlan,
  TranslatePlanInput
} from '../shared/contracts/aiTranslate'
import type { BackupExported } from '../shared/contracts/backup'
import { CHANNELS, EVENT_CHANNELS } from '../shared/contracts/channels'
import type { ChapterChange, ChapterItem, ChaptersChange } from '../shared/contracts/chapters'
import type { AppInfo, ChromeTheme, DesktopApi } from '../shared/contracts/desktop-api'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from '../shared/contracts/library'
import type { LinkRecord } from '../shared/contracts/links'
import type { Result } from '../shared/contracts/result'
import type { RowSaved } from '../shared/contracts/rows'
import type { SegmentInput, TextRecord, TextSide } from '../shared/contracts/text'
import type { ContextEntryItem, ImportNamesResult } from '../shared/contracts/glossary'
import type { GlossaryComplianceReport } from '../shared/algorithms/glossaryCompliance'

const desktopApi: DesktopApi = {
  getAppInfo: () => ipcRenderer.invoke('app:info') as Promise<AppInfo>,
  setChromeTheme: (theme: ChromeTheme) =>
    ipcRenderer.invoke('app:chrome-theme', theme) as Promise<void>,
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
  },
  ai: {
    list: () =>
      ipcRenderer.invoke(CHANNELS.aiConnectionsList) as Promise<
        Result<{ connections: ConnectionView[] }>
      >,
    create: (input: CreateConnectionInput) =>
      ipcRenderer.invoke(CHANNELS.aiConnectionsCreate, input) as Promise<Result<ConnectionView>>,
    update: (id: string, patch: UpdateConnectionInput['patch']) =>
      ipcRenderer.invoke(CHANNELS.aiConnectionsUpdate, { id, patch }) as Promise<
        Result<ConnectionView>
      >,
    delete: (id: string) =>
      ipcRenderer.invoke(CHANNELS.aiConnectionsDelete, { id }) as Promise<
        Result<{ connections: ConnectionView[] }>
      >,
    test: (id: string) =>
      ipcRenderer.invoke(CHANNELS.aiConnectionsTest, { id }) as Promise<
        Result<ConnectionTestResult>
      >,
    addKey: (id: string, secret: string) =>
      ipcRenderer.invoke(CHANNELS.aiKeysAdd, { id, secret }) as Promise<Result<ConnectionView>>,
    removeKey: (id: string, keyId: string) =>
      ipcRenderer.invoke(CHANNELS.aiKeysRemove, { id, keyId }) as Promise<Result<ConnectionView>>,
    models: {
      add: (connectionId: string, items: AddModelEntriesInput['items']) =>
        ipcRenderer.invoke(CHANNELS.aiModelsAdd, { connectionId, items }) as Promise<
          Result<ConnectionView>
        >,
      update: (entryId: string, patch: UpdateModelEntryInput['patch']) =>
        ipcRenderer.invoke(CHANNELS.aiModelsUpdate, { entryId, patch }) as Promise<
          Result<ConnectionView>
        >,
      duplicate: (entryId: string) =>
        ipcRenderer.invoke(CHANNELS.aiModelsDuplicate, { entryId }) as Promise<
          Result<ConnectionView>
        >,
      delete: (entryId: string) =>
        ipcRenderer.invoke(CHANNELS.aiModelsDelete, { entryId }) as Promise<Result<ConnectionView>>,
      reorder: (connectionId: string, ids: string[]) =>
        ipcRenderer.invoke(CHANNELS.aiModelsReorder, { connectionId, ids }) as Promise<
          Result<ConnectionView>
        >,
      test: (entryId: string) =>
        ipcRenderer.invoke(CHANNELS.aiModelsTest, { entryId }) as Promise<
          Result<ModelEntryTestResult>
        >
    },
    translate: {
      plan: (input: TranslatePlanInput) =>
        ipcRenderer.invoke(CHANNELS.aiTranslatePlan, input) as Promise<Result<TranslatePlan>>,
      batch: (input: TranslateBatchInput) =>
        ipcRenderer.invoke(CHANNELS.aiTranslateBatch, input) as Promise<
          Result<TranslateBatchResult>
        >
    },
    chat: {
      send: (input: ChatSendInput) =>
        ipcRenderer.invoke(CHANNELS.aiChatSend, input) as Promise<Result<{ requestId: string }>>,
      cancel: (requestId: string) =>
        ipcRenderer.invoke(CHANNELS.aiChatCancel, { requestId }) as Promise<Result<void>>,
      /**
       * Tên kênh **đóng cứng ở đây**, không nhận từ renderer: phơi một `on(channel, cb)` tổng quát
       * là mở cho renderer nghe mọi thứ main gửi, đúng thứ `contextIsolation` tồn tại để chặn.
       */
      onChunk: (listener: (chunk: ChatChunk) => void) => {
        const handler = (_event: IpcRendererEvent, chunk: ChatChunk): void => listener(chunk)
        ipcRenderer.on(EVENT_CHANNELS.aiChatChunk, handler)
        return () => ipcRenderer.off(EVENT_CHANNELS.aiChatChunk, handler)
      }
    }
  },
  glossary: {
    list: (options) =>
      ipcRenderer.invoke(CHANNELS.glossaryList, options) as Promise<
        Result<{ entries: ContextEntryItem[] }>
      >,
    get: (options) =>
      ipcRenderer.invoke(CHANNELS.glossaryGet, options) as Promise<Result<ContextEntryItem>>,
    create: (input) =>
      ipcRenderer.invoke(CHANNELS.glossaryCreate, input) as Promise<Result<ContextEntryItem>>,
    update: (input) =>
      ipcRenderer.invoke(CHANNELS.glossaryUpdate, input) as Promise<Result<ContextEntryItem>>,
    delete: (options) =>
      ipcRenderer.invoke(CHANNELS.glossaryDelete, options) as Promise<Result<void>>,
    importNames: (input) =>
      ipcRenderer.invoke(CHANNELS.glossaryImportNames, input) as Promise<
        Result<ImportNamesResult>
      >,
    checkCompliance: (input) =>
      ipcRenderer.invoke(CHANNELS.glossaryCheckCompliance, input) as Promise<
        Result<GlossaryComplianceReport>
      >
  }
}

contextBridge.exposeInMainWorld('mira', desktopApi)
