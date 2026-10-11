import type { TextSide } from '../../../shared/contracts/text'

/**
 * Thuật toán phân trang cho các công cụ trò chuyện: xác định đoạn văn kèm vị trí offset,
 * con trỏ trả về cho mỗi trang, và trích xuất từng trang văn bản từ chương.
 */

export {
  paragraphAt,
  splitParagraphs,
  type ParagraphSpan
} from '../../../shared/text/paragraphSpans'
import { paragraphAt, type ParagraphSpan } from '../../../shared/text/paragraphSpans'

/**
 * Vị trí tiếp tục đọc dưới dạng chuỗi: chương, phía (gốc/dịch), đoạn (bắt đầu từ 1),
 * offset trong đoạn đó, và phiên bản văn bản (revision) tại thời điểm đọc. Ví dụ: `c3.target.p81.o0.r12`.
 */
export interface Cursor {
  chapter: number
  side: TextSide
  paragraph: number
  offset: number
  rev: number
}

export function encodeCursor(cursor: Cursor): string {
  return `c${cursor.chapter}.${cursor.side}.p${cursor.paragraph}.o${cursor.offset}.r${cursor.rev}`
}

export function decodeCursor(text: string): Cursor | null {
  const match = /^c(\d+)\.(source|target)\.p(\d+)\.o(\d+)\.r(\d+)$/.exec(text.trim())
  if (!match) return null
  return {
    chapter: Number(match[1]),
    side: match[2] as TextSide,
    paragraph: Number(match[3]),
    offset: Number(match[4]),
    rev: Number(match[5])
  }
}

export interface Page {
  text: string
  /** Các đoạn (đánh số từ 1) nằm trong trang. */
  fromParagraph: number
  toParagraph: number
  total: number
  /** Đánh dấu trang kết thúc ở giữa `toParagraph`. */
  cutInParagraph: boolean
  /** Vị trí bắt đầu của trang kế tiếp; `null` khi đã đọc hết chương. */
  next: { paragraph: number; offset: number } | null
}

/**
 * Đọc một trang tối đa `limit` ký tự bắt đầu từ `paragraph` (đoạn thứ 1 trở đi) + `offset`. Trang sẽ kết thúc
 * tại ranh giới đoạn nếu nằm trong giới hạn; chỉ khi đoạn dài hơn giới hạn trang mới bị cắt ở giữa,
 * và trang kế tiếp sẽ tiếp tục chính xác từ vị trí dừng lại.
 */
export function readPage(
  content: string,
  spans: ParagraphSpan[],
  paragraph: number,
  offset: number,
  limit: number
): Page {
  const first = paragraph - 1
  const begin = spans[first].start + offset
  let end = Math.min(content.length, begin + limit)
  if (end < content.length) {
    // Lùi về ranh giới đoạn cuối cùng trong trang nếu có ranh giới sau điểm bắt đầu.
    const bound = paragraphAt(spans, end)
    if (spans[bound].start > begin) end = spans[bound].start
  }
  const last = paragraphAt(spans, Math.max(begin, end - 1))
  const done = end >= content.length
  const nextParagraph = done ? -1 : paragraphAt(spans, end)
  return {
    text: content.slice(begin, end),
    fromParagraph: paragraph,
    toParagraph: last + 1,
    total: spans.length,
    cutInParagraph: !done && spans[nextParagraph].start < end,
    next: done ? null : { paragraph: nextParagraph + 1, offset: end - spans[nextParagraph].start }
  }
}

/** Định dạng số với dấu chấm phân tách hàng nghìn: `19640` → `19.640`. */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
