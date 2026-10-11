import { describe, expect, it } from 'vitest'
import { FILE_MAX_BYTES, prepareImport, type ImportSource } from './rawImport'
import { TEXT_MAX_UNITS } from '../contracts/text'

const paste = (text: string): ImportSource => ({ kind: 'paste', text })
const file = (bytes: Uint8Array, name = 'chuong-1.txt'): ImportSource => ({
  kind: 'file',
  name,
  bytes
})
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)

function ok(
  result: ReturnType<typeof prepareImport>
): Extract<typeof result, { ok: true }>['plan'] {
  if (!result.ok) throw new Error('expected a plan, got: ' + result.message)
  return result.plan
}

describe('prepareImport: pasted text', () => {
  it('normalises, segments and reports', () => {
    const plan = ok(prepareImport(paste('Trời mưa. Anh ở nhà.\r\n\r\nCô đi ra ngoài.\r\n'), 'en'))
    expect(plan.fileName).toBeNull()
    expect(plan.encoding).toBeNull()
    expect(plan.text).toBe('Trời mưa. Anh ở nhà.\n\nCô đi ra ngoài.')
    expect(plan.changes.map((c) => c.kind)).toEqual(['crlf', 'trim'])
    expect(plan.segments.map((r) => plan.text.slice(r.start, r.end))).toEqual([
      'Trời mưa.',
      'Anh ở nhà.',
      'Cô đi ra ngoài.'
    ])
    expect(plan.warnings).toEqual([])
  })

  it('refuses text with nothing in it', () => {
    for (const text of ['', '   ', '\n\n \t \n', '\u0000\u0007']) {
      const result = prepareImport(paste(text), 'ja')
      expect(result.ok, JSON.stringify(text)).toBe(false)
    }
  })

  it('refuses text over the chapter limit and says the limit', () => {
    const result = prepareImport(paste('字'.repeat(TEXT_MAX_UNITS + 1)), 'ja')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('2.000.000')
  })

  it('refuses a text that splits into too many segments', () => {
    const lines = Array.from({ length: 50_001 }, () => 'a.').join('\n')
    const result = prepareImport(paste(lines), 'en')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('50.000')
  })

  it('accepts exactly the segment limit', () => {
    const lines = Array.from({ length: 50_000 }, () => 'a.').join('\n')
    expect(ok(prepareImport(paste(lines), 'en')).segments).toHaveLength(50_000)
  })

  it('flags an unusually long segment and still imports it', () => {
    const plan = ok(prepareImport(paste('短い。\n' + '字'.repeat(2000)), 'ja'))
    expect(plan.longSegments).toEqual([1])
    expect(plan.warnings.some((w) => w.includes('dài bất thường'))).toBe(true)
  })
})

describe('prepareImport: files', () => {
  it('reads a UTF-8 file with a byte order mark and names it', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('山中药铺。\n第二句。')])
    const plan = ok(prepareImport(file(bytes, 'a.txt'), 'zh-Hans'))
    expect(plan.fileName).toBe('a.txt')
    expect(plan.encoding).toEqual({ id: 'utf-8', reason: 'bom', replacements: 0 })
    expect(plan.text).toBe('山中药铺。\n第二句。')
    expect(plan.changes).toEqual([])
  })

  it('reads Shift_JIS for a Japanese work and tells the user which encoding it used', () => {
    // こんにちは。 trong bảng mã Shift_JIS
    const bytes = Uint8Array.from([
      0x82, 0xb1, 0x82, 0xf1, 0x82, 0xc9, 0x82, 0xbf, 0x82, 0xcd, 0x81, 0x42
    ])
    const plan = ok(prepareImport(file(bytes), 'ja'))
    expect(plan.encoding?.id).toBe('shift_jis')
    expect(plan.text).toBe('こんにちは。')
  })

  it('re-reads the same bytes when the user picks another encoding', () => {
    const bytes = Uint8Array.from([0xc4, 0xe3, 0xba, 0xc3, 0xa1, 0xa3]) // 你好。 trong bảng mã GBK
    const first = ok(prepareImport(file(bytes), 'zh-Hans'))
    expect(first.text).toBe('你好。')
    const forced = ok(prepareImport(file(bytes), 'zh-Hans', 'big5'))
    expect(forced.encoding?.reason).toBe('chosen')
    expect(forced.text).not.toBe('你好。')
  })

  it('warns when the text has replacement characters', () => {
    const plan = ok(
      prepareImport(file(Uint8Array.from([0x61, 0xff, 0x62, 0x80, 0x2e])), 'en', 'utf-8')
    )
    expect(plan.encoding?.replacements).toBe(2)
    expect(plan.warnings.some((w) => w.includes('bảng mã'))).toBe(true)
  })

  it('refuses an empty file and a file of only white space', () => {
    expect(prepareImport(file(new Uint8Array()), 'en').ok).toBe(false)
    expect(prepareImport(file(utf8('  \r\n \r\n')), 'en').ok).toBe(false)
  })

  it('refuses a file over 8 MB with the limit in the message', () => {
    const result = prepareImport(file(new Uint8Array(FILE_MAX_BYTES + 1).fill(0x61)), 'en')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('8 MB')
  })

  it('takes an ordinary small file', () => {
    const lines = 'a.\n'.repeat(1000).slice(0, 3000)
    expect(prepareImport(file(utf8(lines)), 'en').ok).toBe(true)
  })
})
