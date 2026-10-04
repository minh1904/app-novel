import { describe, it, expect } from 'vitest'
import { assertNoSecret } from './secretGuard'

describe('secretGuard', () => {
  it('passes when text is clean', () => {
    expect(() => assertNoSecret('Report content without secrets', ['secret_123'])).not.toThrow()
  })

  it('throws when known key is found in text', () => {
    const fakeKey = 'FAKE_GEMINI_KEY_xyz987'
    const errorText = `Failed with error from API key: ${fakeKey}`
    expect(() => assertNoSecret(errorText, [fakeKey])).toThrow(/khóa API đã nạp/)
  })

  it('throws when API key pattern like AIza is detected', () => {
    const text = 'Error response contains AIzaSyD1234567890123456789012345678901'
    expect(() => assertNoSecret(text, [])).toThrow(/chứa mẫu khóa API/)
  })

  it('throws when Bearer token pattern is detected', () => {
    const text = 'Authorization header: Bearer abcdef1234567890'
    expect(() => assertNoSecret(text, [])).toThrow(/chứa mẫu khóa API/)
  })
})
