import { describe, expect, it } from 'vitest'
import { foldForSearch, matchesQuery } from './search'

describe('foldForSearch', () => {
  it('removes Vietnamese accents and maps đ to d', () => {
    expect(foldForSearch('Tiên Hiệp')).toBe('tien hiep')
    expect(foldForSearch('Đường phố Ngọc Đình')).toBe('duong pho ngoc dinh')
  })

  it('handles decomposed input the same as composed input', () => {
    expect(foldForSearch('Tiên Hiệp')).toBe('tien hiep')
  })

  it('leaves CJK and kana untouched', () => {
    expect(foldForSearch('玉庭記')).toBe('玉庭記')
    expect(foldForSearch('初雪の駅が')).toBe('初雪の駅が')
  })
})

describe('matchesQuery', () => {
  it('matches without diacritics and without case', () => {
    expect(matchesQuery('Tiên Hiệp', 'tien hiep')).toBe(true)
    expect(matchesQuery('Hiệu thuốc trên núi', 'DUOC')).toBe(false)
    expect(matchesQuery('Ngọc đình ký', 'dinh')).toBe(true)
  })

  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery('anything', '')).toBe(true)
    expect(matchesQuery('anything', '   ')).toBe(true)
  })

  it('finds CJK titles by their own characters', () => {
    expect(matchesQuery('玉庭記', '庭')).toBe(true)
    expect(matchesQuery('玉庭記', '駅')).toBe(false)
  })
})
