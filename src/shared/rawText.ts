import type { SourceLanguage } from './library'

/**
 * Turning the bytes of a text file into the text a chapter will store: which encoding, and the few
 * changes made on the way in. Pure functions with no DOM or Node API beyond `TextDecoder`, so the
 * rules can be tested on their own and run unchanged in the renderer.
 */

export const ENCODINGS = [
  { id: 'utf-8', label: 'UTF-8' },
  { id: 'utf-16le', label: 'UTF-16 LE' },
  { id: 'utf-16be', label: 'UTF-16 BE' },
  { id: 'gb18030', label: 'GB18030 (Trung giản thể)' },
  { id: 'big5', label: 'Big5 (Trung phồn thể)' },
  { id: 'shift_jis', label: 'Shift_JIS (Nhật)' },
  { id: 'euc-jp', label: 'EUC-JP (Nhật)' },
  { id: 'windows-1252', label: 'Windows-1252 (Tây Âu)' }
] as const

export type EncodingId = (typeof ENCODINGS)[number]['id']

export function encodingLabel(id: EncodingId): string {
  return ENCODINGS.find((encoding) => encoding.id === id)?.label ?? id
}

/** Older encodings to try, in order, when a file is not UTF-8. Windows-1252 decodes every byte, so
 * it can only ever be the last resort and is never offered for Chinese or Japanese. */
const LEGACY_BY_LANGUAGE: Record<SourceLanguage, EncodingId[]> = {
  'zh-Hans': ['gb18030'],
  'zh-Hant': ['big5', 'gb18030'],
  ja: ['shift_jis', 'euc-jp'],
  en: ['windows-1252']
}

export type DetectionReason =
  /** The file starts with a byte order mark. */
  | 'bom'
  /** Valid UTF-8 with no replacement characters. */
  | 'utf8'
  /** Not UTF-8, but decodes cleanly in an older encoding that suits the source language. */
  | 'legacy'
  /** Nothing decoded cleanly; the encoding with the fewest replacement characters was taken. */
  | 'fallback'

export interface Detection {
  encoding: EncodingId
  reason: DetectionReason
}

const BOM = String.fromCharCode(0xfeff)
/** U+2028 and U+2029, written without the literal characters, which would end a source line. */
const LINE_SEPARATORS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g')
const REPLACEMENT = '�'

function bomEncoding(bytes: Uint8Array): EncodingId | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return 'utf-8'
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
  return null
}

