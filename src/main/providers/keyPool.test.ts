import { describe, expect, it } from 'vitest'
import { classifyHttpError, parseDuration } from './classifyError'
import {
  MAX_SHORT_FREEZE_MS,
  SHORT_FREEZE_MS,
  chooseKey,
  decideFreeze,
  earliestRecovery,
  isUsable,
  nextDailyReset
} from './keyPool'

const NOW = 1_700_000_000_000

const key = (
  id: string,
  over: Partial<{ state: 'ok' | 'invalid'; frozenUntil: number | null }> = {}
): { id: string; state: 'ok' | 'invalid'; frozenUntil: number | null } => ({
  id,
  state: over.state ?? 'ok',
  frozenUntil: over.frozenUntil ?? null
})

// Hai thân lỗi 429 theo đúng hình dạng đã đọc trong nghiên cứu. Chúng là **giả định**: bước kiểm
// chứng 5.2a phải lấy nguyên văn lỗi thật rồi sửa lại các ca này nếu khác.
const GOOGLE_PER_MINUTE = JSON.stringify({
  error: {
    code: 429,
    message: 'Resource has been exhausted (e.g. check quota).',
    status: 'RESOURCE_EXHAUSTED',
    details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34.4s' }]
  }
})

const GOOGLE_PER_DAY = JSON.stringify({
  error: {
    code: 429,
    message: 'You exceeded your current quota.',
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [
          {
            quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
            quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'
          }
        ]
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '21.0s' }
    ]
  }
})

describe('parseDuration', () => {
  it('reads the seconds form Google uses', () => {
    expect(parseDuration('34.4s')).toBe(34_400)
    expect(parseDuration('0s')).toBe(0)
  })

  it('returns nothing for anything else', () => {
    expect(parseDuration('34.4')).toBeUndefined()
    expect(parseDuration(undefined)).toBeUndefined()
    expect(parseDuration(42)).toBeUndefined()
  })
})

describe('classifyHttpError', () => {
  it('reads the delay out of a Google body when there is no header', () => {
    const result = classifyHttpError({ status: 429, body: GOOGLE_PER_MINUTE, now: NOW })
    expect(result).toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: 34_400,
      quotaScope: 'minute'
    })
  })

  it('spots a per-day quota even though the body also carries a short retryDelay', () => {
    const result = classifyHttpError({ status: 429, body: GOOGLE_PER_DAY, now: NOW })
    // This is the case that kills an overnight job: 21s is useless, the quota is gone until reset.
    expect(result.quotaScope).toBe('day')
  })

  it('prefers the Retry-After header when the provider sends one', () => {
    const headers = { get: (name: string) => (name === 'retry-after' ? '12' : null) }
    const result = classifyHttpError({ status: 429, body: GOOGLE_PER_MINUTE, headers, now: NOW })
    expect(result.retryAfterMs).toBe(12_000)
  })

  it('reads an HTTP-date Retry-After', () => {
    const at = new Date(NOW + 5_000).toUTCString()
    const headers = { get: (name: string) => (name === 'retry-after' ? at : null) }
    const result = classifyHttpError({ status: 429, body: '{}', headers, now: NOW })
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(4_000)
  })

  it('still finds the delay when a gateway reshaped the error into something unknown', () => {
    const mangled = 'upstream said: {"retryDelay":"7s","quotaId":"…PerDay…"} (code 429)'
    const result = classifyHttpError({ status: 429, body: mangled, now: NOW })
    expect(result).toMatchObject({ retryAfterMs: 7_000, quotaScope: 'day' })
  })

  it('classifies by status alone when the body says nothing useful', () => {
    const result = classifyHttpError({ status: 429, body: 'Too Many Requests', now: NOW })
    expect(result.kind).toBe('rate_limited')
    expect(result.retryAfterMs).toBeUndefined()
    expect(result.quotaScope).toBeUndefined()
  })

  it('maps the statuses that matter to the contract kinds', () => {
    const at = (status: number): string => classifyHttpError({ status, body: '', now: NOW }).kind
    expect(at(401)).toBe('auth')
    expect(at(403)).toBe('auth')
    expect(at(429)).toBe('rate_limited')
    expect(at(408)).toBe('network')
    expect(at(500)).toBe('network')
    expect(at(503)).toBe('network')
    expect(at(400)).toBe('refused')
    expect(at(404)).toBe('refused')
  })

  it('keeps the provider message so the user sees what was actually said', () => {
    const openAiShape = JSON.stringify({ error: { message: 'Invalid API key provided' } })
    expect(classifyHttpError({ status: 401, body: openAiShape, now: NOW }).message).toBe(
      'Invalid API key provided'
    )
  })

  it('falls back to the raw body when there is no message field', () => {
    expect(classifyHttpError({ status: 500, body: 'upstream exploded', now: NOW }).message).toBe(
      'upstream exploded'
    )
  })
})

