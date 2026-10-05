import type {
  AddModelEntriesInput,
  ConnectionTestResult,
  ConnectionView,
  CreateConnectionInput,
  ModelEntryTestResult,
  UpdateConnectionInput,
  UpdateModelEntryInput
} from './aiConnections'
import type { ChatChunk, ChatSendInput, ChatStartResult } from './aiChat'
import type {
  AcceptProposalInput,
  AcceptProposalResult,
  ChatProposalInput,
  ChatProposalResult,
  ProposalQueueItem
} from './aiProposals'
import type { AiSessionView, AiTurnView } from './aiHistory'
import type {
  ParagraphBatchInput,
  ParagraphBatchResult,
  ParagraphFinalizeInput,
  ParagraphFinalizeResult,
  ParagraphPlanInput,
  ParagraphTranslationPlan
} from './aiTranslateProposals'
import type { BackupExported } from './backup'
import type { ChapterChange, ChapterItem, ChaptersChange } from './chapters'
import type { ExportChapterInput, ExportResult, ExportWorkInput } from './export'
import type { LinkRecord } from './links'
import type { RowSaved } from './rows'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from './library'
import type { Result } from './result'
import type { WorkspaceLoad, WorkspaceState } from './workspace'
import type { SegmentInput, TextRecord, TextSide } from './text'
import type {
  ContextEntryItem,
  ContextKind,
  ContextOrigin,
  ContextStatus,
  GlossaryComplianceReport,
  ImportNamesResult
} from './glossary'
import type {
  AddressingComplianceReport,
  AddressingDyadItem,
  AddressingDyadResolved,
  CharacterGender,
  CharacterItem,
  ParagraphAddressingCheckItem
} from './addressing'

export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

/** The two looks of the window chrome; the same two values the renderer's theme takes. */
export type ChromeTheme = 'light' | 'dark'

export interface WorksApi {
  list(): Promise<Result<WorkList>>
  get(id: string): Promise<Result<WorkSummary>>
  create(input: CreateWorkInput): Promise<Result<WorkSummary>>
  update(id: string, patch: WorkPatch): Promise<Result<WorkSummary>>
  /** The cover as a JPEG data URL, or null when the work has none. */
  getCover(id: string): Promise<Result<string | null>>
  /** Pass null to remove the cover. */
  setCover(id: string, cover: string | null): Promise<Result<WorkSummary>>
}

export interface ChaptersApi {
  list(workId: string): Promise<Result<{ chapters: ChapterItem[] }>>
  /** Appends a chapter; an empty or missing title shows as "Chương N". */
  create(workId: string, title?: string): Promise<Result<ChapterChange>>
  rename(workId: string, chapterId: string, title: string): Promise<Result<ChapterChange>>
  /** `to` is the 1-based position the chapter should end up at. */
  move(workId: string, chapterId: string, to: number): Promise<Result<ChaptersChange>>
  delete(workId: string, chapterId: string): Promise<Result<ChaptersChange>>
  /** Records the chapter as the one being worked on ("Tiếp tục" returns here). */
  open(workId: string, chapterId: string): Promise<Result<{ work: WorkSummary }>>
}

export interface TextApi {
  /** A side that was never saved reads as empty at revision 0. */
  get(workId: string, chapterId: string, side: TextSide): Promise<Result<TextRecord>>
  /** Replaces the text and its segments together; `expectedRev` is the revision last read. */
  save(
    workId: string,
    chapterId: string,
    side: TextSide,
    content: string,
    expectedRev: number,
    segments: SegmentInput[]
  ): Promise<Result<TextRecord>>
}

export interface RowsApi {
  /** The links of a chapter, which say which translated segments belong to which source segment. */
  links(workId: string, chapterId: string): Promise<Result<{ links: LinkRecord[] }>>
  /**
   * Writes the translation of one row into the chapter's translation, with its segments and link,
   * in one step. `expectedRev` is the translation revision last read. An empty text removes it.
   */
  save(
    workId: string,
    chapterId: string,
    sourceId: string,
    text: string,
    expectedRev: number
  ): Promise<Result<RowSaved>>
  /** Confirms a row: its link is fine now and has been looked at. */
  review(
    workId: string,
    chapterId: string,
    sourceId: string
  ): Promise<Result<{ links: LinkRecord[] }>>
  /** Links translated segments nobody linked to rows without a translation, in order. */
  autoPair(
    workId: string,
    chapterId: string
  ): Promise<Result<{ links: LinkRecord[]; paired: number }>>
}

export interface ImagesApi {
  /** Stores an image (a data URL) pasted or dropped into a chapter's translation; returns its ID. */
  put(workId: string, data: string): Promise<Result<{ id: string }>>
  /** The image as a data URL, or null when it no longer exists. */
  get(workId: string, imageId: string): Promise<Result<string | null>>
  delete(workId: string, imageId: string): Promise<Result<void>>
}

