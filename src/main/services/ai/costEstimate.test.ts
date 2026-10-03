import { describe, expect, it } from 'vitest'
import type { ModelInfo } from '../../infra/providers/modelCatalog'
import { costOfUsage } from './costEstimate'

function model(cost: ModelInfo['cost']): ModelInfo {
  return { id: 'm', name: 'm', cost }
}

describe('costOfUsage', () => {
  it('prices input and output per million tokens', () => {
    expect(
      costOfUsage({ inputTokens: 1_000_000, outputTokens: 500_000 }, model({ input: 2, output: 8 }))
    ).toBe(6)
  })

  it('prices cache reads at the cache-read price when the catalog has one', () => {
    const priced = model({ input: 1, output: 4, cacheRead: 0.1 })
    // 100k fresh input at 1/M = 0.1, 900k cached at 0.1/M = 0.09, 0 output.
    expect(
      costOfUsage({ inputTokens: 100_000, cacheReadTokens: 900_000, outputTokens: 0 }, priced)
    ).toBe(0.19)
  })

  it('falls back to the plain input price for a cache price the catalog lacks', () => {
    const priced = model({ input: 1, output: 4 })
    expect(
      costOfUsage(
        {
          inputTokens: 0,
          cacheReadTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          outputTokens: 0
        },
        priced
      )
    ).toBe(2)
  })

  it('prices cache writes at the cache-write price', () => {
    expect(
      costOfUsage(
        { inputTokens: 0, cacheWriteTokens: 1_000_000, outputTokens: 0 },
        model({ input: 3, output: 15, cacheWrite: 3.75 })
      )
    ).toBe(3.75)
  })

  it('does not charge reasoning tokens twice: they are already inside the output', () => {
    const priced = model({ input: 1, output: 10 })
    expect(
      costOfUsage({ inputTokens: 0, outputTokens: 1_000_000, reasoningTokens: 400_000 }, priced)
    ).toBe(10)
  })

  it('answers "unknown", never 0, when the model has no input or output price', () => {
    expect(costOfUsage({ inputTokens: 10, outputTokens: 10 }, undefined)).toBeNull()
    expect(costOfUsage({ inputTokens: 10, outputTokens: 10 }, model(undefined))).toBeNull()
    expect(costOfUsage({ inputTokens: 10, outputTokens: 10 }, model({ input: 1 }))).toBeNull()
    expect(costOfUsage({ inputTokens: 10, outputTokens: 10 }, model({ output: 1 }))).toBeNull()
  })

  it('ignores negative counts instead of producing a negative bill', () => {
    expect(costOfUsage({ inputTokens: -5, outputTokens: 0 }, model({ input: 1, output: 1 }))).toBe(
      0
    )
  })
})
