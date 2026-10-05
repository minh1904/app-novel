import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addKey,
  addModelEntry,
  clearKeyFreeze,
  deleteConnection,
  deleteModelEntry,
  duplicateModelEntry,
  freezeKey,
  getConnection,
  getModelEntry,
  insertConnection,
  listConnections,
  markKeyInvalid,
  patchConnection,
  readKeyCiphers,
  removeKey,
  reorderModelEntries,
  reSealKey,
  updateModelEntry,
  type ConnectionView
} from './connections'
import { StorageError } from './errors'
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
    addModelEntry(db, 'c1', 'e1', { model: 'gemini-flash-latest' })
    const patched = patchConnection(db, 'c1', { defaultEntryId: 'e1' }, 2)
    expect(patched).toMatchObject({
      name: 'A',
      baseUrl: 'https://a/v1',
      providerId: 'google',
      defaultEntryId: 'e1',
      enabled: true
    })
    expect(patchConnection(db, 'c1', { enabled: false }, 3).defaultEntryId).toBe('e1')
    db.close()
  })

  it('removes keys and models with the connection they belong to', async () => {
    const db = openIndex()
    await seed(db)
    addModelEntry(db, 'c1', 'e1', { model: 'gemini-flash-latest' })
    deleteConnection(db, 'c1')
    expect(listConnections(db)).toEqual([])
    expect(db.prepare('SELECT COUNT(*) AS n FROM ai_key').get<{ n: number }>()?.n).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS n FROM ai_model').get<{ n: number }>()?.n).toBe(0)
    db.close()
  })

  it('refuses a default that is not an entry of this connection', () => {
    const db = openIndex()
    insertConnection(db, 'c1', { name: 'A', baseUrl: 'https://a/v1' }, 1)
    insertConnection(db, 'c2', { name: 'B', baseUrl: 'https://b/v1' }, 1)
    addModelEntry(db, 'c2', 'other', { model: 'm' })
    // Another connection's entry, and an id that is nowhere, would both leave the default pointing at nothing.
    expect(() => patchConnection(db, 'c1', { defaultEntryId: 'other' }, 2)).toThrow(StorageError)
    expect(() => patchConnection(db, 'c1', { defaultEntryId: 'nowhere' }, 2)).toThrow(StorageError)
    expect(patchConnection(db, 'c1', { defaultEntryId: null }, 2).defaultEntryId).toBeNull()
    db.close()
  })

  it('lets a connection be renamed even if its stored default has gone stale', () => {
    const db = openIndex()
    insertConnection(db, 'c1', { name: 'A', baseUrl: 'https://a/v1' }, 1)
    db.prepare("UPDATE ai_connection SET default_model = 'stale' WHERE id = 'c1'").run()
    expect(patchConnection(db, 'c1', { name: 'B' }, 2).name).toBe('B')
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

describe('model entries', () => {
  function withConnection(): Db {
    const db = openIndex()
    insertConnection(db, 'c1', { name: 'A', baseUrl: 'https://a/v1' }, 1)
    return db
  }

  const names = (view: ConnectionView): string[] => view.models.map((entry) => entry.name)

  it('adds an entry named after its model unless told otherwise, with no settings', () => {
    const db = withConnection()
    const view = addModelEntry(db, 'c1', 'e1', { model: ' gemini-2.5-flash ' })
    expect(view.models).toEqual([
      { id: 'e1', name: 'gemini-2.5-flash', model: 'gemini-2.5-flash', settings: {} }
    ])
    db.close()
  })

  it('takes any model name, because the endpoint may not list it', () => {
    const db = withConnection()
    const view = addModelEntry(db, 'c1', 'e1', { model: 'ten-rieng-cua-toi', name: 'Của tôi' })
    expect(view.models[0]).toMatchObject({ name: 'Của tôi', model: 'ten-rieng-cua-toi' })
    db.close()
  })

  it('refuses a blank model or name, and one that is too long', () => {
    const db = withConnection()
    expect(() => addModelEntry(db, 'c1', 'e1', { model: '  ' })).toThrow(StorageError)
    expect(() => addModelEntry(db, 'c1', 'e1', { model: 'm', name: ' ' })).toThrow(StorageError)
    expect(() => addModelEntry(db, 'c1', 'e1', { model: 'x'.repeat(121) })).toThrow(StorageError)
    expect(() => addModelEntry(db, 'c1', 'e1', { model: 'm', name: 'x'.repeat(81) })).toThrow(
      StorageError
    )
    expect(getConnection(db, 'c1').models).toEqual([])
    db.close()
  })

  it('refuses to add to a connection that is not there', () => {
    const db = openIndex()
    expect(() => addModelEntry(db, 'nowhere', 'e1', { model: 'm' })).toThrow(StorageError)
    db.close()
  })

  it('keeps two entries that point at the same real model, each with its own settings', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'gemini-2.5-flash' })
    addModelEntry(db, 'c1', 'e2', {
      model: 'gemini-2.5-flash',
      name: 'Flash nhanh',
      settings: { thinking: 'off' }
    })
    const view = getConnection(db, 'c1')
    expect(view.models.map((entry) => entry.model)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash'
    ])
    expect(view.models[0].settings).toEqual({})
    expect(view.models[1].settings).toEqual({ thinking: 'off' })
    db.close()
  })

  it('updates the settings of one entry without touching another that shares its model', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    addModelEntry(db, 'c1', 'e2', { model: 'm' })
    const view = updateModelEntry(db, 'e2', {
      settings: { temperature: { enabled: true, value: 0.3 }, rpmLimit: 6 }
    })
    expect(view.models[0].settings).toEqual({})
    expect(view.models[1].settings).toEqual({
      temperature: { enabled: true, value: 0.3 },
      rpmLimit: 6
    })
    db.close()
  })

  it('changes only the fields of a patch', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm', name: 'Tên', settings: { thinking: 'low' } })
    expect(updateModelEntry(db, 'e1', { name: 'Tên mới' }).models[0]).toEqual({
      id: 'e1',
      name: 'Tên mới',
      model: 'm',
      settings: { thinking: 'low' }
    })
    expect(updateModelEntry(db, 'e1', { model: 'm2' }).models[0]).toMatchObject({
      name: 'Tên mới',
      model: 'm2',
      settings: { thinking: 'low' }
    })
    db.close()
  })

  it('refuses to update an entry that is not there', () => {
    const db = withConnection()
    expect(() => updateModelEntry(db, 'nowhere', { name: 'x' })).toThrow(StorageError)
    db.close()
  })

  it('duplicates an entry with its settings and a new id, right after the original', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm', name: 'A', settings: { rpmLimit: 6 } })
    addModelEntry(db, 'c1', 'e2', { model: 'n', name: 'B' })
    const view = duplicateModelEntry(db, 'e1', 'e3')
    expect(names(view)).toEqual(['A', 'A (bản sao)', 'B'])
    expect(view.models[1]).toMatchObject({ id: 'e3', model: 'm', settings: { rpmLimit: 6 } })
    // The original is untouched, and the copy owns its settings rather than sharing them.
    updateModelEntry(db, 'e3', { settings: { rpmLimit: 12 } })
    expect(getModelEntry(db, 'c1', 'e1').settings).toEqual({ rpmLimit: 6 })
    db.close()
  })

  it('keeps a long name within the limit when it is duplicated', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm', name: 'x'.repeat(80) })
    const copy = duplicateModelEntry(db, 'e1', 'e2').models[1]
    expect(copy.name.length).toBeLessThanOrEqual(80)
    expect(copy.name.endsWith('(bản sao)')).toBe(true)
    db.close()
  })

  it('deletes one entry and leaves the others, including one with the same model', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    addModelEntry(db, 'c1', 'e2', { model: 'm' })
    const view = deleteModelEntry(db, 'e1')
    expect(view.models.map((entry) => entry.id)).toEqual(['e2'])
    db.close()
  })

  it('leaves the connection with no default when the default entry is deleted', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    addModelEntry(db, 'c1', 'e2', { model: 'n' })
    patchConnection(db, 'c1', { defaultEntryId: 'e1' }, 2)
    expect(deleteModelEntry(db, 'e1').defaultEntryId).toBeNull()
    db.close()
  })

  it('keeps the default when some other entry is deleted', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    addModelEntry(db, 'c1', 'e2', { model: 'n' })
    patchConnection(db, 'c1', { defaultEntryId: 'e1' }, 2)
    expect(deleteModelEntry(db, 'e2').defaultEntryId).toBe('e1')
    db.close()
  })

  it('keeps the order the user arranged, and appends new entries at the end', () => {
    const db = withConnection()
    for (const id of ['a', 'b', 'c']) addModelEntry(db, 'c1', id, { model: 'm', name: id })
    expect(names(reorderModelEntries(db, 'c1', ['c', 'a', 'b']))).toEqual(['c', 'a', 'b'])
    expect(names(addModelEntry(db, 'c1', 'd', { model: 'm', name: 'd' }))).toEqual([
      'c',
      'a',
      'b',
      'd'
    ])
    db.close()
  })

  it('refuses an order that is missing an entry, repeats one, or names one that is not there', () => {
    const db = withConnection()
    for (const id of ['a', 'b']) addModelEntry(db, 'c1', id, { model: 'm', name: id })
    expect(() => reorderModelEntries(db, 'c1', ['a'])).toThrow(StorageError)
    expect(() => reorderModelEntries(db, 'c1', ['a', 'a'])).toThrow(StorageError)
    expect(() => reorderModelEntries(db, 'c1', ['a', 'zzz'])).toThrow(StorageError)
    expect(() => reorderModelEntries(db, 'c1', ['a', 'b', 'a'])).toThrow(StorageError)
    expect(names(getConnection(db, 'c1'))).toEqual(['a', 'b'])
    db.close()
  })

  it('finds an entry only inside its own connection', () => {
    const db = withConnection()
    insertConnection(db, 'c2', { name: 'B', baseUrl: 'https://b/v1' }, 1)
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    expect(getModelEntry(db, 'c1', 'e1').model).toBe('m')
    expect(() => getModelEntry(db, 'c2', 'e1')).toThrow(StorageError)
    expect(() => getModelEntry(db, 'c1', 'nowhere')).toThrow(StorageError)
    db.close()
  })

  it('reads settings that went bad as far as it can, and never throws', () => {
    const db = withConnection()
    addModelEntry(db, 'c1', 'e1', { model: 'm' })
    db.prepare('UPDATE ai_model SET settings = ? WHERE id = ?').run(
      JSON.stringify({ thinking: 'low', temperature: { enabled: true, value: 9 } }),
      'e1'
    )
    expect(getConnection(db, 'c1').models[0].settings).toEqual({ thinking: 'low' })
    db.prepare('UPDATE ai_model SET settings = ? WHERE id = ?').run('{not json', 'e1')
    expect(getConnection(db, 'c1').models[0].settings).toEqual({})
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
        expect(tables.filter((name) => ['ai_connection', 'ai_key', 'ai_model'].includes(name))).toEqual([])
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
