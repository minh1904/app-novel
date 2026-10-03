import { describe, expect, it } from 'vitest'
import type { ModelSettings } from '../../../shared/contracts/modelSettings'
import { buildGeneration, settingsKey } from './generation'

const on = <T>(value: T): { enabled: true; value: T } => ({ enabled: true, value })
const off = <T>(value: T): { enabled: false; value: T } => ({ enabled: false, value })

describe('buildGeneration', () => {
  it('asks for nothing when nothing was set, so an untouched entry sends what it always sent', () => {
    expect(buildGeneration({})).toEqual({})
  })

  it('sends only the temperature when only that is on', () => {
    expect(buildGeneration({ temperature: on(0.3) })).toEqual({ temperature: 0.3 })
  })

  it('does not send a parameter that is switched off, though its value is kept', () => {
    const settings: ModelSettings = {
      temperature: off(0.3),
      topP: off(0.9),
      extraHeaders: off({ 'X-A': 'b' }),
      extraBody: off({ top_k: 5 })
    }
    expect(buildGeneration(settings)).toEqual({})
  })

  it('sends top_p, headers and extra_body when they are on', () => {
    expect(
      buildGeneration({
        topP: on(0.9),
        extraHeaders: on({ 'HTTP-Referer': 'https://mira.app' }),
        extraBody: on({ top_k: 40 })
      })
    ).toEqual({
      topP: 0.9,
      extraHeaders: { 'HTTP-Referer': 'https://mira.app' },
      extraBody: { top_k: 40 }
    })
  })

  it('sends a temperature of 0 and a top_p of 0, which are values and not "unset"', () => {
    expect(buildGeneration({ temperature: on(0), topP: on(0) })).toEqual({
      temperature: 0,
      topP: 0
    })
  })

  it('sends no cap when the output limit is 0 or absent, and the cap when it is set', () => {
    expect(buildGeneration({ outputTokenLimit: 0 })).toEqual({})
    expect(buildGeneration({})).not.toHaveProperty('maxTokens')
    expect(buildGeneration({ outputTokenLimit: 4000 })).toEqual({ maxTokens: 4000 })
  })

  it('sends an empty extra body or headers as nothing at all', () => {
    expect(buildGeneration({ extraBody: on({}), extraHeaders: on({}) })).toEqual({})
  })

  it('sends nothing about thinking for "Default", and "none" for "off"', () => {
    expect(buildGeneration({})).not.toHaveProperty('reasoningEffort')
    expect(buildGeneration({ thinking: 'off' })).toEqual({ reasoningEffort: 'none' })
  })

  it('sends the other levels under their own name', () => {
    for (const level of ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const) {
      expect(buildGeneration({ thinking: level })).toEqual({ reasoningEffort: level })
    }
  })

  it('does not turn concurrency, RPM or the input limit into request parameters', () => {
    expect(buildGeneration({ concurrencyLimit: 2, rpmLimit: 30, inputTokenLimit: 800 })).toEqual({})
  })
})

describe('settingsKey', () => {
  const entry = (
    settings: ModelSettings = {},
    model = 'gemini-2.5-flash'
  ): { name: string; model: string; settings: ModelSettings } => ({
    name: 'Tên',
    model,
    settings
  })

  it('is a SHA-256 digest in lower-case hex', () => {
    expect(settingsKey(entry())).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is the same for the same configuration, however it was built', () => {
    expect(settingsKey(entry({ temperature: on(0.3), rpmLimit: 6 }))).toBe(
      settingsKey(entry({ rpmLimit: 6, temperature: on(0.3) }))
    )
    // Key order inside extra_body does not matter either.
    expect(settingsKey(entry({ extraBody: on({ a: 1, b: { c: 2, d: 3 } }) }))).toBe(
      settingsKey(entry({ extraBody: on({ b: { d: 3, c: 2 }, a: 1 }) }))
    )
  })

  it.each<[string, ModelSettings]>([
    ['the thinking level', { thinking: 'low' }],
    ['the temperature', { temperature: on(0.3) }],
    ['top_p', { topP: on(0.9) }],
    ['the output limit', { outputTokenLimit: 4000 }],
    ['the input limit, which decides how the chapter is cut', { inputTokenLimit: 800 }],
    ['an extra header', { extraHeaders: on({ 'X-A': 'b' }) }],
    ['the extra body', { extraBody: on({ top_k: 5 }) }]
  ])('changes with %s', (_label, settings) => {
    expect(settingsKey(entry(settings))).not.toBe(settingsKey(entry()))
  })

  it('changes with the real model name', () => {
    expect(settingsKey(entry({}, 'gemini-2.5-pro'))).not.toBe(
      settingsKey(entry({}, 'gemini-2.5-flash'))
    )
  })

  it('changes when a value changes, not only when a parameter appears', () => {
    expect(settingsKey(entry({ temperature: on(0.3) }))).not.toBe(
      settingsKey(entry({ temperature: on(0.4) }))
    )
  })

  it('does not change with the display name', () => {
    const renamed = { ...entry(), name: 'Flash nhanh' }
    expect(settingsKey(renamed)).toBe(settingsKey(entry()))
  })

  it('does not change with concurrency or RPM, which may be adjusted in the middle of a run', () => {
    expect(settingsKey(entry({ concurrencyLimit: 2, rpmLimit: 30 }))).toBe(settingsKey(entry()))
  })

  it('does not change for a value that is switched off, because it is not sent', () => {
    expect(settingsKey(entry({ temperature: off(0.3) }))).toBe(settingsKey(entry()))
    expect(settingsKey(entry({ temperature: off(0.3) }))).toBe(
      settingsKey(entry({ temperature: off(1.9) }))
    )
  })

  it('treats 0 and absent alike for the limits that mean "default"', () => {
    expect(settingsKey(entry({ inputTokenLimit: 0, outputTokenLimit: 0 }))).toBe(
      settingsKey(entry())
    )
  })

  it('tells a switched-on value apart from the same value switched off', () => {
    expect(settingsKey(entry({ temperature: on(0.3) }))).not.toBe(
      settingsKey(entry({ temperature: off(0.3) }))
    )
  })
})
