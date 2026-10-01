import { describe, expect, it } from 'vitest'
import type { ChapterItem } from '../../../../shared/chapters'
import {
  clampPage,
  displayTitle,
  filterChapters,
  fold,
  pageCount,
  pageOfPosition,
  pageRange,
  pageWindow,
  parseQuery,
  slicePage
} from './chapterList'

function chapters(titles: string[]): ChapterItem[] {
  return titles.map((title, index) => ({
    id: 'id-' + index,
    number: index + 1,
    title,
    createdAt: 0,
    updatedAt: 0
  }))
}

describe('displayTitle', () => {
  it('falls back to "Chương N" for an untitled chapter', () => {
    expect(displayTitle({ number: 12, title: '' })).toBe('Chương 12')
    expect(displayTitle({ number: 12, title: 'Mở đầu' })).toBe('Mở đầu')
  })
})

describe('fold', () => {
  it('removes Vietnamese marks, including đ, and lower-cases', () => {
    expect(fold('Cuộc gặp gỡ')).toBe('cuoc gap go')
    expect(fold('ĐƯỜNG Đi')).toBe('duong di')
    expect(fold('Hiệu thuốc trên núi')).toBe('hieu thuoc tren nui')
  })

  it('composes with text typed in either Unicode form', () => {
    expect(fold('ỏ')).toBe('o')
    expect(fold('ỏ')).toBe('o')
  })
})

describe('parseQuery', () => {
  it.each([
    ['', { kind: 'empty' }],
    ['   ', { kind: 'empty' }],
    ['1500', { kind: 'jump', number: 1500 }],
    [' 7 ', { kind: 'jump', number: 7 }],
    ['0', { kind: 'jump', number: 0 }],
    ['gap go', { kind: 'filter', text: 'gap go' }],
    ['chương 12', { kind: 'filter', text: 'chương 12' }],
    ['12a', { kind: 'filter', text: '12a' }],
    ['-3', { kind: 'filter', text: '-3' }],
    ['1.5', { kind: 'filter', text: '1.5' }]
  ])('reads %j', (raw, expected) => {
    expect(parseQuery(raw)).toEqual(expected)
  })
})

describe('filterChapters', () => {
  const list = chapters(['Mở đầu', '', 'Cuộc gặp gỡ', 'Đường về'])

  it('matches without caring for case or marks', () => {
    expect(filterChapters(list, 'gap go').map((c) => c.number)).toEqual([3])
    expect(filterChapters(list, 'DUONG').map((c) => c.number)).toEqual([4])
  })

  it('matches the displayed name of an untitled chapter', () => {
    expect(filterChapters(list, 'chuong 2').map((c) => c.number)).toEqual([2])
  })

  it('keeps everything for blank text and nothing for a miss', () => {
    expect(filterChapters(list, '  ')).toBe(list)
    expect(filterChapters(list, 'khong co')).toEqual([])
  })
})

describe('paging', () => {
  it('counts pages, never fewer than one', () => {
    expect(pageCount(0, 50)).toBe(1)
    expect(pageCount(50, 50)).toBe(1)
    expect(pageCount(51, 50)).toBe(2)
    expect(pageCount(248, 50)).toBe(5)
    expect(pageCount(2000, 100)).toBe(20)
  })

  it('finds the page that holds a position', () => {
    expect(pageOfPosition(1, 50)).toBe(1)
    expect(pageOfPosition(50, 50)).toBe(1)
    expect(pageOfPosition(51, 50)).toBe(2)
    expect(pageOfPosition(1500, 50)).toBe(30)
    expect(pageOfPosition(1500, 100)).toBe(15)
  })

  it('clamps a stale page after the list shrinks', () => {
    expect(clampPage(5, 201, 50)).toBe(5)
    expect(clampPage(5, 200, 50)).toBe(4)
    expect(clampPage(0, 10, 50)).toBe(1)
    expect(clampPage(3, 0, 50)).toBe(1)
  })

  it('slices the requested page and the short last page', () => {
    const items = Array.from({ length: 248 }, (_, i) => i + 1)
    expect(slicePage(items, 1, 50)).toHaveLength(50)
    expect(slicePage(items, 1, 50)[0]).toBe(1)
    expect(slicePage(items, 5, 50)).toEqual([
      201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219,
      220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238,
      239, 240, 241, 242, 243, 244, 245, 246, 247, 248
    ])
    expect(slicePage(items, 9, 50)[0]).toBe(201)
  })

  it('reports the range being shown', () => {
    expect(pageRange(1, 248, 50)).toEqual({ from: 1, to: 50 })
    expect(pageRange(5, 248, 50)).toEqual({ from: 201, to: 248 })
    expect(pageRange(1, 0, 50)).toEqual({ from: 0, to: 0 })
  })

  it('offers first, last and neighbours with ellipses between', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 20])
    expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20])
    expect(pageWindow(20, 20)).toEqual([1, null, 19, 20])
  })
})
