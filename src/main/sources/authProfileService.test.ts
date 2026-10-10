import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../testing/testing'
import { openDatabase } from '../infra/storage/sqlite'
import { librarySchema } from '../infra/storage/librarySchema'
import { workSchema } from '../infra/storage/workSchema'
import { migrate } from '../infra/storage/migrate'
import type { SecretCrypto } from '../infra/storage/secretStore'
import {
  insertCatalogItem,
  listCatalogItems,
  listSourceBindings,
  type StoredCatalogItem
} from '../infra/storage/sourceStorage'
import { AuthProfileService } from './authProfileService'
import { SourceBindingService } from './bindingService'

const tempDir = createTempDirs()

const mockCrypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  encrypt: async (plain: string) => Buffer.from(`enc:${plain}`, 'utf8'),
  decrypt: async (cipher: Uint8Array) => {
    const str = Buffer.from(cipher).toString('utf8')
    return { value: str.replace(/^enc:/, ''), shouldReEncrypt: false }
  }
}

describe('AuthProfileService and missing profile handling', () => {
  function setupLibraryDb() {
    const dbPath = join(tempDir(), 'library.db')
    const db = openDatabase(dbPath)
    migrate(db, librarySchema)
    return db
  }

  function setupWorkDb() {
    const dbPath = join(tempDir(), 'work.mira')
    const db = openDatabase(dbPath)
    migrate(db, workSchema)
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
      VALUES ('w1', 'Tác phẩm', 'ko', 1, 1);
    `)
    return db
  }

  it('supports multiple auth profiles per source, encrypts secrets, and never exposes secrets in summaries', async () => {
    const libraryDb = setupLibraryDb()
    const service = new AuthProfileService(mockCrypto)
    let idCounter = 1
    const newId = () => `prof-${idCounter++}`

    // Create 2 profiles for novelpia
    const p1 = await service.createProfile(
      libraryDb,
      {
        adapterId: 'mira.novelpia',
        label: 'Tài khoản VIP',
        secret: 'session_token_123'
      },
      1000,
      newId
    )

    const p2 = await service.createProfile(
      libraryDb,
      {
        adapterId: 'mira.novelpia',
        label: 'Tài khoản Phụ',
        secret: 'session_token_456'
      },
      1000,
      newId
    )

    expect(p1.id).toBe('prof-1')
    expect(p2.id).toBe('prof-2')

    // List profiles - verify no secret field exists
    const list = service.listProfiles(libraryDb, 'mira.novelpia')
    expect(list).toHaveLength(2)
    for (const prof of list) {
      expect((prof as unknown as Record<string, unknown>).secret).toBeUndefined()
      expect((prof as unknown as Record<string, unknown>).encryptedSecret).toBeUndefined()
    }

    // Verify secret decryption
    const decrypted1 = await service.getDecryptedSecret(libraryDb, p1.id)
    expect(decrypted1).toBe('session_token_123')

    libraryDb.close()
  })

  it('allows binding to switch profiles without recreating the binding, and handles missing profile cleanly', async () => {
    const libraryDb = setupLibraryDb()
    const workDb = setupWorkDb()
    const authService = new AuthProfileService(mockCrypto)
    const bindingService = new SourceBindingService()
    let idCounter = 1
    const newId = () => `id-${idCounter++}`

    const p1 = await authService.createProfile(
      libraryDb,
      {
        adapterId: 'mira.novelpia',
        label: 'Tài khoản VIP',
        secret: 'secret1'
      },
      1000,
      newId
    )

    const p2 = await authService.createProfile(
      libraryDb,
      {
        adapterId: 'mira.novelpia',
        label: 'Tài khoản Thường',
        secret: 'secret2'
      },
      1000,
      newId
    )

    // Create binding using p1
    const binding = bindingService.createBinding(
      workDb,
      'w1',
      {
        workId: 'w1',
        sourceId: 'mira.novelpia',
        remoteWorkId: 'novel-999',
        languageTag: 'ko',
        label: 'Bản Novelpia',
        role: 'primary',
        authProfileId: p1.id
      },
      1000,
      newId
    )

    expect(binding.authProfileId).toBe(p1.id)
    expect(authService.checkProfileStatus(libraryDb, binding.authProfileId)).toBe('ok')

    // Switch binding to p2: binding ID remains unchanged!
    const updated = bindingService.updateBinding(
      workDb,
      'w1',
      binding.id,
      { authProfileId: p2.id },
      2000
    )
    expect(updated.id).toBe(binding.id)
    expect(updated.authProfileId).toBe(p2.id)

    // Now copy work file to a new environment where p2 does not exist in libraryDb
    const freshLibraryDb = setupLibraryDb()
    expect(authService.checkProfileStatus(freshLibraryDb, updated.authProfileId)).toBe(
      'login_required'
    )

    // Catalog and binding in workDb are completely readable!
    const catalogItem: StoredCatalogItem = {
      id: 'item1',
      bindingId: binding.id,
      remoteChapterId: 'ch1',
      remoteUrl: null,
      chapterId: null,
      ordinalKey: '0001',
      volumeTitle: null,
      title: 'Hồi 1',
      kind: 'chapter',
      publishedAt: null,
      remoteUpdatedAt: null,
      revisionToken: null,
      accessState: 'public',
      firstSeenAt: 1000,
      lastSeenAt: 1000,
      missingStreak: 0,
      removedAt: null,
      metadataHash: 'meta1'
    }
    insertCatalogItem(workDb, catalogItem)

    expect(listSourceBindings(workDb)).toHaveLength(1)
    expect(listCatalogItems(workDb, binding.id)).toHaveLength(1)

    libraryDb.close()
    freshLibraryDb.close()
    workDb.close()
  })
})
