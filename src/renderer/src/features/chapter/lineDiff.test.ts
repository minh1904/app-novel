import { describe, expect, it } from 'vitest'
import { diffLines, diffSummary } from './lineDiff'

/**
 * The diff shown before a proposal may be applied.
 *
 * The property that matters is that nothing goes missing: every line of the old text appears as `same`
 * or `removed`, and every line of the new text as `same` or `added`. A diff that quietly drops a line
 * would show the translator a smaller change than the one they are about to accept.
 */

const linesOf = (text: string): string[] => (text === '' ? [] : text.split('\n'))

/** Reconstruct both sides from the diff; neither may lose a line. */
function roundTrip(before: string, after: string): void {
  const diff = diffLines(before, after)
  expect(diff.filter((line) => line.kind !== 'added').map((line) => line.text)).toEqual(
    linesOf(before)
  )
  expect(diff.filter((line) => line.kind !== 'removed').map((line) => line.text)).toEqual(
    linesOf(after)
  )
}

describe('diffLines', () => {
  it('marks nothing when the texts match', () => {
    const diff = diffLines('một\nhai', 'một\nhai')
    expect(diff.every((line) => line.kind === 'same')).toBe(true)
  })

  it('marks a replaced line as removed then added', () => {
    expect(diffLines('một\nhai\nba', 'một\nHAI\nba')).toEqual([
      { kind: 'same', text: 'một' },
      { kind: 'removed', text: 'hai' },
      { kind: 'added', text: 'HAI' },
      { kind: 'same', text: 'ba' }
    ])
  })

  it('marks an inserted line', () => {
    expect(diffLines('một\nba', 'một\nhai\nba')).toEqual([
      { kind: 'same', text: 'một' },
      { kind: 'added', text: 'hai' },
      { kind: 'same', text: 'ba' }
    ])
  })

  it('marks a deleted line', () => {
    expect(diffLines('một\nhai\nba', 'một\nba')).toEqual([
      { kind: 'same', text: 'một' },
      { kind: 'removed', text: 'hai' },
      { kind: 'same', text: 'ba' }
    ])
  })

  it('handles a whole-paragraph rewrite', () => {
    const diff = diffLines('Câu cũ hoàn toàn.', 'Câu mới hoàn toàn.')
    expect(diff.map((line) => line.kind)).toEqual(['removed', 'added'])
  })

  it('handles an empty side', () => {
    expect(diffLines('', 'mới')).toEqual([{ kind: 'added', text: 'mới' }])
    expect(diffLines('cũ', '')).toEqual([{ kind: 'removed', text: 'cũ' }])
    expect(diffLines('', '')).toEqual([])
  })

  it('loses no line, whatever the shape of the change', () => {
    roundTrip('một\nhai\nba', 'một\nHAI\nba')
    roundTrip('một\nhai\nba\nbốn', 'ba\nmột')
    roundTrip('a\n\nb', 'a\n\nb\n\nc')
    roundTrip('Đoạn một.\n\nĐoạn hai.', 'Đoạn một đã sửa.\n\nĐoạn hai.\n\nĐoạn ba.')
    roundTrip('', 'chỉ thêm')
    roundTrip('chỉ bớt', '')
  })

  it('keeps blank lines, because paragraph breaks are content here', () => {
    const diff = diffLines('một\n\nhai', 'một\n\nhai\n\nba')
    expect(diff.filter((line) => line.text === '')).toHaveLength(2)
  })
})

describe('diffSummary', () => {
  it('counts added and removed lines', () => {
    expect(diffSummary(diffLines('một\nhai\nba', 'một\nHAI\nba'))).toEqual({
      added: 1,
      removed: 1
    })
  })

  it('counts nothing for an unchanged text', () => {
    expect(diffSummary(diffLines('một', 'một'))).toEqual({ added: 0, removed: 0 })
  })
})
