import { describe, expect, it } from 'vitest'
import {
  countReplacements,
  decodeRaw,
  describeChange,
  detectEncoding,
  normalizeRaw,
  type EncodingId
} from './rawText'

const BOM = String.fromCharCode(0xfeff)
const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values)
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)

const utf16 = (text: string, little: boolean, bom: boolean): Uint8Array => {
  const out: number[] = bom ? (little ? [0xff, 0xfe] : [0xfe, 0xff]) : []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    out.push(...(little ? [code & 0xff, code >> 8] : [code >> 8, code & 0xff]))
  }
  return Uint8Array.from(out)
}

// Byte thực tế từ các bảng mã cũ, không do mã nguồn kiểm thử tự sinh ra.
const SJIS_KONNICHIWA = bytes(0x82, 0xb1, 0x82, 0xf1, 0x82, 0xc9, 0x82, 0xbf, 0x82, 0xcd) // こんにちは
const EUCJP_KONNICHIWA = bytes(0xa4, 0xb3, 0xa4, 0xf3, 0xa4, 0xcb, 0xa4, 0xc1, 0xa4, 0xcf)
const GBK_NIHAO = bytes(0xc4, 0xe3, 0xba, 0xc3) // 你好
const BIG5_NIHAO = bytes(0xa7, 0x41, 0xa6, 0x6e) // 你好
const CP1252_CAFE = bytes(0x63, 0x61, 0x66, 0xe9) // café

describe('detectEncoding', () => {
  it('trusts a byte order mark', () => {
    expect(detectEncoding(bytes(0xef, 0xbb, 0xbf, 0x61), 'ja')).toEqual({
      encoding: 'utf-8',
      reason: 'bom'
    })
    expect(detectEncoding(utf16('山', true, true), 'en')).toEqual({
      encoding: 'utf-16le',
      reason: 'bom'
    })
    expect(detectEncoding(utf16('山', false, true), 'en')).toEqual({
      encoding: 'utf-16be',
      reason: 'bom'
    })
  })

  it('takes strict UTF-8 when there is no byte order mark', () => {
    expect(detectEncoding(utf8('Xin chào 山中药铺 😀'), 'ja')).toEqual({
      encoding: 'utf-8',
      reason: 'utf8'
    })
    expect(detectEncoding(utf8('plain ascii'), 'zh-Hans').encoding).toBe('utf-8')
  })

  it.each([
    ['ja', SJIS_KONNICHIWA, 'shift_jis', 'こんにちは'],
    ['ja', EUCJP_KONNICHIWA, 'euc-jp', 'こんにちは'],
    ['zh-Hans', GBK_NIHAO, 'gb18030', '你好'],
    ['zh-Hant', BIG5_NIHAO, 'big5', '你好'],
    ['en', CP1252_CAFE, 'windows-1252', 'café']
  ] as const)('reads %s legacy bytes as %s', (lang, data, encoding, expected) => {
    const detected = detectEncoding(data, lang)
    expect(detected).toEqual({ encoding, reason: 'legacy' })
    expect(decodeRaw(data, detected.encoding).text).toBe(expected)
  })

  it('never offers Windows-1252 for Chinese or Japanese text', () => {
    for (const lang of ['ja', 'zh-Hans', 'zh-Hant'] as const) {
      expect(detectEncoding(bytes(0xff, 0xff, 0xff, 0xff, 0xff), lang).encoding).not.toBe(
        'windows-1252'
      )
    }
  })

  it('falls back to the encoding with the fewest replacement characters and says so', () => {
    const noise = bytes(0x81, 0x20, 0xfd, 0xfe, 0x80, 0x41)
    const detected = detectEncoding(noise, 'ja')
    expect(detected.reason).toBe('fallback')
    const chosen = decodeRaw(noise, detected.encoding).replacements
    for (const other of ['utf-8', 'shift_jis', 'euc-jp'] as EncodingId[]) {
      expect(chosen).toBeLessThanOrEqual(decodeRaw(noise, other).replacements)
    }
  })

  it('uses a generic fallback for Korean and an unprofiled valid tag', () => {
    expect(() => detectEncoding(bytes(0xff, 0x61), 'ko')).not.toThrow()
    expect(detectEncoding(CP1252_CAFE, 'fr-CA')).toEqual({
      encoding: 'windows-1252',
      reason: 'legacy'
    })
  })

  it('lets a mistaken guess be corrected: the same bytes decode differently', () => {
    expect(decodeRaw(GBK_NIHAO, 'gb18030').text).toBe('你好')
    expect(decodeRaw(GBK_NIHAO, 'big5').text).not.toBe('你好')
  })
})

describe('decodeRaw', () => {
  it('drops the byte order mark', () => {
    expect(decodeRaw(bytes(0xef, 0xbb, 0xbf, 0x61, 0x62), 'utf-8').text).toBe('ab')
    expect(decodeRaw(utf16('ab', true, true), 'utf-16le').text).toBe('ab')
    expect(decodeRaw(utf16('ab', false, true), 'utf-16be').text).toBe('ab')
  })

  it('reads UTF-16 without a byte order mark when told to', () => {
    expect(decodeRaw(utf16('山中', true, false), 'utf-16le').text).toBe('山中')
  })

  it('counts replacement characters', () => {
    expect(countReplacements('a�b��')).toBe(3)
    expect(decodeRaw(bytes(0xff, 0x61), 'utf-8')).toEqual({ text: '�a', replacements: 1 })
  })
})

