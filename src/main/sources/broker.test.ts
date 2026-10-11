import { describe, expect, it } from 'vitest'
import { NetworkBroker } from './broker'
import { AdapterRuntime } from './runtime'
import type { NovelSourceAdapter, SourceManifest } from './domain'

describe('NetworkBroker', () => {
  it('rejects network requests by default when network capability is locked', async () => {
    const broker = new NetworkBroker({
      allowedOrigins: ['https://example.com'],
      allowNetwork: false
    })
    await expect(broker.request({ url: 'https://example.com/api' })).rejects.toMatchObject({
      code: 'network_disabled'
    })
  })

  it('rejects requests to origins not in manifest allowlist', async () => {
    const broker = new NetworkBroker({
      allowedOrigins: ['https://kakuyomu.jp'],
      allowNetwork: true
    })
    await expect(broker.request({ url: 'https://evil.com/data' })).rejects.toMatchObject({
      code: 'origin_not_allowed'
    })
  })

  it('blocks private and localhost addresses to prevent SSRF', async () => {
    const broker = new NetworkBroker({
      allowedOrigins: ['http://127.0.0.1:8080', 'http://localhost'],
      allowNetwork: true
    })
    await expect(broker.request({ url: 'http://127.0.0.1:8080/admin' })).rejects.toMatchObject({
      code: 'private_address_blocked'
    })
    await expect(broker.request({ url: 'http://localhost/secret' })).rejects.toMatchObject({
      code: 'private_address_blocked'
    })
  })
})

describe('Adapter privilege boundary', () => {
  it('does not pass database, secrets, or Electron handles into adapter context', async () => {
    let capturedContext: unknown = null
    const manifest: SourceManifest = {
      manifestVersion: 1,
      sourceId: 'test.safe',
      displayName: 'Safe',
      nativeNames: [],
      aliases: [],
      domains: [],
      adapterVersion: '1.0.0',
      apiVersion: '1.0.0',
      dataVersion: 1,
      countryCode: 'JP',
      languageTags: ['ja'],
      capabilities: ['catalog'],
      auth: 'none',
      origin: { kind: 'builtin' },
      limits: { maxPages: 1, pageSize: 10, timeoutMs: 100 }
    }

    const adapter: NovelSourceAdapter = {
      manifest,
      async getCatalog(_input, context) {
        capturedContext = context
        return {
          remoteWorkId: 'work-1',
          items: [],
          exhausted: true,
          complete: true
        }
      }
    }

    const runtime = new AdapterRuntime(adapter)
    await runtime.getCatalog({ remoteWorkId: 'work-1' })

    expect(capturedContext).toBeDefined()
    const ctx = capturedContext as Record<string, unknown>
    expect(ctx.db).toBeUndefined()
    expect(ctx.secret).toBeUndefined()
    expect(ctx.electron).toBeUndefined()
    expect(ctx.fetch).toBeUndefined()
    expect(typeof ctx.now).toBe('function')
    expect(ctx.signal).toBeInstanceOf(AbortSignal)
  })
})