export interface BackupApi {
  /**
   * Opens a "save as" dialog (suggesting a file name) and writes a backup of the work there.
   * Resolves to the `cancelled` error code when the user dismisses the dialog.
   */
  export(workId: string): Promise<Result<BackupExported>>
  /** Opens a file dialog and adds the chosen backup to the library as a new work. */
  restore(): Promise<Result<WorkSummary>>
}

/** Dịch một chương theo đoạn; mỗi lô lưu đề xuất, finalize có thể tự Accept phần an toàn. */
export interface AiTranslateApi {
  paragraphPlan(input: ParagraphPlanInput): Promise<Result<ParagraphTranslationPlan>>
  paragraphBatch(input: ParagraphBatchInput): Promise<Result<ParagraphBatchResult>>
  paragraphFinalize(input: ParagraphFinalizeInput): Promise<Result<ParagraphFinalizeResult>>
}

/**
 * Hỏi AI về chỗ đang sửa. Khác `AiTranslateApi` ở chỗ một lượt **không** là một lời gọi trả kết
 * quả: `send` trả ngay một `requestId` rồi chữ về dần qua `onChunk`, và `cancel` dừng theo id đó.
 */
export interface AiChatApi {
  /** Bắt đầu một lượt. Trả `requestId` **ngay**; nội dung không bao giờ đi qua đường trả về này. */
  send(input: ChatSendInput): Promise<Result<ChatStartResult>>
  cancel(requestId: string): Promise<Result<void>>
  /**
   * Nghe từng phần của mọi lượt đang chạy. Trả về hàm bỏ đăng ký, nên chỗ gọi dọn được mà không
   * cần biết tên kênh — và `useEffect` dọn được bằng chính giá trị trả về.
   */
  onChunk(listener: (chunk: ChatChunk) => void): () => void
}

export interface AiProposalsApi {
  createFromChat(input: ChatProposalInput): Promise<Result<ChatProposalResult>>
  accept(input: AcceptProposalInput): Promise<Result<AcceptProposalResult>>
  deny(workId: string, chapterId: string, partId: string): Promise<Result<void>>
  acceptAll(
    workId: string,
    chapterId: string,
    commandId: string
  ): Promise<Result<AcceptProposalResult>>
  undo(
    workId: string,
    chapterId: string
  ): Promise<Result<{ content: string; rev: number; commandId: string }>>
  listChapter(
    workId: string,
    chapterId: string
  ): Promise<Result<{ proposals: ProposalQueueItem[]; undoAvailable: boolean }>>
  pendingCounts(
    workId: string
  ): Promise<Result<{ counts: Array<{ chapterId: string; count: number }> }>>
}

export interface AiSessionsApi {
  list(workId: string): Promise<Result<{ sessions: AiSessionView[] }>>
  turns(workId: string, sessionId: string): Promise<Result<{ turns: AiTurnView[] }>>
}

/**
 * Mục model của một kết nối: thêm, sửa, nhân bản, xóa, xếp thứ tự, và kiểm tra. Mọi lời gọi trả về kết nối đã
 * cập nhật (trừ `test`), nên giao diện thay đúng kết nối đó mà không phải tải lại cả danh sách.
 */
export interface AiModelsApi {
  /** Thêm mục vào cuối danh sách, mỗi mục một model (gõ tay được, kể cả khi endpoint không liệt kê). */
  add(connectionId: string, items: AddModelEntriesInput['items']): Promise<Result<ConnectionView>>
  /**
   * Sửa tên, tên model thật hay cài đặt. `patch.settings` là một bản vá: chỉ trường nêu thì đổi, `null` là bỏ
   * trường (về mặc định).
   */
  update(entryId: string, patch: UpdateModelEntryInput['patch']): Promise<Result<ConnectionView>>
  duplicate(entryId: string): Promise<Result<ConnectionView>>
  delete(entryId: string): Promise<Result<ConnectionView>>
  reorder(connectionId: string, ids: string[]): Promise<Result<ConnectionView>>
  /**
   * Gửi một yêu cầu nhỏ bằng đúng cài đặt **đã lưu** của mục. Thành công trả thời gian và token; thất bại là
   * một lỗi mang lời gốc của nhà cung cấp. Không đổi gì đã lưu, và có tốn một ít token.
   */
  test(entryId: string): Promise<Result<ModelEntryTestResult>>
}

