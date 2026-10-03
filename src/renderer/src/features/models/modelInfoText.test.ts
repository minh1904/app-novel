import { describe, expect, it } from 'vitest'
import { contextOf, filterModels, priceOf } from './modelInfoText'

describe('priceOf', () => {
  it('says the price is not known rather than showing zero', () => {
    expect(priceOf({})).toBe('chưa biết giá')
    expect(priceOf({ inputCost: 0.3 })).toBe('chưa biết giá')
    expect(priceOf({ outputCost: 2.5 })).toBe('chưa biết giá')
  })

  it('shows input and output per million tokens', () => {
    expect(priceOf({ inputCost: 0.3, outputCost: 2.5 })).toBe('0.3 / 2.5 $/1M')
  })

  it('shows a price that really is 0 as 0, because that one is known', () => {
    expect(priceOf({ inputCost: 0, outputCost: 0 })).toBe('0 / 0 $/1M')
  })
})

describe('contextOf', () => {
  it('is nothing when the limit is not known, and grouped digits when it is', () => {
    expect(contextOf({})).toBeNull()
    expect(contextOf({ contextLimit: 1048576 })).toBe('1.048.576 token')
  })
})

describe('filterModels', () => {
  const models = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B' }
  ]

  it('shows everything for an empty or blank box, in the endpoint order', () => {
    expect(filterModels(models, '')).toEqual(models)
    expect(filterModels(models, '   ')).toEqual(models)
  })

  it('keeps the models whose id contains the text, ignoring case', () => {
    expect(filterModels(models, 'FLASH').map((model) => model.id)).toEqual(['gemini-2.5-flash'])
    expect(filterModels(models, 'gemini').map((model) => model.id)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ])
  })

  it('also matches the display name, which can differ from the id', () => {
    expect(filterModels(models, '31b').map((model) => model.id)).toEqual(['gemma-4-31b-it'])
    expect(filterModels([{ id: 'x1', name: 'Tên lạ' }], 'tên lạ')).toHaveLength(1)
  })

  it('ignores spaces around what was typed', () => {
    expect(filterModels(models, ' pro ').map((model) => model.id)).toEqual(['gemini-2.5-pro'])
  })

  it('finds nothing for text that is nowhere, and does not touch the list it was given', () => {
    expect(filterModels(models, 'zzz')).toEqual([])
    expect(models).toHaveLength(3)
  })
})
