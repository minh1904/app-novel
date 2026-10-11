import { builtinLanguageProfile, type SourceLanguage } from '../contracts/library'
import {
  ABBREVIATIONS_ALWAYS,
  ABBREVIATIONS_UNLESS_CAPITAL,
  LONG_SEGMENT_UNITS,
  OPENERS
} from './segmenterData'

/**
 * Tách văn bản gốc của chương thành các segment câu. Xây dựng dựa trên bộ phân đoạn câu mặc định
 * của nền tảng (ICU), sau đó hiệu chỉnh các trường hợp thường tách sai: dấu mở ngoặc/mở kép bị kẹt ở cuối
 * câu trước, tách nhầm sau từ viết tắt, hoặc tách nhầm giữa dấu ba chấm ("khoan đã... cái gì").
 * Các khoảng range là offset UTF-16 trong văn bản, sẵn sàng truyền vào `text:save`.
 */

export interface SegmentRange {
  start: number
  end: number
}

/** Các ngôn ngữ được hỗ trợ phân đoạn: các ngôn ngữ nguồn cùng tiếng Việt cho bản dịch. */
export type SegmentLanguage = SourceLanguage | 'vi'

function segmentLocale(lang: SegmentLanguage): string {
  if (lang === 'vi') return 'vi'
  return builtinLanguageProfile(lang)?.locale ?? lang
}

const SPACE = /\s/

/** Các ngôn ngữ có câu sử dụng từ viết tắt kèm dấu chấm không được phép ngắt đoạn. */
function abbreviationKey(lang: SegmentLanguage): 'en' | 'vi' | null {
  return lang === 'en' || lang === 'vi' ? lang : null
}

interface Span {
  start: number
  end: number
}

function trimEnd(text: string, span: Span): number {
  let end = span.end
  while (end > span.start && SPACE.test(text[end - 1])) end--
  return end
}

function firstLetter(text: string, from: number, to: number): string {
  for (let at = from; at < to; at++) {
    if (!SPACE.test(text[at]) && !OPENERS.includes(text[at]) && !'"\'«»'.includes(text[at])) {
      return text[at]
    }
  }
  return ''
}

/** Từ kết thúc của một đoạn, sau khi đã loại bỏ dấu ngoặc hoặc dấu kép ở phía trước. */
function lastWord(text: string, span: Span): string {
  const end = trimEnd(text, span)
  let start = end
  while (start > span.start && !SPACE.test(text[start - 1])) start--
  return text.slice(start, end).replace(/^[^\p{L}\p{N}]+/u, '')
}

function isLowerOrDigit(char: string): boolean {
  return char !== '' && (/\p{Ll}/u.test(char) || /\p{N}/u.test(char))
}

function repair(text: string, spans: Span[], lang: SegmentLanguage): Span[] {
  const result = spans.map((span) => ({ ...span }))

  // 1. Dấu mở ngoặc hoặc mở kép ở cuối đoạn được chuyển sang đầu câu tiếp theo.
  for (let i = 0; i < result.length - 1; i++) {
    const end = trimEnd(text, result[i])
    let k = 0
    while (end - k > result[i].start + 1 && OPENERS.includes(text[end - k - 1])) k++
    if (k > 0) {
      result[i].end = end - k
      result[i + 1].start = end - k
    }
  }

  // 2. Dấu chấm sau từ viết tắt đã biết không ngắt câu.
  // 3. Tương tự, "..." hoặc "…" không ngắt câu khi từ kế tiếp bắt đầu bằng chữ thường ("Khoan đã... cái gì?").
  const key = abbreviationKey(lang)
  for (let i = 0; i < result.length - 1; ) {
    const word = lastWord(text, result[i])
    const next = firstLetter(text, result[i + 1].start, result[i + 1].end)
    const always = key !== null && ABBREVIATIONS_ALWAYS[key].includes(word)
    const unlessCapital =
      key !== null && ABBREVIATIONS_UNLESS_CAPITAL[key].includes(word) && isLowerOrDigit(next)
    const ellipsis =
      (lang === 'en' || lang === 'vi') && /(?:\.{3}|…)$/.test(word) && isLowerOrDigit(next)
    if (always || unlessCapital || ellipsis) {
      result[i].end = result[i + 1].end
      result.splice(i + 1, 1)
    } else {
      i++
    }
  }
  return result
}

/**
 * Các segment của `text`, theo thứ tự xuất hiện. Mỗi dòng không trống bắt đầu một segment mới,
 * dòng trống không tạo segment, và mỗi khoảng range bao phủ một câu từ ký tự đầu tiên đến ký tự cuối cùng không phải khoảng trắng.
 */
export function segment(text: string, lang: SegmentLanguage): SegmentRange[] {
  const segmenter = new Intl.Segmenter(segmentLocale(lang), { granularity: 'sentence' })
  const ranges: SegmentRange[] = []

  let lineStart = 0
  while (lineStart <= text.length) {
    let lineEnd = text.indexOf('\n', lineStart)
    if (lineEnd === -1) lineEnd = text.length

    let a = lineStart
    let b = lineEnd
    while (a < b && SPACE.test(text[a])) a++
    while (b > a && SPACE.test(text[b - 1])) b--

    if (a < b) {
      const line = text.slice(a, b)
      const pieces: Span[] = []
      for (const piece of segmenter.segment(line)) {
        pieces.push({ start: a + piece.index, end: a + piece.index + piece.segment.length })
      }
      for (const span of repair(text, pieces, lang)) {
        let start = span.start
        let end = span.end
        while (start < end && SPACE.test(text[start])) start++
        while (end > start && SPACE.test(text[end - 1])) end--
        if (start < end) ranges.push({ start, end })
      }
    }

    if (lineEnd >= text.length) break
    lineStart = lineEnd + 1
  }
  return ranges
}

/** Chỉ số của các segment dài hơn giới hạn cho phép; được đánh dấu cảnh báo ở bản xem trước chứ không tự ý cắt ngắn. */
export function longSegments(ranges: SegmentRange[]): number[] {
  const flagged: number[] = []
  ranges.forEach((range, index) => {
    if (range.end - range.start > LONG_SEGMENT_UNITS) flagged.push(index)
  })
  return flagged
}
