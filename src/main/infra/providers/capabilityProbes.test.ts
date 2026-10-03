import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ThinkingLevel } from '../../../shared/contracts/modelSettings'
import { lookupModel } from './modelCatalog'
import {
  MODEL_CAPABILITY_OVERRIDES,
  capabilityFromCatalog,
  modelCapability
} from './modelCapability'

/**
 * What the capability table says, held against what Gemini **really did** (task 2.4 of change
 * `ai-model-settings`; recordings made by `scripts/capture-provider-fixtures.mjs --model …`, key scrubbed).
 *
 * `modelCapability` decides which thinking levels the screen offers. That is only worth something if it
 * agrees with the provider, so for every model that has been probed these tests demand: a level is offered
 * **exactly when** the provider accepted it. They would go red if a catalog refresh dropped a level that
 * works, or offered one the provider refuses.
 */

const LIVE = join(__dirname, '__fixtures__', 'live')

interface Probe {
  status: number
  bodyText: string
}

function probe(model: string, name: string): Probe | null {
  const file = join(LIVE, 'probe-' + model + '-' + name + '.json')
  if (!existsSync(file)) return null
  const record = JSON.parse(readFileSync(file, 'utf8')) as { response: Probe }
  return record.response
}

/** The recording behind each level: `effort-none` is what "Tắt" sends. */
const PROBE_OF_LEVEL: Partial<Record<ThinkingLevel, string>> = {
  off: 'effort-none',
  minimal: 'effort-minimal',
  low: 'effort-low',
  medium: 'effort-medium',
  high: 'effort-high'
}

/** Models probed on 2026-10-03 for which every level has a recording. */
const PROBED = ['gemini-3.5-flash', 'gemini-3.1-pro-preview']

describe('the capability table agrees with the real provider', () => {
  for (const model of PROBED) {
    describe(model, () => {
      const capability = modelCapability(lookupModel(model, 'google'))

      for (const [level, name] of Object.entries(PROBE_OF_LEVEL)) {
        it(`offers "${level}" exactly when the provider accepted ${name}`, () => {
          const recorded = probe(model, name!)
          expect(recorded, 'recording ' + name + ' is missing').not.toBeNull()
          const accepted = recorded!.status === 200
          expect(capability.thinkingLevels.includes(level as ThinkingLevel)).toBe(accepted)
        })
      }

      it('offers no level that was not probed, so nothing here is a guess', () => {
        const probed = Object.keys(PROBE_OF_LEVEL)
        expect(capability.thinkingLevels.every((level) => probed.includes(level))).toBe(true)
      })

      it('leaves temperature open, because the provider took it', () => {
        expect(probe(model, 'temperature')!.status).toBe(200)
        expect(probe(model, 'top-p')!.status).toBe(200)
        expect(capability.temperature).toBe(true)
      })

      it("was refused a level it does not have with the provider's own words", () => {
        expect(probe(model, 'effort-invalid')!.status).toBe(400)
        expect(probe(model, 'effort-invalid')!.bodyText).toContain('Invalid reasoning_effort')
      })
    })
  }

  it('says why the 3.1 Pro refusals happened, in words the screen will show as they are', () => {
    // These two are what the "Kiểm tra" button prints if someone forces the level in with extra_body.
    expect(probe('gemini-3.1-pro-preview', 'effort-none')!.bodyText).toContain(
      'This model only works in thinking mode'
    )
    expect(probe('gemini-3.1-pro-preview', 'effort-minimal')!.bodyText).toContain(
      'MINIMAL is not supported'
    )
  })

  it('shows what "off" buys on 3.5 Flash: the thinking tokens disappear', () => {
    const total = (name: string): number => {
      const body = JSON.parse(probe('gemini-3.5-flash', name)!.bodyText) as {
        usage: { total_tokens: number }
      }
      return body.usage.total_tokens
    }
    // 21 in + 11 out. Without thinking that is all there is; with it, the rest is hidden thinking.
    expect(total('effort-none')).toBeLessThan(40)
    expect(total('effort-none')).toBe(total('effort-minimal'))
    expect(total('effort-low')).toBeGreaterThan(total('effort-none') * 3)
  })
})

describe('MODEL_CAPABILITY_OVERRIDES', () => {
  const rows = Object.entries(MODEL_CAPABILITY_OVERRIDES)

  it('has at least one row, or this table has nothing to say and should go', () => {
    expect(rows.length).toBeGreaterThan(0)
  })

  it.each(rows)(
    '%s: the evidence is a real recording of a request the provider accepted',
    (_model, row) => {
      const file = join(LIVE, row.evidence)
      expect(existsSync(file), row.evidence + ' does not exist').toBe(true)
      const record = JSON.parse(readFileSync(file, 'utf8')) as {
        response: Probe
        capturedAt: string
      }
      expect(record.response.status).toBe(200)
      // The date on the row is the date of the measurement, so it cannot drift from the recording.
      expect(record.capturedAt.slice(0, 10)).toBe(row.measuredOn)
    }
  )

  it.each(rows)(
    '%s: the catalog still lacks the level, otherwise this row must be deleted',
    (model, row) => {
      const fromCatalog = capabilityFromCatalog(lookupModel(model, 'google'))
      for (const level of row.addLevels) {
        expect(
          fromCatalog.thinkingLevels,
          'models.dev now lists "' + level + '" for ' + model + ': delete this override'
        ).not.toContain(level)
      }
    }
  )

  it.each(rows)('%s: only adds levels, and the offered list stays in order', (model, row) => {
    const info = lookupModel(model, 'google')
    const base = capabilityFromCatalog(info).thinkingLevels
    const merged = modelCapability(info).thinkingLevels
    for (const level of base) expect(merged).toContain(level)
    for (const level of row.addLevels) expect(merged).toContain(level)
    expect(merged.length).toBe(new Set([...base, ...row.addLevels]).size)
  })

  it('does not apply to a model that is not in the catalog, because rows match by catalog id', () => {
    expect(modelCapability(undefined).thinkingLevels).toEqual([])
  })
})
