import { describe, expect, it } from 'vitest'
import { classifyHttpError } from './classifyError'
import { decideFreeze } from './keyPool'

const NOW = 1_700_000_000_000

const classify = (status: number, body: unknown): ReturnType<typeof classifyHttpError> =>
  classifyHttpError({
    status,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    now: NOW
  })

describe('a 4xx that is not the key, the quota or a block', () => {
  it('is a request error: the thinking level the model refused, 2026-10-07', () => {
    // What gemini-3.5-flash-lite answered to reasoning_effort "none".
    const result = classify(400, [
      {
        error: {
          code: 400,
          message: 'Request contains an invalid argument.',
          status: 'INVALID_ARGUMENT'
        }
      }
    ])
    expect(result.kind).toBe('invalid_request')
    expect(result.message).toBe('Request contains an invalid argument.')
    expect(result.requestProblem).toBeUndefined()
    expect(result.filter).toBeUndefined()
  })

  it('is a request error when Mira sent a parameter the endpoint does not know, even one named "safety"', () => {
    // Measured 2026-10-06: Mira's own safety_settings, which the OpenAI-compatible path rejects.
    const result = classify(400, {
      error: {
        code: 400,
        message:
          'Invalid JSON payload received. Unknown name "safety_settings" at \'extra_body.google\''
      }
    })
    expect(result.kind).toBe('invalid_request')
  })

  it('still reads a wrong key sent back as 400 as `auth`', () => {
    const result = classify(400, [
      {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          details: [{ reason: 'API_KEY_INVALID' }]
        }
      }
    ])
    expect(result.kind).toBe('auth')
  })

  it('says a 413 is a request too large', () => {
    const result = classify(413, 'Payload Too Large')
    expect(result).toMatchObject({ kind: 'invalid_request', requestProblem: 'too_large' })
  })

  it('says a 400 over the input token limit is a request too large', () => {
    const result = classify(400, {
      error: {
        code: 400,
        message:
          'The input token count (1200000) exceeds the maximum number of tokens allowed (1048576).'
      }
    })
    expect(result).toMatchObject({ kind: 'invalid_request', requestProblem: 'too_large' })
  })

  it('leaves the key alone', () => {
    const result = classify(400, { error: { message: 'Unsupported parameter' } })
    expect(decideFreeze({ error: result, strikes: 0, now: NOW })).toEqual({
      until: null,
      scope: null,
      strikes: 0,
      invalid: false
    })
  })
})

describe('a 4xx with evidence that the content was blocked', () => {
  it('reads a blockReason', () => {
    const result = classify(400, {
      error: { message: 'blocked' },
      promptFeedback: { blockReason: 'PROHIBITED_CONTENT' }
    })
    expect(result).toMatchObject({
      kind: 'refused',
      filter: { group: 'prohibited', raw: 'PROHIBITED_CONTENT' }
    })
  })

  it('reads PROHIBITED_CONTENT written in the message', () => {
    const result = classify(400, {
      error: { message: 'Response was blocked due to PROHIBITED_CONTENT' }
    })
    expect(result).toMatchObject({ kind: 'refused', filter: { group: 'prohibited' } })
  })

  it('reads a SAFETY reason', () => {
    const result = classify(400, { error: { message: 'Candidate was blocked due to SAFETY' } })
    expect(result).toMatchObject({ kind: 'refused', filter: { group: 'safety', raw: 'SAFETY' } })
  })

  it('reads a harm category as a safety block', () => {
    const result = classify(400, {
      error: { message: 'blocked', details: [{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' }] }
    })
    expect(result).toMatchObject({ kind: 'refused', filter: { group: 'safety' } })
  })

  it('does not lift a 401 or a 429 into a block', () => {
    expect(classify(401, { error: { message: 'SAFETY' } }).kind).toBe('auth')
    expect(classify(429, { error: { message: 'SAFETY' } }).kind).toBe('rate_limited')
  })
})

describe('errors of account and Anthropic providers (subscription-providers, D9)', () => {
  it('reads a Codex usage limit as quota, with the reset when the body gives one', () => {
    const result = classify(429, {
      error: {
        type: 'usage_limit_reached',
        message: 'The usage limit has been reached',
        resets_in_seconds: 1800
      }
    })
    expect(result).toMatchObject({ kind: 'quota', retryAfterMs: 1_800_000 })
  })

  it('reads an out-of-credit Copilot answer as quota', () => {
    expect(classify(402, { error: { message: 'Payment required' } }).kind).toBe('quota')
    expect(
      classify(403, { error: { message: 'You have exceeded your premium request allowance' } }).kind
    ).toBe('quota')
  })

  it('keeps a Copilot model the integration may not use a request error', () => {
    expect(
      classify(400, { error: { code: 'model_not_available_for_integrator', message: 'no' } }).kind
    ).toBe('invalid_request')
  })

  it('makes an overloaded Anthropic a rate limit worth retrying', () => {
    const result = classify(529, {
      type: 'error',
      error: { type: 'overloaded_error', message: 'Overloaded' }
    })
    expect(result.kind).toBe('rate_limited')
  })

  it('keeps an Anthropic invalid request a request error', () => {
    expect(
      classify(400, {
        type: 'error',
        error: { type: 'invalid_request_error', message: 'max_tokens: required' }
      }).kind
    ).toBe('invalid_request')
  })
})
