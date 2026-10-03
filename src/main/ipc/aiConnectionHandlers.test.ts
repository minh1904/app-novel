import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/channels'
import type { ConnectionTestResult, ConnectionView } from '../../shared/aiConnections'
import type { Result } from '../../shared/result'
import { ConnectionService } from '../services/ai/connectionService'
import { LibraryStore } from '../services/library/library'
import { SecretStore, type SecretCrypto } from '../infra/storage/secretStore'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const crypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(plain) {
    return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
  },
  async decrypt(cipher) {
    return {
      value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
      shouldReEncrypt: false
    }
  }
}

function setup(fetchImpl?: typeof fetch): ReturnType<typeof createLibraryHandlers> {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  let counter = 0
  // Ids cross IPC and are validated as UUIDs, so the fake ids must look like real ones.
  const fakeId = (n: number): string => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
  const connections = new ConnectionService({
    db: library.appDb,
    secrets: new SecretStore(crypto),
    now: () => 1_700_000_000_000,
    newId: () => fakeId(++counter),
    fetchImpl
  })
  return createLibraryHandlers(library, undefined, connections)
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.code + ': ' + result.error.message)
  return result.value
}

async function call<T>(
  handlers: ReturnType<typeof createLibraryHandlers>,
  channel: string,
  raw?: unknown
): Promise<Result<T>> {
  return (await handlers[channel as keyof typeof handlers](raw)) as Result<T>
}

const gatewayInput = { name: 'Gateway nội bộ', baseUrl: 'http://127.0.0.1:8317/v1' }

describe('ai connection channels', () => {
  it('starts with no connections', async () => {
    const handlers = setup()
    const listed = unwrap(
      await call<{ connections: ConnectionView[] }>(handlers, CHANNELS.aiConnectionsList)
    )
    expect(listed.connections).toEqual([])
  })

  it('creates, updates and deletes a connection', async () => {
    const handlers = setup()
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, gatewayInput)
    )
    expect(created).toMatchObject({ name: 'Gateway nội bộ', enabled: true, keys: [] })

    const updated = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsUpdate, {
        id: created.id,
        patch: { enabled: false }
      })
    )
    expect(updated.enabled).toBe(false)

    const after = unwrap(
      await call<{ connections: ConnectionView[] }>(handlers, CHANNELS.aiConnectionsDelete, {
        id: created.id
      })
    )
    expect(after.connections).toEqual([])
  })

  it('rejects an address that is not an http URL, as data not as a throw', async () => {
    const handlers = setup()
    const result = await call(handlers, CHANNELS.aiConnectionsCreate, {
      name: 'X',
      baseUrl: 'khong-phai-url'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('takes a key in and never gives it back', async () => {
    const handlers = setup()
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, gatewayInput)
    )
    const withKey = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiKeysAdd, {
        id: created.id,
        secret: 'AIzaSyFAKEKEY01'
      })
    )
    expect(withKey.keys[0].tail).toBe('EY01')
    // Whatever the renderer asks for later, the key itself is not in any answer.
    const listed = await call(handlers, CHANNELS.aiConnectionsList)
    expect(JSON.stringify(listed)).not.toContain('AIzaSyFAKEKEY01')

    const withoutKey = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiKeysRemove, {
        id: created.id,
        keyId: withKey.keys[0].id
      })
    )
    expect(withoutKey.keys).toEqual([])
  })

  it('tests a connection and brings back models with their prices', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ data: [{ id: 'models/gemini-flash-latest' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })) as typeof fetch
    const handlers = setup(fetchImpl)
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        providerId: 'google'
      })
    )

    const result = unwrap(
      await call<ConnectionTestResult>(handlers, CHANNELS.aiConnectionsTest, { id: created.id })
    )
    expect(result.listed).toBe(true)
    expect(result.models[0]).toMatchObject({ id: 'gemini-flash-latest' })
    expect(result.models[0].inputCost).toBeGreaterThan(0)
    expect(result.connection.checkedAt).toBe(1_700_000_000_000)
  })

  it('says a bad key is a bad key, not a mystery', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: 'API key not valid' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })) as typeof fetch
    const handlers = setup(fetchImpl)
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, gatewayInput)
    )
    const result = await call(handlers, CHANNELS.aiConnectionsTest, { id: created.id })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('validation')
      expect(result.error.message).toContain('API key not valid')
    }
  })

  it('treats an endpoint without /models as connected but not listable', async () => {
    const fetchImpl = (async () => new Response('not found', { status: 404 })) as typeof fetch
    const handlers = setup(fetchImpl)
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, gatewayInput)
    )
    const result = unwrap(
      await call<ConnectionTestResult>(handlers, CHANNELS.aiConnectionsTest, { id: created.id })
    )
    expect(result).toMatchObject({ listed: false, models: [] })
  })

  it('keeps the chosen models, in order', async () => {
    const handlers = setup()
    const created = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiConnectionsCreate, gatewayInput)
    )
    const withModels = unwrap(
      await call<ConnectionView>(handlers, CHANNELS.aiModelsSet, {
        id: created.id,
        models: ['b', 'a']
      })
    )
    expect(withModels.models).toEqual(['b', 'a'])
  })

  it('reports a missing connection as not_found rather than crashing', async () => {
    const handlers = setup()
    const result = await call(handlers, CHANNELS.aiConnectionsUpdate, {
      id: '00000000-0000-4000-8000-000000000000',
      patch: { enabled: false }
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('not_found')
  })
})
