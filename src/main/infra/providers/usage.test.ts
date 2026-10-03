import { describe, expect, it } from 'vitest'
import { addUsage, normalizeUsage, toWireUsage } from './usage'

describe('normalizeUsage', () => {
  it('reads a plain OpenAI usage without inventing optional fields', () => {
    const usage = normalizeUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 })
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    // Absent means "not measured", so the keys must not exist at all.
    expect(Object.keys(usage ?? {})).toEqual(['inputTokens', 'outputTokens'])
  })

  it('takes the cached part out of the input (OpenAI: prompt_tokens includes it)', () => {
    expect(
      normalizeUsage({
        prompt_tokens: 100,
        completion_tokens: 20,
        prompt_tokens_details: { cached_tokens: 40 },
        completion_tokens_details: { reasoning_tokens: 5 }
      })
    ).toEqual({ inputTokens: 60, outputTokens: 20, cacheReadTokens: 40, reasoningTokens: 5 })
  })

  it('reads the DeepSeek cache fields', () => {
    expect(
      normalizeUsage({
        prompt_tokens: 100,
        completion_tokens: 20,
        prompt_cache_hit_tokens: 70,
        prompt_cache_miss_tokens: 30
      })
    ).toEqual({ inputTokens: 30, outputTokens: 20, cacheReadTokens: 70 })
  })

  it('reports cache writes separately and takes them out of the input as well', () => {
    expect(
      normalizeUsage({
        prompt_tokens: 100,
        completion_tokens: 1,
        prompt_tokens_details: { cached_tokens: 30, cache_write_tokens: 50 }
      })
    ).toEqual({ inputTokens: 20, outputTokens: 1, cacheReadTokens: 30, cacheWriteTokens: 50 })
  })

  it('never lets the input go negative when the endpoint reports more cache than prompt', () => {
    expect(
      normalizeUsage({
        prompt_tokens: 10,
        completion_tokens: 1,
        prompt_tokens_details: { cached_tokens: 99 }
      })?.inputTokens
    ).toBe(0)
  })

  describe('thinking tokens that only the total reveals (Gemini, measured in a real call)', () => {
    it('counts the surplus of the total as thinking, inside the output', () => {
      // gemini-2.5-flash, 2026-10-03: the answer was 13 tokens, the call cost 125.
      expect(
        normalizeUsage({ completion_tokens: 13, prompt_tokens: 21, total_tokens: 125 })
      ).toEqual({
        inputTokens: 21,
        outputTokens: 13 + 91,
        reasoningTokens: 91
      })
    })

    it('finds nothing hidden when the total adds up, as with reasoning_effort "none"', () => {
      expect(
        normalizeUsage({ completion_tokens: 12, prompt_tokens: 21, total_tokens: 33 })
      ).toEqual({
        inputTokens: 21,
        outputTokens: 12
      })
    })

    it('trusts an explicit reasoning figure and does not add anything on top of it', () => {
      expect(
        normalizeUsage({
          prompt_tokens: 100,
          completion_tokens: 80,
          total_tokens: 180,
          completion_tokens_details: { reasoning_tokens: 50 }
        })
      ).toEqual({ inputTokens: 100, outputTokens: 80, reasoningTokens: 50 })
    })

    it('ignores a total that is missing or smaller than the parts', () => {
      expect(normalizeUsage({ prompt_tokens: 10, completion_tokens: 5 })).toEqual({
        inputTokens: 10,
        outputTokens: 5
      })
      expect(normalizeUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 3 })).toEqual({
        inputTokens: 10,
        outputTokens: 5
      })
    })

    it('does not take cached tokens for thinking: the prompt already contains them', () => {
      expect(
        normalizeUsage({
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120,
          prompt_tokens_details: { cached_tokens: 40 }
        })
      ).toEqual({ inputTokens: 60, outputTokens: 20, cacheReadTokens: 40 })
    })
  })

  it('returns null when usage is missing or only half known', () => {
    expect(normalizeUsage(undefined)).toBeNull()
    expect(normalizeUsage(null)).toBeNull()
    expect(normalizeUsage({})).toBeNull()
    expect(normalizeUsage({ prompt_tokens: 10 })).toBeNull()
    expect(normalizeUsage({ completion_tokens: 10 })).toBeNull()
    expect(normalizeUsage('12')).toBeNull()
  })

  it('treats wrong-typed and negative counts as absent, not as 0', () => {
    expect(normalizeUsage({ prompt_tokens: 'many', completion_tokens: 5 })).toBeNull()
    expect(normalizeUsage({ prompt_tokens: -3, completion_tokens: 5 })).toBeNull()
    expect(normalizeUsage({ prompt_tokens: Number.NaN, completion_tokens: 5 })).toBeNull()
    // A bad optional field is dropped; the required pair still gives a usage.
    expect(
      normalizeUsage({
        prompt_tokens: 10,
        completion_tokens: 5,
        prompt_tokens_details: { cached_tokens: 'lots' }
      })
    ).toEqual({ inputTokens: 10, outputTokens: 5 })
  })

  it('accepts digit strings, which some gateways send', () => {
    expect(normalizeUsage({ prompt_tokens: '12', completion_tokens: '3' })).toEqual({
      inputTokens: 12,
      outputTokens: 3
    })
  })
})

describe('addUsage', () => {
  it('adds nothing for a call without usage, and gives null when no call had any', () => {
    expect(addUsage(null, null)).toBeNull()
    expect(addUsage({ inputTokens: 1, outputTokens: 2 }, null)).toEqual({
      inputTokens: 1,
      outputTokens: 2
    })
    expect(addUsage(null, { inputTokens: 1, outputTokens: 2 })).toEqual({
      inputTokens: 1,
      outputTokens: 2
    })
  })

  it('sums every field and keeps optional ones only when some call reported them', () => {
    const sum = addUsage(
      { inputTokens: 10, outputTokens: 5, cacheReadTokens: 4 },
      { inputTokens: 1, outputTokens: 2, reasoningTokens: 7 }
    )
    expect(sum).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      cacheReadTokens: 4,
      reasoningTokens: 7
    })
    expect(
      addUsage({ inputTokens: 1, outputTokens: 1 }, { inputTokens: 1, outputTokens: 1 })
    ).toEqual({
      inputTokens: 2,
      outputTokens: 2
    })
  })

  it('does not change its inputs', () => {
    const first = { inputTokens: 1, outputTokens: 1 }
    addUsage(first, { inputTokens: 5, outputTokens: 5 })
    expect(first).toEqual({ inputTokens: 1, outputTokens: 1 })
  })
})

describe('toWireUsage', () => {
  it('reports the total input, cache included, because that is what a person expects to see', () => {
    expect(
      toWireUsage({ inputTokens: 60, outputTokens: 20, cacheReadTokens: 40, cacheWriteTokens: 10 })
    ).toEqual({ inputTokens: 110, outputTokens: 20 })
    expect(toWireUsage({ inputTokens: 5, outputTokens: 1 })).toEqual({
      inputTokens: 5,
      outputTokens: 1
    })
  })
})
