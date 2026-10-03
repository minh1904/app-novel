import { describe, expect, it } from 'vitest'
import { lookupModel, type ModelInfo } from './modelCatalog'
import { capabilityFromCatalog, modelCapability } from './modelCapability'

/** A model as the catalog would hold it; only the fields the table reads. */
function model(extra: Partial<ModelInfo>): ModelInfo {
  return { id: 'm', name: 'M', reasoning: true, ...extra }
}

describe('modelCapability on the real Gemini rows', () => {
  // Read from the shipped snapshot, so a refresh that changes what a model accepts shows up here.
  it('lets Gemini 2.5 Flash be switched off, and offers the budget levels too', () => {
    const capability = modelCapability(lookupModel('gemini-2.5-flash', 'google'))
    expect(capability.thinkingLevels).toEqual(['off', 'low', 'medium', 'high'])
  })

  it('does not let Gemini 2.5 Pro be switched off, because its budget cannot reach zero', () => {
    const capability = modelCapability(lookupModel('gemini-2.5-pro', 'google'))
    expect(capability.thinkingLevels).toEqual(['low', 'medium', 'high'])
    expect(capability.thinkingLevels).not.toContain('off')
  })

  it('gives Gemini 3.5 Flash the levels models.dev names, plus the off it was measured to accept', () => {
    // models.dev lists minimal…high only; a real call with reasoning_effort "none" was accepted on 2026-10-03
    // (see MODEL_CAPABILITY_OVERRIDES and capabilityProbes.test.ts).
    expect(modelCapability(lookupModel('gemini-3.5-flash', 'google')).thinkingLevels).toEqual([
      'off',
      'minimal',
      'low',
      'medium',
      'high'
    ])
    expect(capabilityFromCatalog(lookupModel('gemini-3.5-flash', 'google')).thinkingLevels).toEqual(
      ['minimal', 'low', 'medium', 'high']
    )
  })

  it('gives Gemini 3.1 Pro exactly what it accepted: low, medium, high, and no off or minimal', () => {
    expect(modelCapability(lookupModel('gemini-3.1-pro-preview', 'google')).thinkingLevels).toEqual(
      ['low', 'medium', 'high']
    )
  })

  it('gives a Gemini model whose source names no options only the default', () => {
    // `gemini-omni-flash-preview` reasons, but models.dev lists no way to steer it.
    const capability = modelCapability(lookupModel('gemini-omni-flash-preview', 'google'))
    expect(capability.thinkingLevels).toEqual([])
  })

  it('leaves temperature open for the Gemini models', () => {
    expect(modelCapability(lookupModel('gemini-2.5-flash', 'google')).temperature).toBe(true)
  })
})

describe('modelCapability, row by row', () => {
  it('gives nothing for a model the catalog does not know', () => {
    expect(modelCapability(undefined)).toEqual({ thinkingLevels: [], temperature: true })
  })

  it('gives nothing for a model that does not reason, even if it lists options', () => {
    const info = model({ reasoning: false, reasoningOptions: [{ type: 'toggle' }] })
    expect(modelCapability(info).thinkingLevels).toEqual([])
  })

  it('gives nothing for a reasoning model with no options listed', () => {
    expect(modelCapability(model({})).thinkingLevels).toEqual([])
  })

  it('renames the effort level "none" to "off", so it is not confused with sending nothing', () => {
    const info = model({ reasoningOptions: [{ type: 'effort', values: ['none', 'low', 'high'] }] })
    expect(modelCapability(info).thinkingLevels).toEqual(['off', 'low', 'high'])
  })

  it('keeps the levels in order from light to heavy whatever order the source listed them', () => {
    const info = model({
      reasoningOptions: [{ type: 'effort', values: ['high', 'xhigh', 'low', 'max', 'minimal'] }]
    })
    expect(modelCapability(info).thinkingLevels).toEqual(['minimal', 'low', 'high', 'xhigh', 'max'])
  })

  it('drops an effort name it does not know instead of sending it', () => {
    const info = model({ reasoningOptions: [{ type: 'effort', values: ['low', 'ludicrous'] }] })
    expect(modelCapability(info).thinkingLevels).toEqual(['low'])
  })

  it('adds off for a toggle', () => {
    const info = model({ reasoningOptions: [{ type: 'toggle' }] })
    expect(modelCapability(info).thinkingLevels).toEqual(['off'])
  })

  it('adds off for a budget that can reach zero', () => {
    const info = model({ reasoningOptions: [{ type: 'budget_tokens', min: 0, max: 100 }] })
    expect(modelCapability(info).thinkingLevels).toEqual(['off'])
  })

  it('does not add off for a budget with no stated minimum, rather than guessing', () => {
    const info = model({ reasoningOptions: [{ type: 'budget_tokens', max: 100 }] })
    expect(modelCapability(info).thinkingLevels).toEqual([])
  })

  it('adds the effort levels to a toggle when the model names them', () => {
    const info = model({
      reasoningOptions: [{ type: 'toggle' }, { type: 'effort', values: ['low', 'high'] }]
    })
    expect(modelCapability(info).thinkingLevels).toEqual(['off', 'low', 'high'])
  })

  it('does not turn a budget into levels for a model that names its own levels', () => {
    const info = model({
      id: 'gemini-x',
      reasoningOptions: [
        { type: 'effort', values: ['high'] },
        { type: 'budget_tokens', min: 128 }
      ]
    })
    expect(modelCapability(info).thinkingLevels).toEqual(['high'])
  })

  it('does not turn a budget into levels outside Gemini, whose mapping it is', () => {
    const info = model({
      id: 'claude-something',
      reasoningOptions: [{ type: 'budget_tokens', min: 1024, max: 64000 }]
    })
    expect(modelCapability(info).thinkingLevels).toEqual([])
  })
})

describe('modelCapability temperature', () => {
  it('closes the control only when the catalog says false', () => {
    expect(modelCapability(model({ temperature: false })).temperature).toBe(false)
  })

  it('leaves it open when the catalog says nothing', () => {
    expect(modelCapability(model({})).temperature).toBe(true)
  })

  it('reads the closed flag from a real reasoning model', () => {
    expect(modelCapability(lookupModel('o4-mini', 'openai')).temperature).toBe(false)
  })
})
