import type { BackupExported } from './backup'
import type { ChapterChange, ChapterItem, ChaptersChange } from './chapters'
import type { LinkRecord } from './links'
import type { RowSaved } from './rows'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from './library'
import type { Result } from './result'
import type { SegmentInput, TextRecord, TextSide } from './text'

export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

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

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>
  works: WorksApi
  chapters: ChaptersApi
  text: TextApi
  rows: RowsApi
  images: ImagesApi
  backup: BackupApi
}
