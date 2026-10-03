import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addKey,
  getConnection,
  insertConnection,
  readKeyCiphers,
  type ConnectionView
} from '../storage/connections'
import { librarySchema } from '../storage/librarySchema'
import { migrate } from '../storage/migrate'
import { SecretStore, type SecretCrypto } from '../storage/secretStore'
import { openDatabase, type Db } from '../storage/sqlite'
import { createTempDirs } from '../../testing/testing'
import { classifyHttpError } from './classifyError'
import { createConnectionKeySource } from './connectionKeySource'
import { OpenAiCompatibleProvider } from './openAiCompatible'
import type { TranslateRequest } from './types'

const tempDir = createTempDirs()
const NOW = 1_700_000_000_000

interface CountingCrypto extends SecretCrypto {
  encryptCalls: number
}

function fakeCrypto(rotate = false): CountingCrypto {
  return {
    encryptCalls: 0,
    isEncryptionAvailable: () => true,
    async encrypt(plain) {
      this.encryptCalls++
      return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
    },
    async decrypt(cipher) {
      return {
        value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
        shouldReEncrypt: rotate
      }
    }
  }
}

async function setup(
  secretValues: string[],
  rotate = false
): Promise<{ db: Db; secrets: SecretStore; connection: ConnectionView; crypto: CountingCrypto }> {
  const db = openDatabase(join(tempDir(), 'library.db'))
  migrate(db, librarySchema)
  const crypto = fakeCrypto(rotate)
  const secrets = new SecretStore(crypto)
  let connection = insertConnection(
    db,
    'c1',
    { name: 'Google Gemini', baseUrl: 'https://x/v1beta/openai' },
    NOW
  )
  for (const [index, value] of secretValues.entries()) {
    connection = addKey(db, 'c1', 'k' + index, await secrets.seal(value), NOW)
  }
  return { db, secrets, connection, crypto }
}

const PER_DAY = JSON.stringify({
  error: {
    message: 'You exceeded your current quota.',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }]
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '21.0s' }
    ]
  }
})

