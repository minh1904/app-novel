import { describe, expect, it } from 'vitest'
import { normalizeBaseUrl } from './endpointUrl'

describe('normalizeBaseUrl', () => {
  it('cuts a pasted endpoint back to its base', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1/chat/completions')).toBe(
      'https://api.example.com/v1'
    )
    expect(normalizeBaseUrl('https://api.example.com/v1/chat/completions/')).toBe(
      'https://api.example.com/v1'
    )
    expect(normalizeBaseUrl('https://API.example.com/V1/Chat/Completions')).toBe(
      'https://API.example.com/V1'
    )
  })

  it('drops the trailing slash and surrounding spaces', () => {
    expect(normalizeBaseUrl('  http://127.0.0.1:11434/v1/  ')).toBe('http://127.0.0.1:11434/v1')
    expect(normalizeBaseUrl('http://127.0.0.1:8317/v1///')).toBe('http://127.0.0.1:8317/v1')
  })

  it('keeps the vendor path that belongs to the base, Gemini included', () => {
    expect(normalizeBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai'
    )
    expect(normalizeBaseUrl('https://openrouter.ai/api/v1')).toBe('https://openrouter.ai/api/v1')
  })

  it('only cuts the suffix at the end, not a path that merely contains it', () => {
    expect(normalizeBaseUrl('https://x.test/chat/completions/proxy/v1')).toBe(
      'https://x.test/chat/completions/proxy/v1'
    )
  })

  it('is idempotent', () => {
    for (const input of [
      'https://api.example.com/v1/chat/completions/',
      'https://generativelanguage.googleapis.com/v1beta/openai/',
      ' http://localhost:1234/v1 '
    ]) {
      const once = normalizeBaseUrl(input)
      expect(normalizeBaseUrl(once)).toBe(once)
    }
  })
})
