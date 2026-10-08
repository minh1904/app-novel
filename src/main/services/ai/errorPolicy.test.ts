import { describe, expect, it } from 'vitest'
import { describeRefusals } from '../../../shared/translation/refusalMessage'
import { ProviderError } from '../../infra/providers/types'
import {
  describeInvalidRequest,
  describeProviderError,
  taskErrorPolicy,
  withPolicy,
  type PolicyKind
} from './errorPolicy'

describe('taskErrorPolicy', () => {
  it.each<[PolicyKind, boolean, boolean, 'validation' | 'io' | null]>([
    ['invalid_request', true, false, 'validation'],
    ['auth', true, false, 'validation'],
    ['quota', true, true, 'io'],
    ['rate_limited', true, true, 'io'],
    ['network', false, true, 'io'],
    ['timeout', false, true, 'io'],
    ['invalid_response', false, true, 'io'],
    ['refused', false, false, 'validation'],
    ['refused_segments', false, false, null],
    ['missing_segments', false, true, null],
    ['conflict', true, false, null],
    ['cancelled', true, false, null],
    ['budget_exhausted', false, true, null]
  ])('%s: halts %s, retryable %s, probe %s', (kind, halts, retryable, probe) => {
    expect(taskErrorPolicy('translate', kind).haltsRun).toBe(halts)
    expect(taskErrorPolicy('chat', kind).retryable).toBe(retryable)
    expect(taskErrorPolicy('probe', kind).probeCode).toBe(probe)
  })

  it('does not stop a chapter for a few segments the filter blocked', () => {
    expect(withPolicy({ kind: 'refused', message: 'x', recoverAt: null }).haltsRun).toBe(false)
  })

  it('stops a chapter for a request the provider will not take', () => {
    expect(withPolicy({ kind: 'invalid_request', message: 'x', recoverAt: null }).haltsRun).toBe(
      true
    )
  })
})

describe('describeInvalidRequest', () => {
  it('names the thinking level "off" as it was sent', () => {
    const text = describeInvalidRequest('Request contains an invalid argument.', {
      reasoningEffort: 'none',
      extraBodyKeys: [],
      responseFormat: false
    })
    expect(text).toContain('Request contains an invalid argument')
    expect(text).toContain('reasoning_effort: none')
    expect(text).toContain('Kiểm tra cài đặt model')
  })

  it('names the extra_body fields and the output format, never their values', () => {
    const text = describeInvalidRequest('Unknown name "seed"', {
      temperature: 0.3,
      extraBodyKeys: ['google', 'seed'],
      responseFormat: true
    })
    expect(text).toContain('temperature: 0.3')
    expect(text).toContain('extra_body: google, seed')
    expect(text).toContain('response_format')
  })

  it('says plainly that a request was too large', () => {
    const text = describeInvalidRequest(
      'exceeds the maximum number of tokens',
      undefined,
      'too_large'
    )
    expect(text).toMatch(/quá lớn/)
    expect(text).toMatch(/lô nhỏ hơn/)
  })

  it('leaves every other kind of error in the provider’s own words', () => {
    expect(describeProviderError(new ProviderError('network', 'Mất kết nối'))).toBe('Mất kết nối')
  })
})

describe('describeRefusals', () => {
  it('counts by reason and says the quotation filter is not about the content', () => {
    const text = describeRefusals(['prohibited', 'recitation', 'prohibited'])
    expect(text).toContain('2 đoạn bị chặn theo chính sách nội dung')
    expect(text).toContain('1 đoạn bị bộ lọc trích dẫn chặn (không phải vấn đề nội dung)')
  })
})

describe('fallback offer for a stopped translation (hermes-settings-modal 4.6)', () => {
  it('marks failures another model could get past, and nothing else', async () => {
    const { withPolicy } = await import('./errorPolicy')
    const failure = (kind: Parameters<typeof withPolicy>[0]['kind']): boolean | undefined =>
      withPolicy({ kind, message: 'x', recoverAt: null }).fallback
    expect(failure('quota')).toBe(true)
    expect(failure('rate_limited')).toBe(true)
    expect(failure('timeout')).toBe(true)
    expect(failure('auth')).toBe(false)
    expect(failure('refused')).toBe(false)
    expect(failure('invalid_request')).toBe(false)
    expect(failure('cancelled')).toBe(false)
  })
})