describe('createConnectionKeySource', () => {
  it('hands out the first key, decrypted', async () => {
    const { db, secrets } = await setup(['KEY-ONE', 'KEY-TWO'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await expect(source.acquire()).resolves.toEqual({ id: 'k0', secret: 'KEY-ONE' })
    db.close()
  })

  it('hands out no key at all for a connection that has none', async () => {
    const { db, secrets } = await setup([])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await expect(source.acquire()).resolves.toEqual({ id: null, secret: null })
    db.close()
  })

  it('freezes a key until the daily reset, then hands out the next one', async () => {
    const { db, secrets } = await setup(['KEY-ONE', 'KEY-TWO'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })

    await source.report('k0', classifyHttpError({ status: 429, body: PER_DAY, now: NOW }))

    const frozen = getConnection(db, 'c1').keys[0]
    expect(frozen.frozenScope).toBe('day')
    // The body suggested 21 seconds; the real wait is hours, which is the whole point.
    expect(frozen.frozenUntil).toBeGreaterThan(NOW + 60 * 60 * 1000)
    await expect(source.acquire()).resolves.toEqual({ id: 'k1', secret: 'KEY-TWO' })
    db.close()
  })

  it('reports exhaustion with the earliest recovery once every key is frozen', async () => {
    const { db, secrets } = await setup(['KEY-ONE'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await source.report('k0', classifyHttpError({ status: 429, body: PER_DAY, now: NOW }))

    const result = await source.acquire()
    expect(result).toMatchObject({ exhausted: true })
    expect((result as { recoverAt: number }).recoverAt).toBeGreaterThan(NOW)
    db.close()
  })

  it('marks a wrong key invalid and moves on, without a timer', async () => {
    const { db, secrets } = await setup(['BAD', 'GOOD'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await source.report('k0', classifyHttpError({ status: 401, body: '', now: NOW }))

    expect(getConnection(db, 'c1').keys[0]).toMatchObject({ state: 'invalid', frozenUntil: null })
    await expect(source.acquire()).resolves.toEqual({ id: 'k1', secret: 'GOOD' })
    db.close()
  })

  it('leaves the key alone when the failure was not the key', async () => {
    const { db, secrets } = await setup(['KEY-ONE'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await source.report('k0', classifyHttpError({ status: 503, body: '', now: NOW }))

    expect(getConnection(db, 'c1').keys[0]).toMatchObject({ state: 'ok', frozenUntil: null })
    db.close()
  })

  it('doubles the blind freeze while the same key keeps failing, then clears it on success', async () => {
    const { db, secrets } = await setup(['KEY-ONE'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    const blind = classifyHttpError({ status: 429, body: 'Too Many Requests', now: NOW })

    await source.report('k0', blind)
    const first = getConnection(db, 'c1').keys[0].frozenUntil as number
    await source.report('k0', blind)
    const second = getConnection(db, 'c1').keys[0].frozenUntil as number
    expect(second - NOW).toBe(2 * (first - NOW))

    await source.report('k0', 'ok')
    expect(getConnection(db, 'c1').keys[0]).toMatchObject({ frozenUntil: null })
    expect(readKeyCiphers(db, 'c1')[0].freezeStrikes).toBe(0)
    db.close()
  })

  it('re-encrypts and writes back when the OS says its key rotated', async () => {
    const { db, secrets, crypto } = await setup(['KEY-ONE'], true)
    expect(crypto.encryptCalls).toBe(1)
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })

    await expect(source.acquire()).resolves.toEqual({ id: 'k0', secret: 'KEY-ONE' })
    // One seal when the key was added, one re-seal because the OS rotated its key.
    expect(crypto.encryptCalls).toBe(2)
    db.close()
  })

  it('does not re-encrypt when the OS key is unchanged', async () => {
    const { db, secrets, crypto } = await setup(['KEY-ONE'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })
    await source.acquire()
    expect(crypto.encryptCalls).toBe(1)
    db.close()
  })
})

describe('provider driven by the real key source', () => {
  it('survives a key running out mid-job and does not re-translate what is done', async () => {
    const { db, secrets } = await setup(['KEY-ONE', 'KEY-TWO'])
    const source = createConnectionKeySource({ db, connectionId: 'c1', secrets, now: () => NOW })

    const sent: Array<{ key: string | null; ids: string[] }> = []
    const fetchImpl = (async (_url, init) => {
      const request = init as RequestInit
      const headers = new Headers(request.headers)
      const key = headers.get('authorization')
      const payload = JSON.parse(String(request.body)) as { messages: Array<{ content: string }> }
      const ids = (JSON.parse(payload.messages[1].content) as Array<{ id: string }>).map(
        (e) => e.id
      )
      sent.push({ key, ids })

      // The first key is out of its daily quota; the second one works.
      if (key === 'Bearer KEY-ONE') {
        return new Response(PER_DAY, {
          status: 429,
          headers: { 'content-type': 'application/json' }
        })
      }
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify(ids.map((id) => ({ id, dst: 'VI:' + id }))) } }
          ]
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    }) as typeof fetch

    const provider = new OpenAiCompatibleProvider({
      baseUrl: 'https://x/v1beta/openai',
      model: 'gemini-flash-latest',
      keys: source,
      fetchImpl,
      now: () => NOW
    })

    const request: TranslateRequest = {
      sourceLang: 'zh-Hans',
      targetLang: 'vi',
      segments: [
        { id: 'a', text: '第一句。' },
        { id: 'b', text: '第二句。' }
      ]
    }

    const result = await provider.translate(request)
    expect(result.items).toEqual([
      { id: 'a', text: 'VI:a' },
      { id: 'b', text: 'VI:b' }
    ])
    // Two calls: the first key failed, the retry used the second — same segments, no duplicates.
    expect(sent.map((call) => call.key)).toEqual(['Bearer KEY-ONE', 'Bearer KEY-TWO'])
    expect(sent.every((call) => call.ids.join() === 'a,b')).toBe(true)
    expect(getConnection(db, 'c1').keys[0].frozenScope).toBe('day')
    db.close()
  })
})