describe('normalizeRaw', () => {
  it('reports no change for text that is already clean', () => {
    const text = 'Dòng một.\nDòng hai.\n\nDòng ba.'
    expect(normalizeRaw(text)).toEqual({ text, changes: [] })
  })

  it('turns CRLF into LF and counts them', () => {
    const result = normalizeRaw('a\r\nb\r\nc')
    expect(result.text).toBe('a\nb\nc')
    expect(result.changes).toEqual([{ kind: 'crlf', count: 2 }])
  })

  it('handles lone CR and Unicode line separators', () => {
    const result = normalizeRaw('a\rb' + LS + 'c' + PS + 'd')
    expect(result.text).toBe('a\nb\nc\nd')
    expect(result.changes).toEqual([
      { kind: 'cr', count: 1 },
      { kind: 'line-separator', count: 2 }
    ])
  })

  it('does not count a CRLF twice', () => {
    expect(normalizeRaw('a\r\nb').changes).toEqual([{ kind: 'crlf', count: 1 }])
  })

  it('removes a leading byte order mark that came with pasted text', () => {
    const result = normalizeRaw('' + BOM + 'xin chào')
    expect(result.text).toBe('xin chào')
    expect(result.changes).toEqual([{ kind: 'bom', count: 1 }])
  })

  it('removes control characters but keeps tabs and line feeds', () => {
    const result = normalizeRaw('a\u0000b\u0007c\td\ne\u001Ff')
    expect(result.text).toBe('abc\td\nef')
    expect(result.changes).toEqual([{ kind: 'control', count: 3 }])
  })

  it('trims blank lines and spaces at the ends of the whole text only', () => {
    const result = normalizeRaw('\n\n  \nđầu\n\ngiữa\ncuối  \n\n')
    expect(result.text).toBe('đầu\n\ngiữa\ncuối')
    expect(result.changes.map((c) => c.kind)).toEqual(['line-end', 'trim'])
  })

  it('cuts space or tab left dangling at the end of a line', () => {
    const result = normalizeRaw('dòng cuối   \nvà tiếp\t\ncòn nữa')
    expect(result.text).toBe('dòng cuối\nvà tiếp\ncòn nữa')
    expect(result.changes).toEqual([{ kind: 'line-end', count: 2 }])
  })

  it('collapses two or more spaces or tabs inside a line to one', () => {
    const result = normalizeRaw('a  b   c\t\td')
    expect(result.text).toBe('a b c d')
    expect(result.changes).toEqual([{ kind: 'space', count: 3 }])
  })

  it('leaves a single space or tab inside a line alone, and never touches the indentation it starts with', () => {
    const result = normalizeRaw('  thụt đầu dòng a b\tc')
    expect(result.text).toBe('  thụt đầu dòng a b\tc')
    expect(result.changes).toEqual([])
  })

  it('keeps the indentation of the first line', () => {
    expect(normalizeRaw('\n\n　山中药铺。\n　第二段。\n').text).toBe('　山中药铺。\n　第二段。')
  })

  it.each([
    ['full-width indentation', '　あ　い。\n　う。'],
    ['punctuation and quotes', '“A” — «B» ‘C’ 「D」…'],
    ['mixed case', 'ĐỖ Văn Hiếu'],
    ['traditional and simplified forms', '體 体 龍 龙'],
    ['a composed accent', 'é'],
    ['a decomposed accent', 'é'],
    ['an emoji sequence', '👨‍👩‍👧']
  ])('leaves %s untouched', (_name, text) => {
    // Chỉ bước cắt tỉa hai đầu văn bản có thể áp dụng, và các chuỗi này không có gì để cắt ở hai đầu.
    const result = normalizeRaw(text)
    const expected = text.replace(/\s+$/, '')
    expect(result.text).toBe(expected)
    expect(result.changes.filter((c) => c.kind !== 'trim')).toEqual([])
  })

  it('does not change Unicode normal form', () => {
    const composed = 'é'
    const decomposed = 'é'
    expect(normalizeRaw(composed).text).toBe(composed)
    expect(normalizeRaw(decomposed).text).toBe(decomposed)
    expect(normalizeRaw(decomposed).text).not.toBe(composed)
  })

  it('reports every kind of change it made, in a fixed order', () => {
    const result = normalizeRaw('' + BOM + '\n\na\r\nb\u0000\n')
    expect(result.changes.map((c) => c.kind)).toEqual(['bom', 'crlf', 'control', 'trim'])
    expect(result.text).toBe('a\nb')
  })
})

describe('describeChange', () => {
  it('says what was done in words', () => {
    expect(describeChange({ kind: 'crlf', count: 120 })).toBe('đổi 120 xuống dòng CRLF thành LF')
    expect(describeChange({ kind: 'control', count: 2 })).toBe('bỏ 2 ký tự điều khiển')
    expect(describeChange({ kind: 'bom', count: 1 })).toMatch(/BOM/)
  })
})
