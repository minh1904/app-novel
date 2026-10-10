import { describe, expect, it } from 'vitest'
import { estimateCost } from '../../services/ai/costEstimate'
import {
  CATALOG_READ_AT,
  catalogProviderIds,
  listModels,
  lookupModel,
  normalizeModelId
} from './modelCatalog'

describe('normalizeModelId', () => {
  it('drops the models/ prefix the Google listing may add', () => {
    expect(normalizeModelId('models/gemini-flash-latest')).toBe('gemini-flash-latest')
  })

  it('leaves an id without the prefix alone, and trims stray spaces', () => {
    expect(normalizeModelId('gemini-flash-latest')).toBe('gemini-flash-latest')
    expect(normalizeModelId('  gemini-flash-latest ')).toBe('gemini-flash-latest')
  })

  it('does not touch a prefix in the middle of the id', () => {
    expect(normalizeModelId('vendor/models/x')).toBe('vendor/models/x')
  })
})

describe('lookupModel', () => {
  it('finds a model inside the provider it belongs to', () => {
    const model = lookupModel('gemini-flash-latest', 'google')
    expect(model?.id).toBe('gemini-flash-latest')
    expect(model?.contextLimit).toBeGreaterThan(0)
  })

  it('finds the same model through either id form', () => {
    expect(lookupModel('models/gemini-flash-latest', 'google')).toEqual(
      lookupModel('gemini-flash-latest', 'google')
    )
  })

  it('searches every provider when the caller does not know which one answers', () => {
    // A gateway connection hides the upstream, so the provider id is unknown.
    expect(lookupModel('gemini-flash-latest')?.id).toBe('gemini-flash-latest')
  })

  it('returns undefined for an alias the user invented in their own gateway', () => {
    expect(lookupModel('ten-rieng-cua-toi')).toBeUndefined()
    expect(lookupModel('gemini-flash-latest', 'khong-co-nha-cung-cap-nay')).toBeUndefined()
  })
})

describe('catalog snapshot', () => {
  it('carries the date it was read, so the UI can say when prices are from', () => {
    expect(CATALOG_READ_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('covers the providers the first slice has presets for', () => {
    expect(catalogProviderIds()).toEqual(expect.arrayContaining(['google', 'openrouter']))
    expect(listModels('google').length).toBeGreaterThan(0)
  })
})

describe('reasoning options', () => {
  // These rows are read from the shipped snapshot on purpose: the test fails if a refresh drops the field
  // again (the refresh script once kept only `reasoning: true`), and it names the models whose shape the
  // capability table in `modelCapability` is built around.
  it('keeps the toggle and the budget of a model that can switch thinking off', () => {
    expect(lookupModel('gemini-2.5-flash', 'google')?.reasoningOptions).toEqual([
      { type: 'toggle' },
      { type: 'budget_tokens', min: 0, max: 24576 }
    ])
  })

  it('keeps a budget that cannot reach zero, so the model cannot be switched off', () => {
    expect(lookupModel('gemini-2.5-pro', 'google')?.reasoningOptions).toEqual([
      { type: 'budget_tokens', min: 128, max: 32768 }
    ])
  })

  it('keeps the effort levels a model names, without inventing a "none"', () => {
    expect(lookupModel('gemini-3.5-flash', 'google')?.reasoningOptions).toEqual([
      { type: 'effort', values: ['minimal', 'low', 'medium', 'high'] }
    ])
  })

  it('leaves the field out when the source says nothing, instead of writing an empty list', () => {
    for (const provider of catalogProviderIds()) {
      for (const model of listModels(provider)) {
        if (model.reasoningOptions !== undefined) {
          expect(model.reasoningOptions.length, provider + '/' + model.id).toBeGreaterThan(0)
        }
      }
    }
  })

  it('only holds shapes the capability table knows how to read', () => {
    for (const provider of catalogProviderIds()) {
      for (const model of listModels(provider)) {
        for (const option of model.reasoningOptions ?? []) {
          expect(['effort', 'toggle', 'budget_tokens']).toContain(option.type)
          if (option.type === 'effort') expect(option.values.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('temperature flag', () => {
  it('is written only where the source says the model does not take a temperature', () => {
    const noTemperature = catalogProviderIds()
      .flatMap((provider) => listModels(provider))
      .filter((model) => model.temperature !== undefined)
    expect(noTemperature.length).toBeGreaterThan(0)
    for (const model of noTemperature) expect(model.temperature).toBe(false)
  })

  it('is false for a reasoning model that refuses it', () => {
    const model = lookupModel('o4-mini', 'openai')
    expect(model?.reasoning).toBe(true)
    expect(model?.temperature).toBe(false)
  })

  it('is absent for a model that takes it', () => {
    expect(lookupModel('gemini-2.5-flash', 'google')?.temperature).toBeUndefined()
  })
})

describe('estimateCost', () => {
  const model = { id: 'm', name: 'M', cost: { input: 1, output: 2 } }

  it('counts fewer tokens per character for Chinese than for English', () => {
    const zh = estimateCost({ sourceChars: 1000, sourceLang: 'zh-Hans', batchCount: 0 })
    const en = estimateCost({ sourceChars: 1000, sourceLang: 'en', batchCount: 0 })
    expect(zh.inputTokens).toBeGreaterThan(en.inputTokens)
  })

  it('expects Vietnamese output to be longer than the source', () => {
    const estimate = estimateCost({ sourceChars: 1000, sourceLang: 'en', batchCount: 0 })
    expect(estimate.outputTokens).toBeGreaterThan(estimate.inputTokens)
  })

  it('charges prompt overhead once per batch', () => {
    const one = estimateCost({ sourceChars: 1000, sourceLang: 'en', batchCount: 1 })
    const three = estimateCost({ sourceChars: 1000, sourceLang: 'en', batchCount: 3 })
    expect(three.inputTokens - one.inputTokens).toBe(2 * (one.inputTokens - 250))
  })

  it('uses a generic estimate for Korean and unprofiled valid tags', () => {
    for (const sourceLang of ['ko', 'fr-CA']) {
      const estimate = estimateCost({ sourceChars: 1000, sourceLang, batchCount: 0 })
      expect(estimate.inputTokens).toBeGreaterThan(0)
      expect(estimate.outputTokens).toBeGreaterThan(0)
    }
  })

  it('reports no price at all when the model is unknown, rather than zero', () => {
    const estimate = estimateCost({ sourceChars: 1000, sourceLang: 'ja', batchCount: 1 })
    expect(estimate.usd).toBeUndefined()
    expect(estimate.inputTokens).toBeGreaterThan(0)
  })

  it('reports no price when the catalog knows the model but not its cost', () => {
    const free = { id: 'm', name: 'M' }
    expect(
      estimateCost({ sourceChars: 10, sourceLang: 'en', batchCount: 1, model: free }).usd
    ).toBeUndefined()
  })

  it('prices input and output separately', () => {
    const estimate = estimateCost({
      sourceChars: 4_000_000,
      sourceLang: 'en',
      batchCount: 0,
      model
    })
    // 4M chars at 4 chars/token = 1M input tokens; output is 1.3M tokens at twice the price.
    expect(estimate.inputTokens).toBe(1_000_000)
    expect(estimate.outputTokens).toBe(1_300_000)
    expect(estimate.usd).toBeCloseTo(1 + 2.6, 4)
  })

  it('treats a negative or fractional batch count as nothing rather than throwing', () => {
    expect(estimateCost({ sourceChars: 0, sourceLang: 'en', batchCount: -3 }).inputTokens).toBe(0)
  })
})
