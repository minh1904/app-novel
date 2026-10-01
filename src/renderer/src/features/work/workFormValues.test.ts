import { describe, expect, it } from 'vitest'
import { buildPatch, emptyWorkForm, type WorkFormValues } from './workFormValues'

const base: WorkFormValues = {
  ...emptyWorkForm,
  title: 'Hiệu thuốc trên núi',
  sourceLang: 'zh-Hans',
  author: 'Lý Minh',
  genre: 'Tiên hiệp',
  cover: 'data:image/jpeg;base64,AAA'
}

describe('buildPatch', () => {
  it('is empty when nothing changed', () => {
    expect(buildPatch(base, { ...base })).toEqual({})
  })

  it('sends only the fields that changed', () => {
    expect(buildPatch(base, { ...base, author: 'Trần An' })).toEqual({ author: 'Trần An' })
    expect(buildPatch(base, { ...base, title: 'Tên mới', genre: 'Cổ đại' })).toEqual({
      title: 'Tên mới',
      genre: 'Cổ đại'
    })
  })

  it('clears an optional field with null when it was emptied', () => {
    expect(buildPatch(base, { ...base, author: '' })).toEqual({ author: null })
    expect(buildPatch(base, { ...base, author: '   ' })).toEqual({ author: null })
  })

  it('treats a field that was already empty as unchanged', () => {
    expect(buildPatch(base, { ...base, description: '' })).toEqual({})
  })

  it('replaces, keeps and removes the cover', () => {
    expect(buildPatch(base, { ...base, cover: 'data:image/jpeg;base64,BBB' })).toEqual({
      cover: 'data:image/jpeg;base64,BBB'
    })
    expect(buildPatch(base, { ...base, cover: null })).toEqual({ cover: null })
    expect(buildPatch({ ...base, cover: null }, { ...base, cover: null })).toEqual({})
  })

  it('never sends the source language', () => {
    expect(buildPatch(base, { ...base, sourceLang: 'ja' })).toEqual({})
  })
})
