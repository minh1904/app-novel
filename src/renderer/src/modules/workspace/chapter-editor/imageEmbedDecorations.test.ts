import { describe, expect, it } from 'vitest'
import { EMBED_RE } from './imageEmbedDecorations'

/**
 * `build()` needs a real `EditorView` (DOM), which the `node` test environment does not provide
 * (same limitation as `livePreviewDecorations.test.ts`), so this tests the token syntax itself: what
 * counts as a complete, parseable image embed.
 */

function matches(text: string): Array<{ id: string; width: number | null }> {
  EMBED_RE.lastIndex = 0
  const found: Array<{ id: string; width: number | null }> = []
  let match: RegExpExecArray | null
  while ((match = EMBED_RE.exec(text))) {
    found.push({ id: match[1].toLowerCase(), width: match[2] ? Number(match[2]) : null })
  }
  return found
}

const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

describe('EMBED_RE', () => {
  it('matches a bare embed and one with a width suffix', () => {
    expect(matches('![[' + ID + ']]')).toEqual([{ id: ID, width: null }])
    expect(matches('![[' + ID + '|300]]')).toEqual([{ id: ID, width: 300 }])
  })

  it('is case-insensitive on the hex digits', () => {
    expect(matches('![[' + ID.toUpperCase() + ']]')).toEqual([{ id: ID, width: null }])
  })

  it('finds an embed in the middle of a sentence', () => {
    expect(matches('Trước đó\n![[' + ID + '|120]] rồi tới đoạn sau')).toEqual([
      { id: ID, width: 120 }
    ])
  })

  it('finds more than one embed on its own', () => {
    const other = '00000000-0000-4000-8000-000000000000'
    expect(matches('![[' + ID + ']] và ![[' + other + '|50]]')).toEqual([
      { id: ID, width: null },
      { id: other, width: 50 }
    ])
  })

  it('does not match a value that is not a well-formed UUID', () => {
    expect(matches('![[not-an-id]]')).toEqual([])
    expect(matches('![[' + ID.slice(0, -1) + ']]')).toEqual([])
  })

  it('does not match an incomplete token', () => {
    expect(matches('![[' + ID)).toEqual([])
    expect(matches('[[' + ID + ']]')).toEqual([])
  })

  it('finds nothing in plain text', () => {
    expect(matches('Một câu bình thường, không có ảnh nào.')).toEqual([])
  })
})
