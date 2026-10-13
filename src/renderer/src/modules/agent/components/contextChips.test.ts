import { describe, expect, it } from 'vitest'
import { contextChips, withoutChips } from './contextChips'

const context = {
  workId: 'w',
  chapterId: 'c',
  caret: { source: 2, target: null },
  selection: { side: 'target' as const, from: 3, to: 5 }
}

describe('context chips', () => {
  it('names work, chapter and the selection the user sees', () => {
    expect(contextChips(context, { work: 'Kiếm Lai', chapter: 'Chương 3' })).toEqual([
      { key: 'work', label: 'Kiếm Lai' },
      { key: 'chapter', label: 'Chương 3' },
      { key: 'selection', label: 'Đoạn 3–5 bản dịch' }
    ])
    expect(contextChips({ workId: 'w', chapterId: 'c', caret: context.caret }, {})).toContainEqual({
      key: 'caret',
      label: 'Con trỏ ở đoạn 2 bản gốc'
    })
    expect(contextChips({}, {})).toEqual([])
  })

  it('drops a removed chip and everything that depends on it', () => {
    expect(withoutChips(context, new Set())).toEqual(context)
    expect(withoutChips(context, new Set(['chapter']))).toEqual({ workId: 'w' })
    expect(withoutChips(context, new Set(['work']))).toEqual({})
    expect(withoutChips(context, new Set(['selection']))).toEqual({ workId: 'w', chapterId: 'c' })
  })
})
