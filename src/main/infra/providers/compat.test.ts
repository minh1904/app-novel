import { describe, expect, it } from 'vitest'
import { resolveCompat } from './compat'

describe('resolveCompat', () => {
  it('assumes standard OpenAI for an endpoint it knows nothing about', () => {
    const standard = {
      maxTokensField: 'max_completion_tokens',
      streamUsage: true
    }
    expect(resolveCompat(null)).toEqual(standard)
    expect(resolveCompat(undefined)).toEqual(standard)
    expect(resolveCompat('some-gateway')).toEqual(standard)
  })

  it('applies the preset entry for Google over the standard', () => {
    expect(resolveCompat('google')).toEqual({
      maxTokensField: 'max_tokens',
      streamUsage: true
    })
  })

  it('lets the caller override the preset', () => {
    expect(
      resolveCompat('google', { maxTokensField: 'max_completion_tokens' }).maxTokensField
    ).toBe('max_completion_tokens')
    expect(resolveCompat(null, { streamUsage: false }).streamUsage).toBe(false)
  })

  it('does not let an inherited object key pose as a provider', () => {
    // `toString` and `constructor` exist on every object; a provider id must not resolve to them.
    expect(resolveCompat('constructor').maxTokensField).toBe('max_completion_tokens')
    expect(resolveCompat('toString').streamUsage).toBe(true)
  })
})
