import { describe, expect, it } from 'vitest'
import { BODY_EXCERPT_MAX, bodyExcerpt, REDACTED, redactSecrets } from './redact'

const KEY = 'AIzaSyD-1234567890abcdefghijklmnopqrstu'

describe('redactSecrets', () => {
  it('replaces a key the provider echoes back verbatim', () => {
    const body = JSON.stringify({
      error: { message: 'API key not valid: ' + KEY + ' please pass a valid key' }
    })
    const out = redactSecrets(body, [KEY])
    expect(out).not.toContain(KEY)
    expect(out).toContain(REDACTED)
    expect(out).toContain('please pass a valid key')
  })

  it('replaces every occurrence and the URL-encoded form', () => {
    const secret = 'key with/slash+plus'
    const out = redactSecrets('a ' + secret + ' b ' + secret + ' c ' + encodeURIComponent(secret), [
      secret
    ])
    expect(out).toBe('a ' + REDACTED + ' b ' + REDACTED + ' c ' + REDACTED)
  })

  it('removes a Bearer token it was never told about', () => {
    expect(redactSecrets('Authorization: Bearer sk-live-abcdef123456', [])).not.toContain(
      'sk-live-abcdef123456'
    )
  })

  it('removes the value of a sensitively named JSON field, whatever the value is', () => {
    const out = redactSecrets('{"api_key": "something-else", "model": "gemini"}', [])
    expect(out).toContain('"api_key": "' + REDACTED + '"')
    expect(out).toContain('"model": "gemini"')
    expect(redactSecrets('{"access_token":"abc123xyz"}', [])).toBe(
      '{"access_token":"' + REDACTED + '"}'
    )
  })

  it('removes the value of a sensitively named query parameter', () => {
    const out = redactSecrets('GET /v1/models?key=abcdef123456&alt=json', [])
    expect(out).toBe('GET /v1/models?key=' + REDACTED + '&alt=json')
  })

  it('does not mistake a word that merely ends in "key" for a query parameter', () => {
    expect(redactSecrets('monkey=banana', [])).toBe('monkey=banana')
  })

  it('leaves text alone when there is nothing to hide', () => {
    expect(redactSecrets('HTTP 429: quota exceeded for model gemini-2.5-flash', [KEY])).toBe(
      'HTTP 429: quota exceeded for model gemini-2.5-flash'
    )
  })

  it('ignores secrets too short to be keys instead of shredding the text', () => {
    expect(redactSecrets('the cat sat', ['cat'])).toBe('the cat sat')
    // Only the secret of four characters or more is replaced; null and undefined are skipped.
    expect(redactSecrets('abc abcd', ['abc', 'abcd', null, undefined])).toBe('abc ' + REDACTED)
  })

  it('replaces a longer secret as a whole when it contains a shorter one', () => {
    const out = redactSecrets('x ABCD-EFGH y', ['ABCD', 'ABCD-EFGH'])
    expect(out).toBe('x ' + REDACTED + ' y')
  })
})

describe('bodyExcerpt', () => {
  it('cuts a long body to the limit and says it did', () => {
    const out = bodyExcerpt('x'.repeat(BODY_EXCERPT_MAX + 500), [])
    expect(out.length).toBeLessThan(BODY_EXCERPT_MAX + 40)
    expect(out.endsWith('(cắt bớt)')).toBe(true)
  })

  it('keeps a short or non-JSON body as it is', () => {
    expect(bodyExcerpt('<html>Bad gateway</html>', [])).toBe('<html>Bad gateway</html>')
  })

  it('scrubs before cutting, so a key straddling the cut cannot leave a prefix behind', () => {
    const body = 'y'.repeat(BODY_EXCERPT_MAX - 10) + KEY + ' tail'
    const out = bodyExcerpt(body, [KEY])
    expect(out).not.toContain(KEY.slice(0, 8))
    expect(out).toContain(REDACTED)
  })
})
