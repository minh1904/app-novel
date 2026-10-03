import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { planLivePreview, type PlanItem } from './livePreviewDecorations'
import { markdownSupport } from './markdownSyntax'

/**
 * `build()` needs a real `EditorView` (DOM), which the `node` test environment does not provide, so
 * these test `planLivePreview`, the pure part that decides what gets marked and — the part IME safety
 * rests on — which delimiters hide and which stay visible. Nothing here covers the actual rendering
 * in a real window; that has not been checked.
 */

function plan(
  text: string,
  touches: (from: number, to: number) => boolean = () => false
): PlanItem[] {
  const state = EditorState.create({ doc: text, extensions: markdownSupport() })
  const tree = ensureSyntaxTree(state, state.doc.length, 5000)!
  return planLivePreview(tree, state.doc, [{ from: 0, to: state.doc.length }], touches)
}

describe('delimiters of a complete span', () => {
  it('hide when the selection does not touch the span', () => {
    expect(plan('Một **đậm** nữa')).toEqual([
      { from: 4, to: 6, kind: 'hidden' },
      { from: 6, to: 9, kind: 'bold' },
      { from: 9, to: 11, kind: 'hidden' }
    ])
  })

  it('stay visible, only dimmed, when the selection touches the span', () => {
    expect(plan('Một **đậm** nữa', () => true)).toEqual([
      { from: 4, to: 6, kind: 'marker' },
      { from: 6, to: 9, kind: 'bold' },
      { from: 9, to: 11, kind: 'marker' }
    ])
  })

  it('ask about the whole span, delimiters included, so the edge counts as touching', () => {
    const asked: Array<[number, number]> = []
    plan('Một **đậm** nữa', (from, to) => {
      asked.push([from, to])
      return false
    })
    expect(asked).toEqual([[4, 11]])
  })

  it('decide for each span on its own', () => {
    const text = '*a* và *b*'
    const items = plan(text, (from) => from === 0)
    expect(items.filter((item) => item.kind === 'marker').map((i) => i.from)).toEqual([0, 2])
    expect(items.filter((item) => item.kind === 'hidden').map((i) => i.from)).toEqual([7, 9])
  })

  it('are never planned for a span that is not closed yet', () => {
    expect(plan('Một câu có **từ quan trọng')).toEqual([])
  })

  it('are never planned for look-alikes: code, escapes, snake_case, URLs', () => {
    expect(plan('`a*b*c`')).toEqual([])
    expect(plan('snake_case_name')).toEqual([])
    expect(plan('[x](http://a_b_c.com/x_y_z)')).toEqual([])
    expect(plan('2 * 3 * 4')).toEqual([])
  })
})

describe('line prefixes', () => {
  it('keep a heading marker visible and size the text after it', () => {
    expect(plan('## Tên chương')).toEqual([
      { from: 0, to: 3, kind: 'marker' },
      { from: 3, to: 13, kind: 'h2' }
    ])
  })

  it('never hide a heading, quote or list marker, whatever the selection', () => {
    for (const text of ['# Tên', '> Lời', '- Ý', '1. Ý']) {
      for (const touching of [true, false]) {
        const items = plan(text, () => touching)
        expect(items.some((item) => item.kind === 'hidden')).toBe(false)
        expect(items[0].kind).toBe('marker')
      }
    }
  })

  it('style a quote with its marker dimmed', () => {
    expect(plan('> Lời thoại')).toEqual([
      { from: 0, to: 2, kind: 'marker' },
      { from: 2, to: 11, kind: 'quote' }
    ])
  })

  it('dim only the marker of a list item', () => {
    expect(plan('- Một ý')).toEqual([{ from: 0, to: 2, kind: 'marker' }])
  })

  it('also hide the delimiters of emphasis inside a heading or a list item', () => {
    expect(plan('- một **đậm**').filter((item) => item.kind === 'hidden')).toHaveLength(2)
    expect(plan('# Tên **chương**').filter((item) => item.kind === 'hidden')).toHaveLength(2)
  })

  it('leave a deeper heading, a face and a bare > as plain text', () => {
    expect(plan('#### Quá nhiều')).toEqual([])
    expect(plan('>_<')).toEqual([])
    expect(plan('Giá > 10')).toEqual([])
  })
})
