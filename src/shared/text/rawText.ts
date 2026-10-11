import type { SourceLanguage } from '../contracts/library'

/**
 * Chuyển đổi byte của tệp văn bản thành nội dung lưu trữ của chương: xác định bảng mã và
 * áp dụng một số điều chỉnh chuẩn hóa. Các hàm thuần túy không dùng API của DOM hay Node ngoài `TextDecoder`,
 * giúp kiểm thử độc lập và có thể chạy trực tiếp trong renderer.
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

/** Các bảng mã cũ được thử lần lượt khi tệp không phải UTF-8. Windows-1252 giải mã mọi byte,
 * do đó chỉ dùng làm giải pháp cuối cùng và không áp dụng cho tiếng Trung hoặc tiếng Nhật. */
const LEGACY_BY_LANGUAGE: Partial<Record<SourceLanguage, EncodingId[]>> = {
  'zh-Hans': ['gb18030'],
  'zh-Hant': ['big5', 'gb18030'],
  ja: ['shift_jis', 'euc-jp'],
  en: ['windows-1252']
}

export type DetectionReason =
  /** Tệp bắt đầu bằng dấu thứ tự byte (BOM). */
  | 'bom'
  /** Định dạng UTF-8 hợp lệ không có ký tự thay thế. */
  | 'utf8'
  /** Không phải UTF-8, nhưng giải mã trọn vẹn bằng một bảng mã cũ phù hợp với ngôn ngữ nguồn. */
  | 'legacy'
  /** Không có bảng mã nào giải mã trọn vẹn; chọn bảng mã có ít ký tự thay thế nhất. */
  | 'fallback'

export interface Detection {
  encoding: EncodingId
  reason: DetectionReason
}

const BOM = String.fromCharCode(0xfeff)
/** U+2028 và U+2029, viết không dùng ký tự trực tiếp để tránh ngắt dòng mã nguồn. */
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

/** Katakana nửa chiều rộng (U+FF61–U+FF9F): dấu hiệu cho thấy byte EUC-JP bị đọc nhầm thành Shift_JIS. */
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
 * Chọn bảng mã phù hợp: ưu tiên dấu thứ tự byte (BOM), sau đó kiểm tra UTF-8 chuẩn,
 * rồi đến các bảng mã cũ phù hợp với ngôn ngữ nguồn của tác phẩm. Nhiều bảng mã cũ cùng nhận diện
 * chuỗi byte tương tự nhau nên giải mã không lỗi chưa hẳn đã đúng; bản xem trước cho phép người dùng đổi bảng mã.
 */
export function detectEncoding(bytes: Uint8Array, sourceLang: SourceLanguage): Detection {
  const bom = bomEncoding(bytes)
  if (bom) return { encoding: bom, reason: 'bom' }
  if (decodesCleanly(bytes, 'utf-8')) return { encoding: 'utf-8', reason: 'utf8' }

  const candidates = LEGACY_BY_LANGUAGE[sourceLang] ?? ['windows-1252']
  const clean = candidates.filter((encoding) => decodesCleanly(bytes, encoding))
  if (clean.length === 1) return { encoding: clean[0], reason: 'legacy' }
  if (clean.length > 1) {
    // Văn bản EUC-JP cũng có thể là Shift_JIS hợp lệ nhưng bị biến thành chuỗi katakana nửa chiều rộng
    // (rất hiếm khi xuất hiện trong tiếng Nhật thực tế). Ưu tiên cách đọc có ít ký tự này nhất.
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

/** Giải mã với bảng mã đã chọn. Dấu BOM ở đầu sẽ tự động được bộ giải mã loại bỏ. */
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
  /** Chỉ gồm các loại thay đổi thực sự có tác động, theo thứ tự cố định. */
  changes: NormalizeChange[]
}

// Ký tự NUL và các ký tự điều khiển C0 khác, ngoại trừ tab (\t) và xuống dòng (\n).
// biome-ignore lint/suspicious/noControlCharactersInRegex: biểu thức này chủ đích lọc các ký tự điều khiển
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

/**
 * Các thay đổi duy nhất áp dụng cho văn bản khi nhập vào chương: dấu thứ tự byte (BOM), chuẩn hóa xuống dòng (về LF),
 * ký tự điều khiển, khoảng trắng/tab thừa ở cuối dòng hoặc bị lặp bên trong dòng,
 * và các dòng trống/khoảng trắng ở hai đầu văn bản. Khoảng thụt đầu dòng được giữ nguyên
 * (dù là dấu cách thông thường hay khoảng trắng toàn phần U+3000) vì đó là cách văn bản gốc đánh dấu đoạn mới.
 * Dấu câu, chữ hoa/thường, dạng chữ Hán và chuẩn hóa Unicode được giữ nguyên vẹn; mỗi thay đổi đều được đếm.
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

  // Khoảng trắng hoặc tab thừa ngay trước dấu xuống dòng.
  let lineEnds = 0
  text = text.replace(/[ \t]+(?=\n|$)/g, () => (lineEnds++, ''))
  note('line-end', lineEnds)

  // Gộp hai hoặc nhiều khoảng trắng/tab liên tiếp bên trong dòng (không tính khoảng thụt đầu dòng)
  // thành một khoảng trắng: thường phát sinh khi dán từ trình soạn thảo hoặc tệp PDF.
  let spaces = 0
  text = text.replace(/(?<=[^\n\u3000])[ \t]{2,}/g, () => (spaces++, ' '))
  note('space', spaces)

  // Loại bỏ các dòng trống ở đầu văn bản, nhưng giữ nguyên thụt đầu dòng của dòng đầu tiên.
  const before = text.length
  text = text.replace(/^(?:[^\S\n]*\n)+/, '').replace(/\s+$/, '')
  note('trim', before - text.length)

  return { text, changes }
}

/** Câu mô tả ngắn gọn cho từng loại thay đổi, dùng cho bản xem trước. */
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
