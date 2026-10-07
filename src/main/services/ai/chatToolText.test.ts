import { describe, expect, it } from 'vitest'
import {
  decodeCursor,
  encodeCursor,
  formatCount,
  paragraphAt,
  readPage,
  splitParagraphs
} from './chatToolText'

describe('splitParagraphs', () => {
  it('finds non-blank lines with CRLF and runs of blank lines, and owns everything between them', () => {
    const content = '\r\nMột.\r\n\r\n\r\nHai.\r\n  \r\nBa.\r\n'
    const spans = splitParagraphs(content)
    expect(spans.map((span) => content.slice(span.lineStart, span.lineEnd))).toEqual([
      'Một.',
      'Hai.',
      'Ba.'
    ])
    // The spans cover the whole text with no gap and no overlap.
    expect(spans.map((span) => content.slice(span.start, span.end)).join('')).toBe(content)
  })

  it('has no paragraph in an empty or blank text', () => {
    expect(splitParagraphs('')).toEqual([])
    expect(splitParagraphs('\n  \n')).toEqual([])
  })

  it('handles a text with no final line break', () => {
    const spans = splitParagraphs('a\nb')
    expect(spans).toEqual([
      { start: 0, end: 2, lineStart: 0, lineEnd: 1 },
      { start: 2, end: 3, lineStart: 2, lineEnd: 3 }
    ])
    expect(paragraphAt(spans, 0)).toBe(0)
    expect(paragraphAt(spans, 2)).toBe(1)
    expect(paragraphAt(spans, 3)).toBe(1)
  })
})

describe('cursor', () => {
  it('round-trips', () => {
    const cursor = { chapter: 3, side: 'target' as const, paragraph: 81, offset: 0, rev: 12 }
    expect(encodeCursor(cursor)).toBe('c3.target.p81.o0.r12')
    expect(decodeCursor('c3.target.p81.o0.r12')).toEqual(cursor)
  })

  it('reads nothing it did not write', () => {
    for (const bad of [
      '',
      'c3.target.p81',
      'c3.both.p1.o0.r1',
      'x3.source.p1.o0.r1',
      'c-1.source.p1.o0.r1'
    ]) {
      expect(decodeCursor(bad)).toBeNull()
    }
  })
})

describe('readPage', () => {
  const paragraphs = Array.from({ length: 30 }, (_, i) => `Đoạn ${i + 1}: ` + 'x'.repeat(90))
  const content = paragraphs.join('\n\n') + '\n'
  const spans = splitParagraphs(content)

  it('reads a short chapter whole', () => {
    const page = readPage(content, spans, 1, 0, 100_000)
    expect(page).toMatchObject({
      text: content,
      fromParagraph: 1,
      toParagraph: 30,
      total: 30,
      next: null
    })
  })

  it('reads a long chapter in pages that join back into exactly the text, ending on paragraph bounds', () => {
    const pieces: string[] = []
    let at: { paragraph: number; offset: number } | null = { paragraph: 1, offset: 0 }
    let pages = 0
    while (at) {
      const page = readPage(content, spans, at.paragraph, at.offset, 1_100)
      pieces.push(page.text)
      expect(page.cutInParagraph).toBe(false)
      if (page.next) expect(page.next.offset).toBe(0)
      at = page.next
      pages++
    }
    expect(pieces.join('')).toBe(content)
    expect(pages).toBe(3)
  })

  it('cuts a paragraph longer than the limit and goes on exactly where it stopped', () => {
    const long = 'a'.repeat(100) + '\n' + 'b'.repeat(400) + '\n' + 'c'.repeat(10)
    const longSpans = splitParagraphs(long)
    const first = readPage(long, longSpans, 2, 0, 200)
    expect(first.text).toBe('b'.repeat(200))
    expect(first).toMatchObject({ fromParagraph: 2, toParagraph: 2, cutInParagraph: true })
    expect(first.next).toEqual({ paragraph: 2, offset: 200 })
    const second = readPage(long, longSpans, 2, 200, 200)
    expect(second.text).toBe('b'.repeat(200))
    const third = readPage(long, longSpans, second.next!.paragraph, second.next!.offset, 200)
    expect(third.text).toBe('\n' + 'c'.repeat(10))
    expect(third.next).toBeNull()
  })
})

describe('formatCount', () => {
  it('groups thousands with dots', () => {
    expect(formatCount(19640)).toBe('19.640')
    expect(formatCount(80000)).toBe('80.000')
    expect(formatCount(7)).toBe('7')
  })
})
