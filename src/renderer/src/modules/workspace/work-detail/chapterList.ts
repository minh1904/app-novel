import type { ChapterItem } from '../../../../../shared/contracts/chapters'

/** Các quy tắc xử lý danh sách chương: tên gọi, tìm kiếm, nhảy tới chương và phân trang. */

export const PAGE_SIZES = [50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 50

/** Tên hiển thị của chương: tiêu đề thực tế hoặc "Chương N" nếu để trống. */
export function displayTitle(chapter: Pick<ChapterItem, 'number' | 'title'>): string {
  return chapter.title === '' ? 'Chương ' + chapter.number : chapter.title
}

/** Tiêu đề đầu trang: "Chương N: tiêu đề", trừ khi tiêu đề đã bắt đầu bằng "Chương". */
export function headingTitle(chapter: Pick<ChapterItem, 'number' | 'title'>): string {
  if (chapter.title === '' || /^chương\s/i.test(chapter.title)) return displayTitle(chapter)
  return 'Chương ' + chapter.number + ': ' + chapter.title
}

/** Chuyển thành chữ thường và bỏ dấu tiếng Việt để tìm kiếm không dấu. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/** Ghi chú nội dung sẽ bị mất khi xóa chương, hoặc null nếu không có nội dung. */
export function lossNote(chapter: Pick<ChapterItem, 'hasSource' | 'hasTarget'>): string | null {
  if (chapter.hasSource && chapter.hasTarget) {
    return 'Chương này có cả bản gốc lẫn bản dịch; cả hai sẽ mất.'
  }
  if (chapter.hasSource) return 'Chương này có bản gốc; bản gốc sẽ mất.'
  if (chapter.hasTarget) return 'Chương này có bản dịch; bản dịch sẽ mất.'
  return null
}

/** Trạng thái hoàn thành bản dịch của chương dựa trên sự tồn tại của văn bản gốc và dịch. */
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
  /** Người dùng nhập số nguyên: chuyển trực tiếp tới chương số đó. */
  | { kind: 'jump'; number: number }
  | { kind: 'filter'; text: string }

export function parseQuery(raw: string): SearchQuery {
  const text = raw.trim()
  if (text === '') return { kind: 'empty' }
  if (/^\d+$/.test(text)) return { kind: 'jump', number: Number(text) }
  return { kind: 'filter', text }
}

/** Lọc các chương có tên hiển thị chứa chuỗi tìm kiếm, giữ nguyên thứ tự ban đầu. */
export function filterChapters(chapters: ChapterItem[], text: string): ChapterItem[] {
  const needle = fold(text.trim())
  if (needle === '') return chapters
  return chapters.filter((chapter) => fold(displayTitle(chapter)).includes(needle))
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Giới hạn số trang hợp lệ trong khoảng từ 1 đến tổng số trang. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize))
}

/** Xác định số trang chứa mục ở vị trí 1-based trong danh sách đã sắp xếp. */
export function pageOfPosition(position: number, pageSize: number): number {
  return Math.floor((Math.max(1, position) - 1) / pageSize) + 1
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, items.length, pageSize) - 1) * pageSize
  return items.slice(start, start + pageSize)
}

/** Khoảng chỉ số bắt đầu và kết thúc của các mục trên một trang (1-based); 0–0 nếu danh sách rỗng. */
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
 * Danh sách số trang hiển thị dạng nút: luôn bao gồm trang đầu, trang cuối,
 * các trang lân cận trang hiện tại, và `null` cho vị trí dấu ba chấm.
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
