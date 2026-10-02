import { describe, expect, it } from 'vitest'
import { boldToggleEdit } from './boldCommand'

/**
 * `toggleBold` (the `Command`) needs a real `EditorView`, which the `node` test environment does
 * not provide — same limitation as the decoration builders. This tests the pure edit it computes.
 */

describe('boldToggleEdit', () => {
  it('wraps a plain selection with no existing bold on the line', () => {
    const line = 'Một a word đẹp'
    const from = line.indexOf('word')
    const to = from + 4
    const edit = boldToggleEdit({
      line,
      lineFrom: 100,
      from: 100 + from,
      to: 100 + to,
      selected: 'word'
    })
    expect(edit).toEqual({
      from: 100 + from,
      to: 100 + to,
      insert: '**word**',
      selFrom: 100 + from + 2,
      selTo: 100 + to + 2
    })
  })

  it('wraps an empty selection and leaves the caret between the two pairs', () => {
    const edit = boldToggleEdit({ line: 'abc', lineFrom: 5, from: 7, to: 7, selected: '' })
    expect(edit).toEqual({ from: 7, to: 7, insert: '****', selFrom: 9, selTo: 9 })
  })

  it('unwraps when the selection is exactly "**word**"', () => {
    const line = 'Một **word** đẹp'
    const start = line.indexOf('**word**')
    const edit = boldToggleEdit({
      line,
      lineFrom: 0,
      from: start,
      to: start + 8,
      selected: '**word**'
    })
    expect(edit).toEqual({
      from: start,
      to: start + 8,
      insert: 'word',
      selFrom: start + 2,
      selTo: start + 6
    })
  })

  it('unwraps the whole span when the caret sits in the middle of a bold word, with no selection', () => {
    const line = 'Một **word** đẹp'
    const caret = line.indexOf('wo') + 2 // between "wo" and "rd", inside the bold span
    const start = line.indexOf('**word**')
    const edit = boldToggleEdit({ line, lineFrom: 0, from: caret, to: caret, selected: '' })
    expect(edit).toEqual({
      from: start,
      to: start + 8,
      insert: 'word',
      selFrom: start + 2,
      selTo: start + 6
    })
  })

  it('unwraps when only part of the bold word is selected', () => {
    const line = 'Một **word** đẹp'
    const start = line.indexOf('**word**')
    const from = line.indexOf('or')
    const edit = boldToggleEdit({ line, lineFrom: 0, from, to: from + 2, selected: 'or' })
    expect(edit).toEqual({
      from: start,
      to: start + 8,
      insert: 'word',
      selFrom: start + 2,
      selTo: start + 6
    })
  })

  it('wraps instead of unwrapping when the selection only touches one side of a bold span', () => {
    // Selection starts before the bold span and ends inside it — not fully contained, so it wraps.
    const line = 'Một **word** đẹp'
    const from = line.indexOf('Một')
    const to = line.indexOf('or')
    const selected = line.slice(from, to)
    const edit = boldToggleEdit({ line, lineFrom: 0, from, to, selected })
    expect(edit).toEqual({
      from,
      to,
      insert: '**' + selected + '**',
      selFrom: from + 2,
      selTo: to + 2
    })
  })

  it('picks the bold span that actually contains the caret when there are two on the line', () => {
    const line = '**một** và **hai**'
    const secondStart = line.indexOf('**hai**')
    const caret = secondStart + 3 // inside "hai"
    const edit = boldToggleEdit({ line, lineFrom: 0, from: caret, to: caret, selected: '' })
    expect(edit.insert).toBe('hai')
    expect(edit.from).toBe(secondStart)
  })
})