function decodesCleanly(bytes: Uint8Array, encoding: EncodingId): boolean {
  try {
    new TextDecoder(encoding, { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

/** Half-width katakana (U+FF61–U+FF9F): a sign that EUC-JP bytes were read as Shift_JIS. */
export function countHalfWidthKatakana(text: string): number {
  let count = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code >= 0xff61 && code <= 0xff9f) count++
  }
  return count
}

export function countReplacements(text: string): number {
  let count = 0
  for (let at = text.indexOf(REPLACEMENT); at !== -1; at = text.indexOf(REPLACEMENT, at + 1))
    count++
  return count
}

/**
 * Chooses an encoding: byte order mark, then strict UTF-8, then the older encodings that suit the
 * work's source language. Several older encodings accept the same bytes, so a clean decode is not
 * proof; the preview shows the text and lets the user pick another.
 */
export function detectEncoding(bytes: Uint8Array, sourceLang: SourceLanguage): Detection {
  const bom = bomEncoding(bytes)
  if (bom) return { encoding: bom, reason: 'bom' }
  if (decodesCleanly(bytes, 'utf-8')) return { encoding: 'utf-8', reason: 'utf8' }

  const candidates = LEGACY_BY_LANGUAGE[sourceLang]
  const clean = candidates.filter((encoding) => decodesCleanly(bytes, encoding))
  if (clean.length === 1) return { encoding: clean[0], reason: 'legacy' }
  if (clean.length > 1) {
    // EUC-JP text is also valid Shift_JIS, where it turns into runs of half-width katakana, which
    // real Japanese text almost never has. Prefer the reading with the fewest of them.
    const score = (encoding: EncodingId): number =>
      sourceLang === 'ja' ? countHalfWidthKatakana(new TextDecoder(encoding).decode(bytes)) : 0
    const best = clean.reduce((winner, next) => (score(next) < score(winner) ? next : winner))
    return { encoding: best, reason: 'legacy' }
  }

  let best: EncodingId = candidates[0]
  let fewest = Infinity
  for (const encoding of ['utf-8' as const, ...candidates]) {
    const replacements = countReplacements(new TextDecoder(encoding).decode(bytes))
    if (replacements < fewest) {
      fewest = replacements
      best = encoding
    }
  }
  return { encoding: best, reason: 'fallback' }
}

/** Decodes with the chosen encoding. A leading byte order mark is dropped by the decoder. */
export function decodeRaw(
  bytes: Uint8Array,
  encoding: EncodingId
): { text: string; replacements: number } {
  const text = new TextDecoder(encoding).decode(bytes)
  return { text, replacements: countReplacements(text) }
}

export type NormalizeKind =
  | 'bom'
  | 'crlf'
  | 'cr'
  | 'line-separator'
  | 'control'
  | 'line-end'
  | 'space'
  | 'trim'

export interface NormalizeChange {
  kind: NormalizeKind
  count: number
}

export interface Normalized {
  text: string
  /** Only the kinds that actually changed something, in a fixed order. */
  changes: NormalizeChange[]
}

// NUL and the other C0 controls, except tab (\t) and line feed (\n) which are real text.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

/**
 * The only changes made to a text on its way into a chapter: the byte order mark, line endings
 * (to LF), control characters, space/tab runs left dangling at a line's end or doubled up inside
 * one, and blank lines or trailing spaces at the two ends of the whole text. The indentation at
 * the start of a line is left alone — full-width (U+3000) or not, it is how the source marks a new
 * paragraph, not a typo. Punctuation, case, Han forms and Unicode normalisation are untouched too,
 * and each change made is counted.
 */
export function normalizeRaw(input: string): Normalized {
  const changes: NormalizeChange[] = []
  const note = (kind: NormalizeKind, count: number): void => {
    if (count > 0) changes.push({ kind, count })
  }
  let text = input

  if (text.startsWith(BOM)) {
    text = text.slice(1)
    note('bom', 1)
  }

  let crlf = 0
  text = text.replace(/\r\n/g, () => (crlf++, '\n'))
  note('crlf', crlf)
  let cr = 0
  text = text.replace(/\r/g, () => (cr++, '\n'))
  note('cr', cr)
  let separators = 0
  text = text.replace(LINE_SEPARATORS, () => (separators++, '\n'))
  note('line-separator', separators)

  let controls = 0
  text = text.replace(CONTROL, () => (controls++, ''))
  note('control', controls)

  // Space or tab left dangling before a line break, which cannot be meant.
  let lineEnds = 0
  text = text.replace(/[ \t]+(?=\n|$)/g, () => (lineEnds++, ''))
  note('line-end', lineEnds)

  // Two or more spaces/tabs in a row inside a line (not the indentation it starts with) collapse
  // to one: almost always a slip from pasting out of a word processor or PDF.
  let spaces = 0
  text = text.replace(/(?<=[^\n\u3000])[ \t]{2,}/g, () => (spaces++, ' '))
  note('space', spaces)

  // Blank lines before the first real line go, but the first line keeps its own indentation.
  const before = text.length
  text = text.replace(/^(?:[^\S\n]*\n)+/, '').replace(/\s+$/, '')
  note('trim', before - text.length)

  return { text, changes }
}

/** A short sentence for each kind of change, for the preview. */
export function describeChange(change: NormalizeChange): string {
  const n = change.count.toLocaleString('vi')
  switch (change.kind) {
    case 'bom':
      return 'bỏ dấu thứ tự byte (BOM) ở đầu'
    case 'crlf':
      return 'đổi ' + n + ' xuống dòng CRLF thành LF'
    case 'cr':
      return 'đổi ' + n + ' xuống dòng CR thành LF'
    case 'line-separator':
      return 'đổi ' + n + ' dấu ngắt dòng Unicode thành LF'
    case 'control':
      return 'bỏ ' + n + ' ký tự điều khiển'
    case 'line-end':
      return 'cắt khoảng trắng dư ở cuối ' + n + ' dòng'
    case 'space':
      return 'gộp ' + n + ' chỗ có nhiều dấu cách/tab liền nhau thành một'
    case 'trim':
      return 'cắt ' + n + ' ký tự trống ở hai đầu văn bản'
  }
}