describe('chooseKey (fill-first)', () => {
  it('uses the first key until it stops working, not round-robin', () => {
    const keys = [key('a'), key('b')]
    expect(chooseKey(keys, NOW)?.id).toBe('a')
    expect(chooseKey(keys, NOW)?.id).toBe('a')
  })

  it('moves to the next key only while the first is frozen', () => {
    const keys = [key('a', { frozenUntil: NOW + 1_000 }), key('b')]
    expect(chooseKey(keys, NOW)?.id).toBe('b')
    expect(chooseKey(keys, NOW + 2_000)?.id).toBe('a')
  })

  it('skips a key known to be wrong, for good', () => {
    const keys = [key('a', { state: 'invalid' }), key('b')]
    expect(chooseKey(keys, NOW)?.id).toBe('b')
    expect(isUsable(keys[0], NOW + 10 ** 9)).toBe(false)
  })

  it('returns nothing when every key is frozen, and says when the first comes back', () => {
    const keys = [key('a', { frozenUntil: NOW + 9_000 }), key('b', { frozenUntil: NOW + 4_000 })]
    expect(chooseKey(keys, NOW)).toBeUndefined()
    expect(earliestRecovery(keys, NOW)).toBe(NOW + 4_000)
  })

  it('does not count an invalid key as something that will come back', () => {
    const keys = [key('a', { state: 'invalid', frozenUntil: NOW + 9_000 })]
    expect(earliestRecovery(keys, NOW)).toBeNull()
  })
})

describe('decideFreeze (two levels)', () => {
  it('waits exactly as long as the provider asked for a per-minute limit', () => {
    const error = classifyHttpError({ status: 429, body: GOOGLE_PER_MINUTE, now: NOW })
    const decision = decideFreeze({ error, strikes: 0, now: NOW })
    expect(decision.scope).toBe('minute')
    expect(decision.until).toBeGreaterThanOrEqual(NOW + 34_400)
    expect(decision.until).toBeLessThan(NOW + 40_000)
  })

  it('freezes until the daily reset, not for the few seconds the body suggests', () => {
    const error = classifyHttpError({ status: 429, body: GOOGLE_PER_DAY, now: NOW })
    const decision = decideFreeze({ error, strikes: 0, now: NOW })
    expect(decision.scope).toBe('day')
    // 21s would send the job straight back into the wall; the reset is hours away.
    expect(decision.until).toBeGreaterThan(NOW + 60 * 60 * 1000)
  })

  it('marks a key invalid instead of freezing it when the key itself is wrong', () => {
    const error = classifyHttpError({ status: 401, body: '', now: NOW })
    expect(decideFreeze({ error, strikes: 0, now: NOW })).toMatchObject({
      invalid: true,
      until: null
    })
  })

  it('uses a short freeze when it cannot tell, and doubles it on repeats', () => {
    const error = classifyHttpError({ status: 429, body: 'Too Many Requests', now: NOW })
    expect(decideFreeze({ error, strikes: 0, now: NOW }).until).toBe(NOW + SHORT_FREEZE_MS)
    expect(decideFreeze({ error, strikes: 1, now: NOW }).until).toBe(NOW + 2 * SHORT_FREEZE_MS)
    expect(decideFreeze({ error, strikes: 3, now: NOW }).until).toBe(NOW + 8 * SHORT_FREEZE_MS)
  })

  it('caps the doubling instead of freezing a good key for a day', () => {
    const error = classifyHttpError({ status: 429, body: 'Too Many Requests', now: NOW })
    expect(decideFreeze({ error, strikes: 20, now: NOW }).until).toBe(NOW + MAX_SHORT_FREEZE_MS)
  })
})

describe('nextDailyReset', () => {
  it('lands on a later instant than now', () => {
    expect(nextDailyReset(NOW)).toBeGreaterThan(NOW)
  })

  it('is within a day and a bit, whatever the offset', () => {
    expect(nextDailyReset(NOW) - NOW).toBeLessThanOrEqual(25 * 60 * 60 * 1000)
  })

  it('is midnight in the reset zone, not in the local one', () => {
    const at = new Date(nextDailyReset(NOW))
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      hour: '2-digit'
    }).format(at)
    expect(Number(hour) % 24).toBe(0)
  })

  it('falls back to a bounded wait when the time zone is unusable', () => {
    expect(nextDailyReset(NOW, 'Khong/Co/Mui/Nay')).toBe(NOW + 6 * 60 * 60 * 1000)
  })
})
