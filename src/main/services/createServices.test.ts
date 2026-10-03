import { afterEach, describe, expect, it } from 'vitest'
import type { SecretCrypto } from '../infra/storage/secretStore'
import { createTempDirs } from '../testing/testing'
import { ChapterTranslator } from './ai/chapterTranslation'
import { ChatService } from './ai/chatService'
import { ConnectionService } from './ai/connectionService'
import { createServices } from './createServices'
import { LibraryStore } from './library/library'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

/** A stand-in for Electron's safeStorage that also counts how often it is asked to encrypt. */
function countingCrypto(): SecretCrypto & { encrypted: number } {
  const xor = (bytes: Uint8Array): Uint8Array => new Uint8Array([...bytes].map((b) => b ^ 0xff))
  const crypto = {
    encrypted: 0,
    isEncryptionAvailable: () => true,
    async encrypt(plain: string) {
      crypto.encrypted++
      return xor(Buffer.from(plain, 'utf-8'))
    },
    async decrypt(cipher: Uint8Array) {
      return { value: Buffer.from(xor(cipher)).toString('utf-8'), shouldReEncrypt: false }
    }
  }
  return crypto
}

function openLibrary(): LibraryStore {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  return library
}

describe('createServices', () => {
  it('builds the three AI services over one library', () => {
    const services = createServices({ library: openLibrary(), crypto: countingCrypto() })
    expect(services.connections).toBeInstanceOf(ConnectionService)
    expect(services.translator).toBeInstanceOf(ChapterTranslator)
    expect(services.chat).toBeInstanceOf(ChatService)
  })

  it('protects keys with the crypto it was given and stores nothing readable', async () => {
    const library = openLibrary()
    const crypto = countingCrypto()
    const { connections } = createServices({ library, crypto })

    const created = connections.create({
      name: 'Gateway thử',
      baseUrl: 'http://127.0.0.1:8317/v1',
      providerId: null
    })
    const withKey = await connections.addApiKey(created.id, 'AIzaSyFAKEKEY01')
    expect(withKey.keys[0].tail).toBe('EY01')
    expect(crypto.encrypted).toBe(1)

    const stored = library.appDb
      .prepare('SELECT secret FROM ai_key WHERE connection_id = ?')
      .all<{ secret: Uint8Array }>(created.id)
    expect(stored).toHaveLength(1)
    // What reaches the database is the crypto's output, never the key as typed.
    expect(Buffer.from(stored[0].secret).toString('utf-8')).not.toContain('AIzaSyFAKEKEY01')
  })

  it('sends provider requests through the fetch it was given', async () => {
    const library = openLibrary()
    const seen: string[] = []
    const fetchLike = (async (url: string | URL | Request) => {
      seen.push(String(url))
      return new Response(JSON.stringify({ data: [{ id: 'gemini-test' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }) as typeof fetch
    const { connections } = createServices({ library, crypto: countingCrypto(), fetch: fetchLike })
    const created = connections.create({
      name: 'Gateway thử',
      baseUrl: 'http://127.0.0.1:8317/v1/chat/completions',
      providerId: null
    })

    const result = await connections.test(created.id)
    // The pasted endpoint was cut back to its base, and the request went out through the injected fetch.
    expect(seen).toEqual(['http://127.0.0.1:8317/v1/models'])
    expect(result.models.map((model) => model.id)).toEqual(['gemini-test'])
  })

  it('refuses to keep a key when the crypto cannot protect it', async () => {
    const library = openLibrary()
    const crypto = { ...countingCrypto(), isEncryptionAvailable: () => false }
    const { connections } = createServices({ library, crypto })
    const created = connections.create({
      name: 'Gateway thử',
      baseUrl: 'http://127.0.0.1:8317/v1',
      providerId: null
    })

    await expect(connections.addApiKey(created.id, 'AIzaSyFAKEKEY01')).rejects.toThrow()
    const stored = library.appDb.prepare('SELECT secret FROM ai_key').all()
    expect(stored).toEqual([])
  })
})
