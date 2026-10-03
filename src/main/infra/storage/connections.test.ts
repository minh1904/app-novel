import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addKey,
  clearKeyFreeze,
  deleteConnection,
  freezeKey,
  getConnection,
  insertConnection,
  listConnections,
  markKeyInvalid,
  patchConnection,
  readKeyCiphers,
  removeKey,
  reSealKey,
  setModels,
  type ConnectionView
} from './connections'
import { LibraryStore } from '../../services/library/library'
import { librarySchema } from './librarySchema'
import { migrate } from './migrate'
import { SecretStore, maskSecret, type SecretCrypto } from './secretStore'
import { openDatabase, type Db } from './sqlite'
import { createTempDirs } from '../../testing/testing'

const tempDir = createTempDirs()

function openIndex(): Db {
  const db = openDatabase(join(tempDir(), 'library.db'))
  migrate(db, librarySchema)
  return db
}

/** Mã hoá giả: đảo byte. Đủ để phân biệt bản mã với bản rõ trong test, không giả vờ là an toàn. */
function fakeCrypto(options: { available?: boolean; rotate?: boolean } = {}): SecretCrypto {
  return {
    isEncryptionAvailable: () => options.available !== false,
    async encrypt(plain) {
      return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
    },
    async decrypt(cipher) {
      return {
        value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
        shouldReEncrypt: options.rotate === true
      }
    }
  }
}

async function seed(db: Db): Promise<ConnectionView> {
  const store = new SecretStore(fakeCrypto())
  insertConnection(db, 'c1', { name: 'Gateway nội bộ', baseUrl: 'http://127.0.0.1:8317/v1' }, 1000)
  return addKey(db, 'c1', 'k1', await store.seal('AIzaSyFAKEKEY01'), 1000)
}

