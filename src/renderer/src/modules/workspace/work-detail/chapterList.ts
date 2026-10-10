import type { ChapterItem } from '../../../../../shared/contracts/chapters'

/** Pure rules of the chapter list: names, search, jumping and paging. No React, no IPC. */

export const PAGE_SIZES = [50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 50

/** What the list shows for a chapter: its name, or "Chương N" when it has none. */
export function displayTitle(chapter: Pick<ChapterItem, 'number' | 'title'>): string {
  return chapter.title === '' ? 'Chương ' + chapter.number : chapter.title
}

/** The heading of the chapter screen: "Chương N: name", unless the name already starts with "Chương". */
export function headingTitle(chapter: Pick<ChapterItem, 'number' | 'title'>): string {
  if (chapter.title === '' || /^chương\s/i.test(chapter.title)) return displayTitle(chapter)
  return 'Chương ' + chapter.number + ': ' + chapter.title
}

/** Lower-cases and strips Vietnamese tone and vowel marks, so "gap go" finds "Cuộc gặp gỡ". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/** What deleting a chapter would destroy beyond its name, or null when it holds no text. */
export function lossNote(chapter: Pick<ChapterItem, 'hasSource' | 'hasTarget'>): string | null {
  if (chapter.hasSource && chapter.hasTarget) {
    return 'Chương này có cả bản gốc lẫn bản dịch; cả hai sẽ mất.'
  }
  if (chapter.hasSource) return 'Chương này có bản gốc; bản gốc sẽ mất.'
  if (chapter.hasTarget) return 'Chương này có bản dịch; bản dịch sẽ mất.'
  return null
}

/**
 * How far a chapter has come, from whether its texts are empty. A translation without a source
 * still counts as "no source": the source is what the chapter is translated from.
 */
export type ChapterState = 'translated' | 'untranslated' | 'empty'

export const chapterStateLabels: Record<ChapterState, string> = {
  translated: 'Đã dịch',
  untranslated: 'Chưa dịch',
  empty: 'Chưa có bản gốc'
}

export function chapterState(chapter: Pick<ChapterItem, 'hasSource' | 'hasTarget'>): ChapterState {
  if (!chapter.hasSource) return 'empty'
  return chapter.hasTarget ? 'translated' : 'untranslated'
}

export type SearchQuery =
  | { kind: 'empty' }
  /** The whole input is a number: confirm to jump to that chapter. */
  | { kind: 'jump'; number: number }
  | { kind: 'filter'; text: string }

export function parseQuery(raw: string): SearchQuery {
  const text = raw.trim()
  if (text === '') return { kind: 'empty' }
  if (/^\d+$/.test(text)) return { kind: 'jump', number: Number(text) }
  return { kind: 'filter', text }
}

/** Keeps the chapters whose displayed name contains `text`, in their original order. */
export function filterChapters(chapters: ChapterItem[], text: string): ChapterItem[] {
  const needle = fold(text.trim())
  if (needle === '') return chapters
  return chapters.filter((chapter) => fold(displayTitle(chapter)).includes(needle))
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Keeps a page number inside 1..pageCount, so a shrinking list never leaves an empty page. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize))
}

/** The page that holds the item at 1-based `position` of a list shown in order. */
export function pageOfPosition(position: number, pageSize: number): number {
  return Math.floor((Math.max(1, position) - 1) / pageSize) + 1
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, items.length, pageSize) - 1) * pageSize
  return items.slice(start, start + pageSize)
}

/** "from–to" of the items on a page, both 1-based; 0–0 for an empty list. */
export function pageRange(
  page: number,
  total: number,
  pageSize: number
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 }
  const current = clampPage(page, total, pageSize)
  return { from: (current - 1) * pageSize + 1, to: Math.min(current * pageSize, total) }
}

/**
 * Page numbers to offer as buttons: always the first and last, the neighbours of the current
 * page, and `null` where a run is skipped (shown as an ellipsis).
 */
export function pageWindow(page: number, pages: number): Array<number | null> {
  const wanted = new Set([1, pages, page - 1, page, page + 1])
  const numbers = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const result: Array<number | null> = []
  for (const n of numbers) {
    const previous = result[result.length - 1]
    if (typeof previous === 'number' && n - previous > 1) result.push(null)
    result.push(n)
  }
  return result
}
