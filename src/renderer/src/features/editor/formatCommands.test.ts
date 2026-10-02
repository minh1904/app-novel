import { describe, expect, it } from 'vitest'
import { wrapToggleEdit } from './formatCommands'

/**
 * `toggleBold`/`toggleItalic` (the `Command`s) need a real `EditorView`, which the `node` test
 * environment does not provide — same limitation as the decoration builders. This tests the pure
 * edit `wrapToggleEdit` computes, for both delimiters it is actually bound to.
 */

describe.each([
  { name: 'bold', delim: '**' },
  { name: 'italic', delim: '*' }
])('wrapToggleEdit ($name, delim=$delim)', ({ delim }) => {
  it('wraps a plain selection with no existing wrap on the line', () => {
    const line = 'Một a word đẹp'
    const from = line.indexOf('word')
    const to = from + 4
    const edit = wrapToggleEdit({
      line,
      lineFrom: 100,
      from: 100 + from,
      to: 100 + to,
      selected: 'word',
      delim
    })
    expect(edit).toEqual({
      from: 100 + from,
      to: 100 + to,
      insert: delim + 'word' + delim,
      selFrom: 100 + from + delim.length,
      selTo: 100 + to + delim.length
    })
  })

  it('wraps an empty selection and leaves the caret between the two pairs', () => {
    const edit = wrapToggleEdit({ line: 'abc', lineFrom: 5, from: 7, to: 7, selected: '', delim })
    expect(edit).toEqual({
      from: 7,
      to: 7,
      insert: delim + delim,
      selFrom: 7 + delim.length,
      selTo: 7 + delim.length
    })
  })

  it('unwraps when the selection is exactly the wrapped span', () => {
    const line = 'Một ' + delim + 'word' + delim + ' đẹp'
    const start = line.indexOf(delim + 'word' + delim)
    const to = start + delim.length * 2 + 4
    const edit = wrapToggleEdit({
      line,
      lineFrom: 0,
      from: start,
      to,
      selected: delim + 'word' + delim,
      delim
    })
    expect(edit).toEqual({
      from: start,
      to,
      insert: 'word',
      selFrom: start + delim.length,
      selTo: start + delim.length + 4
    })
  })

  it('unwraps the whole span when the caret sits in the middle, with no selection', () => {
    const line = 'Một ' + delim + 'word' + delim + ' đẹp'
    const start = line.indexOf(delim + 'word' + delim)
    const caret = start + delim.length + 2 // between "wo" and "rd"
    const edit = wrapToggleEdit({ line, lineFrom: 0, from: caret, to: caret, selected: '', delim })
    expect(edit.insert).toBe('word')
    expect(edit.from).toBe(start)
  })

  it('wraps instead of unwrapping when the selection only touches one side of a wrapped span', () => {
    const line = 'Một ' + delim + 'word' + delim + ' đẹp'
    const from = line.indexOf('Một')
    const to = line.indexOf('or')
    const selected = line.slice(from, to)
    const edit = wrapToggleEdit({ line, lineFrom: 0, from, to, selected, delim })
    expect(edit).toEqual({
      from,
      to,
      insert: delim + selected + delim,
      selFrom: from + delim.length,
      selTo: to + delim.length
    })
  })
})

describe('bold and italic do not read into each other', () => {
  it('Ctrl+I inside a bold-only span wraps instead of mistaking ** for *', () => {
    // "**word**" has no single-* span inside it to unwrap (the `*` character class excludes `*`
    // itself, so a bold delimiter never parses as a nested italic one).
    const line = 'Một **word** đẹp'
    const caret = line.indexOf('wo') + 2
    const edit = wrapToggleEdit({
      line,
      lineFrom: 0,
      from: caret,
      to: caret,
      selected: '',
      delim: '*'
    })
    expect(edit.insert).toBe('**')
  })
})
