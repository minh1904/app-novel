import { describe, expect, it } from 'vitest'
import { CONNECTION_PRESETS } from './aiConnections'
import { connectionSection, PROVIDER_CARDS } from './aiProviders'

describe('connection sections', () => {
  it('files each preset where Settings shows it', () => {
    const section = (id: string): string =>
      connectionSection({
        providerId: CONNECTION_PRESETS.find((preset) => preset.id === id)!.providerId
      })
    expect(section('google')).toBe('keys')
    expect(section('openrouter')).toBe('keys')
    expect(section('ollama')).toBe('local')
    expect(section('lmstudio')).toBe('local')
    expect(section('gateway')).toBe('endpoints')
  })

  it('puts a signed-in account under accounts whatever its provider', () => {
    expect(connectionSection({ providerId: 'openai', authKind: 'oauth' })).toBe('accounts')
  })

  it('treats an unknown provider id as a custom endpoint', () => {
    expect(connectionSection({ providerId: 'mistral' })).toBe('endpoints')
  })

  it('has a key page for every card', () => {
    for (const card of PROVIDER_CARDS) expect(card.keyUrl).toMatch(/^https:\/\//)
  })
})

describe('external links', () => {
  it('allows the key pages over https and nothing else', async () => {
    const { isAllowedExternalLink } = await import('./aiProviders')
    expect(isAllowedExternalLink('https://openrouter.ai/keys')).toBe(true)
    expect(isAllowedExternalLink('http://openrouter.ai/keys')).toBe(false)
    expect(isAllowedExternalLink('https://evil.example.com/')).toBe(false)
    expect(isAllowedExternalLink('javascript:alert(1)')).toBe(false)
  })
})
