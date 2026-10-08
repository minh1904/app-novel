import type { TextSide } from '../../../shared/contracts/text'

/**
 * The paging arithmetic behind the chat tools: paragraphs with their offsets, the cursor a page hands
 * back, and one page cut out of a chapter. Pure functions, so the tool runner and its tests share them.
 */

export {
  paragraphAt,
  splitParagraphs,
  type ParagraphSpan
} from '../../../shared/algorithms/paragraphSpans'
import { paragraphAt, type ParagraphSpan } from '../../../shared/algorithms/paragraphSpans'

/**
 * Where to read on from, as an opaque string the model copies back: chapter, side, paragraph (1-based),
 * offset inside that paragraph, and the text revision it was read at. `c3.target.p81.o0.r12`.
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
  /** 1-based paragraphs the page touches. */
  fromParagraph: number
  toParagraph: number
  total: number
  /** The page stops inside `toParagraph`. */
  cutInParagraph: boolean
  /** Where the next page starts; `null` when the chapter is done. */
  next: { paragraph: number; offset: number } | null
}

/**
 * One page of at most `limit` characters starting at `paragraph` (1-based) + `offset`. A page ends on a
 * paragraph bound whenever one lies inside the limit; only a paragraph longer than the whole limit is cut
 * in the middle, and then the next page starts exactly where this one stopped.
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
    // Back off to the last paragraph bound inside the page, if there is one past the start.
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

/** `19640` → `19.640`, the way the panel writes counts, without depending on the runtime's locale data. */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
