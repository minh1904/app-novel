import { describe, expect, it } from 'vitest'
import { asFetch } from './fetchAdapter'

describe('asFetch', () => {
  it('passes a URL string and the init through untouched', async () => {
    const seen: Array<{ url: string; init: RequestInit | undefined }> = []
    const signal = new AbortController().signal
    const fetchLike = asFetch(async (url, init) => {
      seen.push({ url, init })
      return new Response('ok')
    })
    const body = JSON.stringify({ hello: 'world' })
    await fetchLike('https://api.example.test/v1/models', { method: 'POST', body, signal })
    expect(seen).toEqual([
      { url: 'https://api.example.test/v1/models', init: { method: 'POST', body, signal } }
    ])
  })

  it('turns a URL object into its string', async () => {
    let seen = ''
    await asFetch(async (url) => {
      seen = url
      return new Response('ok')
    })(new URL('http://127.0.0.1:11434/v1/models'))
    expect(seen).toBe('http://127.0.0.1:11434/v1/models')
  })

  it('refuses a Request object instead of dropping its headers and body', async () => {
    const fetchLike = asFetch(async () => new Response('ok'))
    await expect(fetchLike(new Request('https://api.example.test/'))).rejects.toThrow(TypeError)
  })

  it('returns the response it was given, body unread, so a stream can still be read', async () => {
    const response = new Response('streamed')
    const got = await asFetch(async () => response)('http://x/')
    expect(got).toBe(response)
    expect(got.bodyUsed).toBe(false)
  })
})
