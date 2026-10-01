import type { ChapterChange, ChapterItem, ChaptersChange } from './chapters'
import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from './library'
import type { Result } from './result'

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

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>
  works: WorksApi
  chapters: ChaptersApi
}