export interface AiApi {
  list(): Promise<Result<{ connections: ConnectionView[] }>>
  create(input: CreateConnectionInput): Promise<Result<ConnectionView>>
  update(id: string, patch: UpdateConnectionInput['patch']): Promise<Result<ConnectionView>>
  delete(id: string): Promise<Result<{ connections: ConnectionView[] }>>
  /** Gọi `GET {base}/models`: xác nhận kết nối và lấy luôn danh sách model. */
  test(id: string): Promise<Result<ConnectionTestResult>>
  /** Lần duy nhất khóa đi từ giao diện vào; về sau chỉ nhận lại bốn ký tự cuối. */
  addKey(id: string, secret: string): Promise<Result<ConnectionView>>
  removeKey(id: string, keyId: string): Promise<Result<ConnectionView>>
  models: AiModelsApi
  translate: AiTranslateApi
  chat: AiChatApi
  proposals: AiProposalsApi
  sessions: AiSessionsApi
}

export interface GlossaryApi {
  list(options: {
    workId: string
    kind?: ContextKind
    status?: ContextStatus
    query?: string
    chapterId?: string
  }): Promise<Result<{ entries: ContextEntryItem[] }>>
  get(options: { workId: string; entryId: string }): Promise<Result<ContextEntryItem>>
  create(input: {
    workId: string
    kind?: ContextKind
    source: string
    target: string
    status?: ContextStatus
    origin?: ContextOrigin
    forbidden?: boolean
    fromChapterId?: string | null
    toChapterId?: string | null
    notes?: string | null
    aliases?: string[]
  }): Promise<Result<ContextEntryItem>>
  update(input: {
    workId: string
    entryId: string
    source?: string
    target?: string
    status?: ContextStatus
    origin?: ContextOrigin
    forbidden?: boolean
    fromChapterId?: string | null
    toChapterId?: string | null
    notes?: string | null
    aliases?: string[]
  }): Promise<Result<ContextEntryItem>>
  delete(options: { workId: string; entryId: string }): Promise<Result<void>>
  importNames(input: { workId: string; content: string }): Promise<Result<ImportNamesResult>>
  checkCompliance(input: {
    workId: string
    chapterId: string
    sourceText: string
    targetText: string
  }): Promise<Result<GlossaryComplianceReport>>
}

export interface AddressingApi {
  characters: {
    list(options: {
      workId: string
      status?: ContextStatus
      query?: string
    }): Promise<Result<{ characters: CharacterItem[] }>>
    get(options: { workId: string; characterId: string }): Promise<Result<CharacterItem>>
    create(input: {
      workId: string
      source: string
      target: string
      gender?: CharacterGender
      role?: string | null
      status?: ContextStatus
      notes?: string | null
      aliases?: string[]
    }): Promise<Result<CharacterItem>>
    update(input: {
      workId: string
      characterId: string
      source?: string
      target?: string
      gender?: CharacterGender
      role?: string | null
      status?: ContextStatus
      notes?: string | null
      aliases?: string[]
    }): Promise<Result<CharacterItem>>
    delete(options: { workId: string; characterId: string }): Promise<Result<void>>
  }
  dyads: {
    list(options: {
      workId: string
      chapterId?: string
      status?: ContextStatus
    }): Promise<Result<{ dyads: AddressingDyadItem[] }>>
    get(options: { workId: string; dyadId: string }): Promise<Result<AddressingDyadItem>>
    set(input: {
      workId: string
      dyadId?: string
      sourceCharacterId: string
      targetCharacterId: string
      speakerPronoun: string
      recipientPronoun: string
      formality?: string | null
      fromChapterId?: string | null
      toChapterId?: string | null
      status?: ContextStatus
      notes?: string | null
    }): Promise<Result<AddressingDyadItem>>
    delete(options: { workId: string; dyadId: string }): Promise<Result<void>>
    effective(options: {
      workId: string
      chapterId: string
    }): Promise<Result<{ dyads: AddressingDyadResolved[] }>>
  }
  checkCompliance(input: {
    workId: string
    chapterId: string
    paragraphs: (string | ParagraphAddressingCheckItem)[]
  }): Promise<Result<AddressingComplianceReport>>
}

export interface ExportApi {
  exportChapter(input: ExportChapterInput): Promise<Result<ExportResult>>
  exportWork(input: ExportWorkInput): Promise<Result<ExportResult>>
}

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>
  /**
   * Tells the window which colours its minimise/maximise/close buttons should wear. The OS draws
   * them over the page's own top bar, so they have to follow the page's theme to look like part of it.
   */
  setChromeTheme(theme: ChromeTheme): Promise<void>
  works: WorksApi
  workspace: {
    load(): Promise<Result<WorkspaceLoad>>
    save(state: WorkspaceState): Promise<Result<void>>
  }
  chapters: ChaptersApi
  text: TextApi
  rows: RowsApi
  images: ImagesApi
  backup: BackupApi
  ai: AiApi
  glossary: GlossaryApi
  addressing: AddressingApi
  export: ExportApi
}
