import { ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { toggleWrapChanges } from './formatCommands'
import { markdownSupport, type InlineKind } from './markdownSyntax'

/**
 * Kiểm tra hàm `toggleWrapChanges` cho các thao tác bật/tắt định dạng trên văn bản và vùng chọn.
 */

interface Result {
  doc: string
  /** Văn bản thuộc vùng chọn đầu tiên. */
  selected: string
  /** Vị trí bắt đầu và kết thúc của vùng chọn đầu tiên. */
  from: number
  to: number
  /** Văn bản thuộc tất cả các vùng chọn. */
  allSelected: string[]
}

function toggle(
  text: string,
  ranges: Array<[number, number]>,
  delim: string,
  kind: InlineKind
): Result {
  const state = EditorState.create({
    doc: text,
    selection: EditorSelection.create(ranges.map(([from, to]) => EditorSelection.range(from, to))),
    extensions: [markdownSupport(), EditorState.allowMultipleSelections.of(true)]
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  const next = state.update(toggleWrapChanges(state, delim, kind)).state
  const first = next.selection.main
  return {
    doc: next.doc.toString(),
    selected: next.sliceDoc(first.from, first.to),
    from: first.from,
    to: first.to,
    allSelected: next.selection.ranges.map((range) => next.sliceDoc(range.from, range.to))
  }
}

describe.each([
  { name: 'bold', delim: '**', kind: 'bold' as const },
  { name: 'italic', delim: '*', kind: 'italic' as const }
])('toggle ($name, delim=$delim)', ({ delim, kind }) => {
  const wrapped = 'Một ' + delim + 'word' + delim + ' đẹp'
  const start = wrapped.indexOf(delim + 'word')

  it('wraps a plain selection and keeps just the word selected', () => {
    const text = 'Một a word đẹp'
    const from = text.indexOf('word')
    const result = toggle(text, [[from, from + 4]], delim, kind)
    expect(result.doc).toBe('Một a ' + delim + 'word' + delim + ' đẹp')
    expect(result.selected).toBe('word')
  })

  it('wraps an empty selection and leaves the caret between the two pairs', () => {
    const result = toggle('abc', [[1, 1]], delim, kind)
    expect(result.doc).toBe('a' + delim + delim + 'bc')
    expect(result.from).toBe(1 + delim.length)
    expect(result.to).toBe(1 + delim.length)
  })

  it('unwraps when the selection is exactly the wrapped span, and selects the plain word', () => {
    const end = start + delim.length * 2 + 4
    const result = toggle(wrapped, [[start, end]], delim, kind)
    expect(result.doc).toBe('Một word đẹp')
    expect(result.selected).toBe('word')
  })

  it('unwraps the whole span when the caret sits in the middle, with no selection', () => {
    const caret = start + delim.length + 2 // ở giữa "wo" và "rd"
    const result = toggle(wrapped, [[caret, caret]], delim, kind)
    expect(result.doc).toBe('Một word đẹp')
    expect(result.selected).toBe('word')
  })

  it('unwraps when the caret is right at the edge of the span', () => {
    const end = start + delim.length * 2 + 4
    const result = toggle(wrapped, [[end, end]], delim, kind)
    expect(result.doc).toBe('Một word đẹp')
  })

  it('wraps instead of unwrapping when the selection only touches one side of a wrapped span', () => {
    const from = wrapped.indexOf('Một')
    const to = wrapped.indexOf('or')
    const result = toggle(wrapped, [[from, to]], delim, kind)
    expect(result.doc).toBe(
      wrapped.slice(0, from) + delim + wrapped.slice(from, to) + delim + wrapped.slice(to)
    )
  })

  it('unwraps each of several carets in its own span, with every selection in place', () => {
    const text = 'a ' + delim + 'b' + delim + ' c ' + delim + 'd' + delim + ' e'
    const inB = text.indexOf('b')
    const inD = text.indexOf('d')
    const result = toggle(
      text,
      [
        [inB, inB],
        [inD, inD]
      ],
      delim,
      kind
    )
    expect(result.doc).toBe('a b c d e')
    expect(result.allSelected).toEqual(['b', 'd'])
  })

  it('does not reach into a span that runs over a line break', () => {
    const text = 'dòng ' + delim + 'một\nhai' + delim + ' ba'
    const caret = text.indexOf('hai') + 1
    const result = toggle(text, [[caret, caret]], delim, kind)
    expect(result.doc).toBe(text.slice(0, caret) + delim + delim + text.slice(caret))
  })
})

describe('bold and italic do not read into each other', () => {
  it('Ctrl+I inside a bold-only span adds an empty pair and leaves the ** alone', () => {
    const text = 'Một **word** đẹp'
    const caret = text.indexOf('wo') + 2
    const result = toggle(text, [[caret, caret]], '*', 'italic')
    expect(result.doc).toBe(text.slice(0, caret) + '**' + text.slice(caret))
    expect(result.from).toBe(caret + 1)
  })

  it('Ctrl+B in a bold that has an italic inside removes the bold and keeps the italic', () => {
    const text = '**a *b* c**'
    const caret = text.indexOf('b')
    const result = toggle(text, [[caret, caret]], '**', 'bold')
    expect(result.doc).toBe('a *b* c')
    expect(result.selected).toBe('a *b* c')
  })

  it('Ctrl+I in that italic removes the italic and keeps the bold', () => {
    const text = '**a *b* c**'
    const caret = text.indexOf('b')
    const result = toggle(text, [[caret, caret]], '*', 'italic')
    expect(result.doc).toBe('**a b c**')
    expect(result.selected).toBe('b')
  })

  it('Ctrl+I also unwraps an _italic_ written with underscores', () => {
    const text = 'Một _word_ đẹp'
    const caret = text.indexOf('wo') + 2
    const result = toggle(text, [[caret, caret]], '*', 'italic')
    expect(result.doc).toBe('Một word đẹp')
    expect(result.selected).toBe('word')
  })
})
