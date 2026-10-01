import { describe, expect, it } from 'vitest'
import { SEGMENTS_MAX, TEXT_MAX_UNITS } from '../../shared/text'
import { StorageError } from './errors'
import { checkText, cutsSurrogatePair } from './textRules'

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

describe('checkText', () => {
  it('accepts ordered, touching and empty segments', () => {
    const content = 'Xin chào.\nTạm biệt.'
    expect(
      checkText(content, [
        { start: 0, end: 9 },
        { start: 9, end: 9 },
        { start: 10, end: content.length }
      ])
    ).toEqual({ splitsSurrogate: [] })
  })

  it('accepts no segments, including for empty text', () => {
    expect(checkText('', [])).toEqual({ splitsSurrogate: [] })
  })

  it('counts positions in UTF-16 units, so an emoji is two', () => {
    const content = 'a😀b'
    expect(content.length).toBe(4)
    expect(checkText(content, [{ start: 0, end: 4 }])).toEqual({ splitsSurrogate: [] })
    expect(codeOf(() => checkText(content, [{ start: 0, end: 5 }]))).toBe('validation')
  })

  it('works with Chinese text outside the basic plane and with CRLF', () => {
    const content = '𠮷野家\r\nこんにちは\r\n'
    expect(
      checkText(content, [
        { start: 0, end: 5 },
        { start: 7, end: content.length }
      ])
    ).toEqual({ splitsSurrogate: [] })
  })

  it('reports, but does not refuse, a cut through a surrogate pair', () => {
    expect(checkText('a😀b', [{ start: 0, end: 2 }])).toEqual({ splitsSurrogate: [0] })
    expect(cutsSurrogatePair('a😀b', 2)).toBe(true)
    expect(cutsSurrogatePair('a😀b', 1)).toBe(false)
    expect(cutsSurrogatePair('a😀b', 3)).toBe(false)
  })

  it.each([
    ['a region past the end', [{ start: 0, end: 6 }]],
    ['a reversed region', [{ start: 4, end: 2 }]],
    ['a negative start', [{ start: -1, end: 2 }]],
    [
      'overlapping regions',
      [
        { start: 0, end: 4 },
        { start: 3, end: 5 }
      ]
    ],
    [
      'regions out of order',
      [
        { start: 3, end: 5 },
        { start: 0, end: 2 }
      ]
    ],
    ['a fractional offset', [{ start: 0.5, end: 2 }]],
    [
      'a repeated id',
      [
        { id: 'x', start: 0, end: 1 },
        { id: 'x', start: 2, end: 3 }
      ]
    ]
  ])('refuses %s', (_name, segments) => {
    expect(codeOf(() => checkText('hello', segments))).toBe('validation')
  })

  it('names the segment that is wrong', () => {
    expect(() =>
      checkText('hello', [
        { start: 0, end: 2 },
        { start: 1, end: 3 }
      ])
    ).toThrow(/Segment 2/)
  })

  it('refuses text and segment lists over the limits', () => {
    expect(codeOf(() => checkText('x'.repeat(TEXT_MAX_UNITS + 1), []))).toBe('validation')
    expect(codeOf(() => checkText('x'.repeat(TEXT_MAX_UNITS), []))).toBeUndefined()
    const many = Array.from({ length: SEGMENTS_MAX + 1 }, () => ({ start: 0, end: 0 }))
    expect(codeOf(() => checkText('', many))).toBe('validation')
  })
})
