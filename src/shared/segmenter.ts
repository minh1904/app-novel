import type { SourceLanguage } from './library'
import {
  ABBREVIATIONS_ALWAYS,
  ABBREVIATIONS_UNLESS_CAPITAL,
  LONG_SEGMENT_UNITS,
  OPENERS
} from './segmenterData'

/**
 * Splits a chapter's source text into sentence segments. Built on the platform's sentence
 * segmenter (ICU), then repaired where it is known to be wrong: an opening quote left at the end of
 * the previous sentence, a split after an abbreviation, and a split inside "wait... what".
 * Ranges are UTF-16 offsets into the text, ready to hand to `text:save`.
 */

export interface SegmentRange {
  start: number
  end: number
}

/** The languages text can be split in: the source languages, plus Vietnamese for translations. */
export type SegmentLanguage = SourceLanguage | 'vi'

const LOCALE: Record<SegmentLanguage, string> = {
  en: 'en',
  vi: 'vi',
  'zh-Hans': 'zh-Hans',
  'zh-Hant': 'zh-Hant',
  ja: 'ja'
}

const SPACE = /\s/

/** Languages whose sentences use abbreviations with a period that must not split. */
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

/** The word a piece ends with, without any quote or bracket in front of it. */
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

  // 1. An opening bracket or quote at the end of a piece starts the next sentence.
  for (let i = 0; i < result.length - 1; i++) {
    const end = trimEnd(text, result[i])
    let k = 0
    while (end - k > result[i].start + 1 && OPENERS.includes(text[end - k - 1])) k++
    if (k > 0) {
      result[i].end = end - k
      result[i + 1].start = end - k
    }
  }

  // 2. A period after a known abbreviation does not end the sentence. 3. Neither does "..." or
  // "…" when the next word starts in lower case ("Wait... what?").
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
 * The segments of `text`, in order. Every non-empty line starts a new segment, blank lines make
 * none, and a range covers a sentence from its first to its last character that is not white space.
 */
export function segment(text: string, lang: SegmentLanguage): SegmentRange[] {
  const segmenter = new Intl.Segmenter(LOCALE[lang], { granularity: 'sentence' })
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

/** Indices of segments longer than the limit; flagged in the preview, never cut. */
export function longSegments(ranges: SegmentRange[]): number[] {
  const flagged: number[] = []
  ranges.forEach((range, index) => {
    if (range.end - range.start > LONG_SEGMENT_UNITS) flagged.push(index)
  })
  return flagged
}
