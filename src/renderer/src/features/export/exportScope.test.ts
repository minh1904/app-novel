import { describe, expect, it } from 'vitest'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import { foldNumbers, planScope, readExportPrefs, DEFAULT_EXPORT_PREFS } from './exportScope'

const chapter = (number: number, hasTarget: boolean): ChapterItem =>
  ({ id: 'c' + number, number, title: '', hasSource: true, hasTarget }) as ChapterItem

const chapters = [1, 2, 3, 4, 5].map((number) => chapter(number, number !== 2 && number !== 4))

describe('planScope', () => {
  it('splits the scope into what is written and what has no translation', () => {
    const plan = planScope(chapters, { kind: 'all' })
    expect(plan.included.map((c) => c.number)).toEqual([1, 3, 5])
    expect(plan.skipped.map((c) => c.number)).toEqual([2, 4])
  })

  it('takes a range in either order, ends included', () => {
    const plan = planScope(chapters, { kind: 'range', from: 4, to: 2 })
    expect(plan.included.map((c) => c.number)).toEqual([3])
    expect(plan.skipped.map((c) => c.number)).toEqual([2, 4])
  })

  it('takes the selected chapters', () => {
    const plan = planScope(chapters, { kind: 'selected', ids: new Set(['c1', 'c2']) })
    expect(plan.included.map((c) => c.number)).toEqual([1])
    expect(plan.skipped.map((c) => c.number)).toEqual([2])
  })
})

describe('foldNumbers', () => {
  it('folds runs and cuts a long list', () => {
    expect(foldNumbers([15, 3, 12, 13, 14, 7])).toBe('3, 7, 12–15')
    expect(foldNumbers([1, 3, 5, 7], 2)).toBe('1, 3 và 2 chương khác')
  })
})

describe('readExportPrefs', () => {
  it('gives the defaults without storage', () => {
    expect(readExportPrefs()).toEqual(DEFAULT_EXPORT_PREFS)
  })
})
