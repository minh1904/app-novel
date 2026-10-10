import { symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as v from 'valibot'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS } from '../../shared/contracts/channels'
import type { Result } from '../../shared/contracts/result'
import {
  sourceBindingIdentifyInputSchema,
  sourceCursorSchema,
  sourceOpaqueIdSchema
} from '../../shared/contracts/sources'
import type { SecretCrypto } from '../infra/storage/secretStore'
import { openDatabase } from '../infra/storage/sqlite'
import { migrate } from '../infra/storage/migrate'
import { librarySchema } from '../infra/storage/librarySchema'
import { createLibraryHandlers, guardHandlers } from '../ipc/libraryHandlers'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { AuthProfileService } from './authProfileService'
import type { NovelSourceAdapter, SourceManifest } from './domain'
import { createFolderAdapter } from './folderAdapter'
import { AdapterRuntime, AdapterRuntimeError } from './runtime'
import { createSourceServices } from './sourceServices'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const mockCrypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  encrypt: async (plain) => Buffer.from(`enc:${plain}`),
  decrypt: async (cipher) => ({
    value: Buffer.from(cipher).toString('utf8').replace(/^enc:/, ''),
    shouldReEncrypt: false
  })
}

describe('Sources security suite (Task 10.1)', () => {
  describe('1. Path traversal and symlink guarding in folder adapter', () => {
    it('refuses path traversal outside the folder root in getChapter', async () => {
      const root = tempDir()
      const outsideFile = join(tempDir(), 'secret.txt')
      await writeFile(outsideFile, 'khong duoc doc')
      await writeFile(join(root, 'c1.txt'), 'Chuong 1 hop le')

      const adapter = await createFolderAdapter(root, 'ja')

      await expect(
        adapter.getChapter!(
          { remoteWorkId: adapter.remoteWorkId, remoteChapterId: '../secret.txt' },
          { signal: new AbortController().signal, now: () => new Date() }
        )
      ).rejects.toThrow(/outside the selected root/)
    })

    it('rejects symbolic links found within source folders', async () => {
      const root = tempDir()
      const targetOutside = join(tempDir(), 'target.txt')
      await writeFile(targetOutside, 'Noi dung ngoai thu muc')

      const linkPath = join(root, 'symlink.txt')
      try {
        await symlink(targetOutside, linkPath)
      } catch {
        // Skip if OS privilege restricts symlink creation in test environment
        return
      }

      const adapter = await createFolderAdapter(root, 'ja')
      await expect(
        adapter.getCatalog!(
          { remoteWorkId: adapter.remoteWorkId },
          { signal: new AbortController().signal, now: () => new Date() }
        )
      ).rejects.toThrow(/symbolic links are not allowed/)
    })
  })

  describe('2. Payload, ID, and path size limits', () => {
    it('rejects candidate URLs exceeding 4096 characters in sourceBindingIdentifyInputSchema', () => {
      const oversizedCandidate = 'https://example.com/' + 'a'.repeat(4100)
      const parsed = v.safeParse(sourceBindingIdentifyInputSchema, {
        workId: '11111111-1111-4111-8111-111111111111',
        candidate: oversizedCandidate
      })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.issues[0].message).toContain('quá dài')
      }
    })

    it('rejects pagination cursors exceeding 2048 characters', () => {
      const oversizedCursor = 'c'.repeat(2050)
      const parsed = v.safeParse(sourceCursorSchema, oversizedCursor)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.issues[0].message).toContain('quá dài')
      }
    })

    it('rejects IDs exceeding 512 characters', () => {
      const oversizedId = 'i'.repeat(520)
      const parsed = v.safeParse(sourceOpaqueIdSchema, oversizedId)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.issues[0].message).toContain('quá dài')
      }
    })
  })

  describe('3. Secret redaction and credential protection', () => {
    it('never exposes raw secret or decrypted token in AuthProfileSummary or listProfiles', async () => {
      const dir = tempDir()
      const dbPath = join(dir, 'library.db')
      const db = openDatabase(dbPath)
      migrate(db, librarySchema)

      const authService = new AuthProfileService(mockCrypto)
      const rawSecret = 'SUPER_SECRET_COOKIE_OR_TOKEN_12345'

      const created = await authService.createProfile(
        db,
        {
          adapterId: 'mira.folder',
          label: 'Tai khoan VIP',
          secret: rawSecret
        },
        1000,
        () => 'auth-profile-1'
      )

      // Summary must not have secret or token fields
      expect(created).not.toHaveProperty('secret')
      expect(created).not.toHaveProperty('token')
      expect(JSON.stringify(created)).not.toContain(rawSecret)

      const listed = authService.listProfiles(db, 'mira.folder')
      expect(listed).toHaveLength(1)
      expect(listed[0]).not.toHaveProperty('secret')
      expect(JSON.stringify(listed)).not.toContain(rawSecret)
      db.close()
    })
  })

  describe('4. Operation execution guarded by manifest capabilities', () => {
    it('throws capability_denied when adapter without chapter capability attempts getChapter', async () => {
      const manifestWithoutChapter: SourceManifest = {
        manifestVersion: 1,
        sourceId: 'custom.catalog-only',
        displayName: 'Catalog Only Source',
        nativeNames: [],
        aliases: [],
        domains: ['catalog.example.com'],
        adapterVersion: '1.0.0',
        apiVersion: '1.0.0',
        dataVersion: 1,
        countryCode: 'CN',
        languageTags: ['zh-Hans'],
        capabilities: ['catalog'], // No 'chapter' capability!
        auth: 'none',
        origin: { kind: 'builtin' },
        limits: { maxPages: 2, pageSize: 50, timeoutMs: 5000 },
        health: 'healthy'
      }

      const dummyAdapter: NovelSourceAdapter = {
        manifest: manifestWithoutChapter,
        async getCatalog() {
          return {
            remoteWorkId: 'work-1',
            items: [],
            exhausted: true,
            complete: true
          }
        }
      }

      const runtime = new AdapterRuntime(dummyAdapter)

      await expect(
        runtime.getChapter({ remoteWorkId: 'work-1', remoteChapterId: 'ch-1' })
      ).rejects.toThrow(AdapterRuntimeError)

      try {
        await runtime.getChapter({ remoteWorkId: 'work-1', remoteChapterId: 'ch-1' })
      } catch (err) {
        expect(err).toBeInstanceOf(AdapterRuntimeError)
        const runtimeErr = err as AdapterRuntimeError
        expect(runtimeErr.code).toBe('capability_denied')
        expect(runtimeErr.message).toContain('chapter')
      }
    })

    it('throws capability_denied when adapter without catalog capability attempts getCatalog', async () => {
      const manifestWithoutCatalog: SourceManifest = {
        manifestVersion: 1,
        sourceId: 'custom.chapter-only',
        displayName: 'Chapter Only Source',
        nativeNames: [],
        aliases: [],
        domains: [],
        adapterVersion: '1.0.0',
        apiVersion: '1.0.0',
        dataVersion: 1,
        countryCode: 'JP',
        languageTags: ['ja'],
        capabilities: ['chapter'], // No 'catalog'
        auth: 'none',
        origin: { kind: 'builtin' },
        limits: { maxPages: 1, pageSize: 10, timeoutMs: 5000 },
        health: 'healthy'
      }

      const dummyAdapter: NovelSourceAdapter = {
        manifest: manifestWithoutCatalog,
        async getChapter() {
          return {
            remoteChapterId: 'ch-1',
            text: 'text',
            contentHash: 'a'.repeat(64),
            payloadHash: 'b'.repeat(64),
            normalizationVersion: 1
          }
        }
      }

      const runtime = new AdapterRuntime(dummyAdapter)
      await expect(runtime.getCatalog({ remoteWorkId: 'work-1' })).rejects.toThrow(
        AdapterRuntimeError
      )
    })
  })

  describe('5. IPC untrusted sender protection on sources channels', () => {
    it('refuses untrusted sender across all source IPC channels', async () => {
      const dir = tempDir()
      const library = LibraryStore.open({ dataDir: dir, now: () => 1000 })
      stores.push(library)
      const sources = createSourceServices(library, mockCrypto)

      const handlers = createLibraryHandlers(
        library,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        sources
      )

      // Guarded handlers: only accept sender === 'trusted-main'
      const guarded = guardHandlers(handlers, (sender: string) => sender === 'trusted-main')

      const sourceChannels = [
        CHANNELS.sourcesCatalogList,
        CHANNELS.sourcesCatalogGet,
        CHANNELS.sourcesBindingsList,
        CHANNELS.sourcesBindingsIdentify,
        CHANNELS.sourcesBindingsPreviewCreate,
        CHANNELS.sourcesBindingsCreate,
        CHANNELS.sourcesBindingsUpdate,
        CHANNELS.sourcesBindingsDelete,
        CHANNELS.sourcesSyncStart,
        CHANNELS.sourcesSyncCancel,
        CHANNELS.sourcesSyncStatus,
        CHANNELS.sourcesUpdatesList,
        CHANNELS.sourcesUpdatesMarkSeen,
        CHANNELS.sourcesUpdatesPreviewApply,
        CHANNELS.sourcesUpdatesApply,
        CHANNELS.sourcesRegistryList
      ]

      for (const channel of sourceChannels) {
        const refused = (await guarded[channel]('malicious-frame', {
          workId: '11111111-1111-4111-8111-111111111111'
        })) as Result<unknown>

        expect(refused.ok).toBe(false)
        if (!refused.ok) {
          expect(refused.error.code).toBe('untrusted_sender')
        }
      }
    })
  })
})
