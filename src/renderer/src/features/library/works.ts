import type { WorkSummary } from '../../../../shared/library'

export type SourceLanguage = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'

export type WorkStatus = 'not-started' | 'in-progress' | 'paused'

export interface ChapterRef {
  number: number
  title: string
  /** Last translated line the translator touched. Absent until the editor records one. */
  excerpt?: string
}

export interface Work {
  id: string
  title: string
  originalTitle?: string
  description?: string
  /** Optional cover image; the source-language mark stands in when it is missing. */
  coverUrl?: string
  sourceLanguage: SourceLanguage
  chapterCount: number
  status: WorkStatus
  archived: boolean
  updatedAt: Date
  lastChapter?: ChapterRef
}

export const languages: Record<SourceLanguage, { name: string; short: string; glyph: string }> = {
  en: { name: 'Tiếng Anh', short: 'Anh', glyph: 'Aa' },
  'zh-Hans': { name: 'Tiếng Trung giản thể', short: 'Trung giản thể', glyph: '简' },
  'zh-Hant': { name: 'Tiếng Trung phồn thể', short: 'Trung phồn thể', glyph: '繁' },
  ja: { name: 'Tiếng Nhật', short: 'Nhật', glyph: 'あ' }
}

export const statusLabels: Record<WorkStatus, string> = {
  'not-started': 'Chưa bắt đầu',
  'in-progress': 'Đang dịch',
  paused: 'Tạm dừng'
}

export function workProgressLabel(work: Work): string {
  const status = statusLabels[work.status]
  return work.lastChapter ? status + ' · Chương ' + work.lastChapter.number : status
}

export const RECENT_DAYS = 7

export function isRecent(work: Work, now = Date.now()): boolean {
  return !work.archived && now - work.updatedAt.getTime() <= RECENT_DAYS * 24 * 60 * 60 * 1000
}

export function byUpdated(a: Work, b: Work): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

/** Converts a work as stored by the main process into the shape the screens use. */
export function toWork(summary: WorkSummary): Work {
  return {
    id: summary.id,
    title: summary.title,
    originalTitle: summary.originalTitle ?? undefined,
    description: summary.description ?? undefined,
    sourceLanguage: summary.sourceLang,
    chapterCount: summary.chapterCount,
    status: summary.status,
    archived: summary.archived,
    updatedAt: new Date(summary.updatedAt),
    lastChapter: summary.lastChapter
      ? { number: summary.lastChapter.number, title: summary.lastChapter.title }
      : undefined
  }
}
