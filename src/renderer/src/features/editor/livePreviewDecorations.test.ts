import { describe, expect, it } from 'vitest'
import { HEADING_RE, INLINE_RE, LIST_RE, QUOTE_RE } from './livePreviewDecorations'

/**
 * `build()` needs a real `EditorView` (DOM), which the `node` test environment does not provide, so
 * these test the regexes the decoration builder runs on each line — the part that decides what gets
 * marked. Nothing here covers the actual rendering in a real window; that has not been checked.
 */

describe('HEADING_RE', () => {
  it('matches 1 to 3 leading #, requiring a space and more text', () => {
    expect(HEADING_RE.exec('# Tiêu đề')?.[1]).toBe('#')
    expect(HEADING_RE.exec('## Tiêu đề')?.[1]).toBe('##')
    expect(HEADING_RE.exec('### Tiêu đề')?.[1]).toBe('###')
  })

  it('does not match more than 3 #, no text after, or # mid-line', () => {
    expect(HEADING_RE.exec('#### Quá nhiều')).toBeNull()
    expect(HEADING_RE.exec('#   ')).toBeNull()
    expect(HEADING_RE.exec('Một câu # giữa dòng')).toBeNull()
  })
})

describe('QUOTE_RE', () => {
  it('matches a leading > followed by a space and text', () => {
    const match = QUOTE_RE.exec('> Lời thoại được trích')
    expect(match?.[0]).toBe('> ')
  })

  it('does not match > with no text after, or > mid-line', () => {
    expect(QUOTE_RE.exec('>   ')).toBeNull()
    expect(QUOTE_RE.exec('Giá > 10')).toBeNull()
  })
})

describe('LIST_RE', () => {
  it.each([
    ['- Một ý', '-'],
    ['* Một ý', '*'],
    ['+ Một ý', '+'],
    ['1. Một ý', '1.'],
    ['12. Một ý', '12.']
  ])('matches %s', (line, marker) => {
    expect(LIST_RE.exec(line)?.[1]).toBe(marker)
  })

  it('does not match a bare delimiter with no space (so "**bold**" is untouched)', () => {
    expect(LIST_RE.exec('**đậm** rồi chữ')).toBeNull()
    expect(LIST_RE.exec('*nghiêng* rồi chữ')).toBeNull()
  })

  it('does not match with nothing after the marker', () => {
    expect(LIST_RE.exec('-   ')).toBeNull()
  })
})

function matches(text: string): Array<{ kind: string; inner: string }> {
  INLINE_RE.lastIndex = 0
  const found: Array<{ kind: string; inner: string }> = []
  let match: RegExpExecArray | null
  while ((match = INLINE_RE.exec(text))) {
    if (match[1] !== undefined) found.push({ kind: 'bold', inner: match[1] })
    else if (match[2] !== undefined) found.push({ kind: 'strike', inner: match[2] })
    else if (match[3] !== undefined) found.push({ kind: 'italic', inner: match[3] })
    else found.push({ kind: 'italic', inner: match[4] })
  }
  return found
}

describe('INLINE_RE', () => {
  it('finds bold with ** on both sides', () => {
    expect(matches('Một câu có **từ quan trọng** ở giữa')).toEqual([
      { kind: 'bold', inner: 'từ quan trọng' }
    ])
  })

  it('finds italic with * or _ on both sides', () => {
    expect(matches('Một câu có *từ quan trọng* ở giữa')).toEqual([
      { kind: 'italic', inner: 'từ quan trọng' }
    ])
    expect(matches('Một câu có _từ quan trọng_ ở giữa')).toEqual([
      { kind: 'italic', inner: 'từ quan trọng' }
    ])
  })

  it('finds strikethrough with ~~ on both sides', () => {
    expect(matches('Một câu có ~~từ cũ~~ đã bỏ')).toEqual([{ kind: 'strike', inner: 'từ cũ' }])
  })

  it('does not read a bold pair as two nested italics', () => {
    expect(matches('Một câu có **từ quan trọng** ở giữa')).toEqual([
      { kind: 'bold', inner: 'từ quan trọng' }
    ])
  })

  it('finds several marks on the same line in order', () => {
    expect(matches('**đậm** rồi *nghiêng* rồi ~~gạch~~')).toEqual([
      { kind: 'bold', inner: 'đậm' },
      { kind: 'italic', inner: 'nghiêng' },
      { kind: 'strike', inner: 'gạch' }
    ])
  })

  it('does not match a lone * or _ with a space right after it', () => {
    expect(matches('* Một ý không phải nghiêng')).toEqual([])
  })

  it('finds nothing on a line without any inline syntax', () => {
    expect(matches('Một câu bình thường, không có gì đặc biệt.')).toEqual([])
  })
})
