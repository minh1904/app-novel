import { describe, expect, it } from 'vitest'
import { buildLocation, locationLabel } from './chatLocation'

const SOURCE = '一。\n\n二。\n\n三。\n\n四。'
const TARGET = 'Một.\n\nHai.\n\nBa.'

const at = (text: string, needle: string): number => text.indexOf(needle)

describe('buildLocation', () => {
  it('names the caret paragraph on each side and no selection when nothing is selected', () => {
    const location = buildLocation({
      sourceText: SOURCE,
      targetText: TARGET,
      source: { from: at(SOURCE, '三'), to: at(SOURCE, '三'), selected: false },
      target: { from: at(TARGET, 'Hai'), to: at(TARGET, 'Hai.') + 4, selected: false },
      active: 'target'
    })
    expect(location).toEqual({ caret: { source: 3, target: 2 }, selection: null })
  })

  it('counts a selection across several paragraphs in the active pane', () => {
    const location = buildLocation({
      sourceText: SOURCE,
      targetText: TARGET,
      source: null,
      target: { from: at(TARGET, 'ai.'), to: at(TARGET, 'Ba.') + 2, selected: true },
      active: 'target'
    })
    expect(location).toEqual({
      caret: { source: null, target: 2 },
      selection: { side: 'target', from: 2, to: 3 }
    })
  })

  it('does not count the paragraph a selection merely reaches the start of', () => {
    const location = buildLocation({
      sourceText: SOURCE,
      targetText: TARGET,
      source: { from: 0, to: at(SOURCE, '二'), selected: true },
      target: null,
      active: 'source'
    })
    expect(location.selection).toEqual({ side: 'source', from: 1, to: 1 })
  })

  it('takes the selection of the pane touched last only', () => {
    const location = buildLocation({
      sourceText: SOURCE,
      targetText: TARGET,
      source: { from: 0, to: SOURCE.length, selected: true },
      target: { from: 0, to: 0, selected: false },
      active: 'target'
    })
    expect(location.selection).toBeNull()
  })

  it('has no caret on an empty pane', () => {
    const location = buildLocation({
      sourceText: SOURCE,
      targetText: '',
      source: null,
      target: { from: 0, to: 0, selected: false },
      active: 'target'
    })
    expect(location.caret).toEqual({ source: null, target: null })
  })
})

describe('locationLabel', () => {
  it('prefers the selection, then the translation caret, then the source caret', () => {
    expect(
      locationLabel({
        caret: { source: 1, target: 2 },
        selection: { side: 'target', from: 2, to: 4 }
      })
    ).toBe('đang chọn đoạn 2–4 bản dịch')
    expect(locationLabel({ caret: { source: 1, target: 2 }, selection: null })).toBe(
      'đoạn 2 bản dịch'
    )
    expect(locationLabel({ caret: { source: 1, target: null }, selection: null })).toBe(
      'đoạn 1 bản gốc'
    )
    expect(locationLabel({ caret: { source: null, target: null }, selection: null })).toBe(
      'chưa đặt con trỏ'
    )
  })
})
