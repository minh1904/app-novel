import { describe, expect, it } from 'vitest'
import { parseNamesText } from './namesParser'

describe('namesParser', () => {
  it('parses valid source=target pairs, handling whitespace and CRLF', () => {
    const text = '韩立 = Hàn Lập\r\n筑基=Trúc Cơ\n  南宫婉  =   Nam Cung Uyển  '
    const result = parseNamesText(text)

    expect(result.entries).toEqual([
      { line: 1, source: '韩立', target: 'Hàn Lập', raw: '韩立 = Hàn Lập' },
      { line: 2, source: '筑基', target: 'Trúc Cơ', raw: '筑基=Trúc Cơ' },
      { line: 3, source: '南宫婉', target: 'Nam Cung Uyển', raw: '  南宫婉  =   Nam Cung Uyển  ' }
    ])
    expect(result.skipped).toHaveLength(0)
  })

  it('skips comments starting with # and // and empty lines', () => {
    const text = `
# Comment line 1
// Comment line 2
韩立=Hàn Lập

   
筑基=Trúc Cơ
`
    const result = parseNamesText(text)
    expect(result.entries).toHaveLength(2)
    expect(result.entries.map((e) => e.source)).toEqual(['韩立', '筑基'])

    const commentSkipped = result.skipped.filter((s) => s.reason === 'comment')
    expect(commentSkipped).toHaveLength(2)

    const emptySkipped = result.skipped.filter((s) => s.reason === 'empty')
    expect(emptySkipped.length).toBeGreaterThanOrEqual(3)
  })

  it('handles malformed lines: missing delimiter, empty source or empty target', () => {
    const text = `
Just a normal line without equals
=Missing source
Missing target=
=
Valid=Entry
`
    const result = parseNamesText(text)
    expect(result.entries).toEqual([
      { line: 6, source: 'Valid', target: 'Entry', raw: 'Valid=Entry' }
    ])

    const missingDelim = result.skipped.find((s) => s.reason === 'missing_delimiter')
    expect(missingDelim?.raw).toBe('Just a normal line without equals')

    const emptySource = result.skipped.filter((s) => s.reason === 'empty_source')
    expect(emptySource).toHaveLength(2)

    const emptyTarget = result.skipped.find((s) => s.reason === 'empty_target')
    expect(emptyTarget?.raw).toBe('Missing target=')
  })

  it('deduplicates sources within the file keeping the first occurrence', () => {
    const text = `
韩立=Hàn Lập
筑基=Trúc Cơ
韩立=Hàn Lập Khác
`
    const result = parseNamesText(text)
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toMatchObject({ source: '韩立', target: 'Hàn Lập' })

    const dup = result.skipped.find((s) => s.reason === 'duplicate_source')
    expect(dup?.line).toBe(4)
    expect(dup?.raw).toBe('韩立=Hàn Lập Khác')
  })

  it('allows target to contain equals signs', () => {
    const text = 'Math=1+1=2'
    const result = parseNamesText(text)
    expect(result.entries).toEqual([
      { line: 1, source: 'Math', target: '1+1=2', raw: 'Math=1+1=2' }
    ])
  })
})