describe('connections store', () => {
  it('keeps connections in the order they were added', () => {
    const db = openIndex()
    insertConnection(db, 'b', { name: 'B', baseUrl: 'https://b/v1' }, 2)
    insertConnection(db, 'a', { name: 'A', baseUrl: 'https://a/v1' }, 1)
    expect(listConnections(db).map((c) => c.id)).toEqual(['b', 'a'])
    db.close()
  })

  it('refuses a blank name or address instead of storing one', () => {
    const db = openIndex()
    expect(() => insertConnection(db, 'c', { name: '  ', baseUrl: 'https://x/v1' }, 1)).toThrow()
    expect(() => insertConnection(db, 'c', { name: 'X', baseUrl: '  ' }, 1)).toThrow()
    db.close()
  })

  it('accepts a connection with no key at all, for a local endpoint', () => {
    const db = openIndex()
    const connection = insertConnection(
      db,
      'c1',
      { name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
      1
    )
    expect(connection.keys).toEqual([])
    db.close()
  })

  it('never exposes the key itself, only its last four characters', async () => {
    const db = openIndex()
    const connection = await seed(db)
    expect(connection.keys).toHaveLength(1)
    expect(connection.keys[0].tail).toBe('EY01')
    expect(JSON.stringify(connection)).not.toContain('AIzaSyFAKEKEY01')
    db.close()
  })

  it('stores the key encrypted, not as readable text', async () => {
    const db = openIndex()
    await seed(db)
    const stored = readKeyCiphers(db, 'c1')[0]
    expect(Buffer.from(stored.cipher).toString('utf-8')).not.toContain('AIzaSy')
    const store = new SecretStore(fakeCrypto())
    expect((await store.open(stored.cipher)).value).toBe('AIzaSyFAKEKEY01')
    db.close()
  })

  it('patches only the fields it is given', () => {
    const db = openIndex()
    insertConnection(db, 'c1', { name: 'A', baseUrl: 'https://a/v1', providerId: 'google' }, 1)
    const patched = patchConnection(db, 'c1', { defaultModel: 'gemini-flash-latest' }, 2)
    expect(patched).toMatchObject({
      name: 'A',
      baseUrl: 'https://a/v1',
      providerId: 'google',
      defaultModel: 'gemini-flash-latest',
      enabled: true
    })
    expect(patchConnection(db, 'c1', { enabled: false }, 3).defaultModel).toBe(
      'gemini-flash-latest'
    )
    db.close()
  })

  it('removes keys and models with the connection they belong to', async () => {
    const db = openIndex()
    await seed(db)
    setModels(db, 'c1', ['gemini-flash-latest'])
    deleteConnection(db, 'c1')
    expect(listConnections(db)).toEqual([])
    expect(db.prepare('SELECT COUNT(*) AS n FROM ai_key').get<{ n: number }>()?.n).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS n FROM ai_model').get<{ n: number }>()?.n).toBe(0)
    db.close()
  })

  it('keeps the chosen models in order and drops blanks and repeats', () => {
    const db = openIndex()
    insertConnection(db, 'c1', { name: 'A', baseUrl: 'https://a/v1' }, 1)
    const connection = setModels(db, 'c1', ['b', ' ', 'a', 'b', ' c '])
    expect(connection.models).toEqual(['b', 'a', 'c'])
    db.close()
  })

  it('reports key state so the screen can show which key is frozen', async () => {
    const db = openIndex()
    await seed(db)
    freezeKey(db, 'k1', 5_000, 'day', 1)
    const frozen = getConnection(db, 'c1').keys[0]
    expect(frozen).toMatchObject({ state: 'ok', frozenUntil: 5_000, frozenScope: 'day' })

    clearKeyFreeze(db, 'k1')
    expect(getConnection(db, 'c1').keys[0]).toMatchObject({
      frozenUntil: null,
      frozenScope: null
    })
    db.close()
  })

  it('marks a wrong key invalid without freezing it on a timer', async () => {
    const db = openIndex()
    await seed(db)
    freezeKey(db, 'k1', 5_000, 'minute', 1)
    markKeyInvalid(db, 'k1')
    expect(getConnection(db, 'c1').keys[0]).toMatchObject({
      state: 'invalid',
      frozenUntil: null
    })
    db.close()
  })

  it('replaces the stored cipher when the OS rotated its key', async () => {
    const db = openIndex()
    await seed(db)
    const before = readKeyCiphers(db, 'c1')[0].cipher
    reSealKey(db, 'k1', new Uint8Array([1, 2, 3]))
    const after = readKeyCiphers(db, 'c1')[0].cipher
    expect(Buffer.from(after)).not.toEqual(Buffer.from(before))
    db.close()
  })

  it('removes a single key without touching the connection', async () => {
    const db = openIndex()
    await seed(db)
    removeKey(db, 'k1')
    expect(getConnection(db, 'c1').keys).toEqual([])
    expect(() => removeKey(db, 'k1')).toThrow()
    db.close()
  })
})

describe('connections never ride along with a work', () => {
  it('stores nothing about connections inside a work file', () => {
    const dataDir = tempDir()
    const store = LibraryStore.open({ dataDir, now: () => 1_000 })
    try {
      const work = store.create({
        title: 'Truyện thử',
        sourceLang: 'zh-Hans'
      })
      const workDb = openDatabase(join(dataDir, 'works', work.id + '.mira'), { readOnly: true })
      try {
        const tables = workDb
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all<{ name: string }>()
          .map((row) => row.name)
        // A backup or a shared work file is this file; a key in it would leave the machine.
        expect(tables.filter((name) => name.startsWith('ai_'))).toEqual([])
      } finally {
        workDb.close()
      }
    } finally {
      store.close()
    }
  })
})

describe('SecretStore', () => {
  it('refuses to store anything when the OS keystore is unavailable', async () => {
    const store = new SecretStore(fakeCrypto({ available: false }))
    expect(store.available()).toBe(false)
    await expect(store.seal('AIzaSyFAKEKEY01')).rejects.toThrow(/kho khóa an toàn/)
  })

  it('refuses a blank secret', async () => {
    const store = new SecretStore(fakeCrypto())
    await expect(store.seal('   ')).rejects.toThrow(/không được để trống/)
  })

  it('hands back a fresh cipher when the OS says the key rotated', async () => {
    const store = new SecretStore(fakeCrypto({ rotate: true }))
    const { cipher } = await store.seal('AIzaSyFAKEKEY01')
    const opened = await store.open(cipher)
    expect(opened.value).toBe('AIzaSyFAKEKEY01')
    expect(opened.reSealed).toBeDefined()
  })

  it('shows only the last four characters, and short secrets whole', () => {
    expect(maskSecret('AIzaSyFAKEKEY01')).toBe('EY01')
    expect(maskSecret('abc')).toBe('abc')
  })
})
