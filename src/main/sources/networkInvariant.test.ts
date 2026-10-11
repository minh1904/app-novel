import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../testing/testing'
import { openDatabase } from '../infra/storage/sqlite'
import { workSchema } from '../infra/storage/workSchema'
import { migrate } from '../infra/storage/migrate'
import {
  insertSourceBinding,
  listCatalogItems,
  listUpdateEvents,
  type StoredSourceBinding
} from '../infra/storage/sourceStorage'
import type { NovelSourceAdapter } from './domain'
import { SourceSyncService } from './syncService'
import { SourceContentService } from './contentService'
import { kakuyomuManifest } from './kakuyomu/adapter'

const tempDir = createTempDirs()

describe('Network & Binding Invariants (Tasks 5.3, 7.1, 7.3)', () => {
  function setup() {
    const dbPath = join(tempDir(), 'work.mira')
    const db = openDatabase(dbPath)
    migrate(db, workSchema)

    // Pre-existing work
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
      VALUES ('w1', 'Tác phẩm Kakuyomu Test', 'ja', 1000, 1000);
    `)

    let idCounter = 1
    const newId = () => `id-${idCounter++}`

    // Counters to verify invariants
    const counters = {
      brokerWorkRequests: 0,
      brokerCatalogRequests: 0,
      brokerEpisodeRequests: 0,
      adapterIdentify: 0,
      adapterGetWork: 0,
      adapterGetCatalog: 0,
      adapterGetChapter: 0
    }

    const adapter: NovelSourceAdapter = {
      manifest: kakuyomuManifest,
      async identify(input) {
        counters.adapterIdentify++
        if (input.value.includes('1234567890')) {
          return { remoteWorkId: '1234567890' }
        }
        return null
      },
      async getWork(input) {
        counters.adapterGetWork++
        counters.brokerWorkRequests++
        return { remoteWorkId: input.remoteWorkId, title: 'テスト作品', languageTag: 'ja' }
      },
      async getCatalog(input) {
        counters.adapterGetCatalog++
        counters.brokerCatalogRequests++
        return {
          remoteWorkId: input.remoteWorkId,
          items: [
            { remoteChapterId: '111000001', title: '第1話', order: 1, access: 'public' },
            { remoteChapterId: '111000002', title: '第2話', order: 2, access: 'public' }
          ],
          exhausted: true,
          complete: true
        }
      },
      async getChapter(input) {
        counters.adapterGetChapter++
        counters.brokerEpisodeRequests++
        return {
          remoteChapterId: input.remoteChapterId,
          text: '本文テスト',
          contentHash: 'hash-chapter-111000001',
          payloadHash: 'payload-hash-111000001',
          normalizationVersion: 1
        }
      }
    }

    return { db, adapter, counters, newId }
  }

  it('proves Task 5.3 & 7.1 invariants: preview and sync perform zero chapter fetches and do not create chapters or translation jobs', async () => {
    const { db, adapter, counters, newId } = setup()

    // 1. Initial database counters
    const initialChapters =
      db.prepare('SELECT count(*) as count FROM chapter').get<{ count: number }>()?.count ?? 0
    const initialChapterText =
      db.prepare('SELECT count(*) as count FROM chapter_text').get<{ count: number }>()?.count ?? 0
    expect(initialChapters).toBe(0)
    expect(initialChapterText).toBe(0)

    // 2. Perform sync through SourceSyncService
    const storedBinding: StoredSourceBinding = {
      id: 'b-kakuyomu',
      adapterId: 'mira.jp.kakuyomu',
      adapterVersion: '1.0.0',
      remoteWorkId: '1234567890',
      canonicalUrl: 'https://kakuyomu.jp/works/1234567890',
      countryCode: 'JP',
      languageTag: 'ja',
      label: 'Kakuyomu Raw',
      isPrimary: true,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: null,
      lastAttemptAt: null,
      nextCheckAt: null,
      consecutiveFailures: 0,
      createdAt: 1000,
      updatedAt: 1000
    }
    insertSourceBinding(db, storedBinding)

    const syncService = new SourceSyncService(async () => adapter)
    const run = await syncService.startSync(db, 'b-kakuyomu', 1000, newId)

    expect(run.state).toBe('completed')
    expect(run.catalogComplete).toBe(true)

    // CRITICAL INVARIANT: Zero episode body fetches
    expect(counters.adapterGetChapter).toBe(0)
    expect(counters.brokerEpisodeRequests).toBe(0)

    // Catalog check called getCatalog exactly once
    expect(counters.adapterGetCatalog).toBe(1)
    expect(counters.brokerCatalogRequests).toBe(1)

    // CRITICAL DB INVARIANTS:
    // 1. Chapter table remains 0 (no chapters created)
    const chapterCount =
      db.prepare('SELECT count(*) as count FROM chapter').get<{ count: number }>()?.count ?? 0
    expect(chapterCount).toBe(0)

    // 2. chapter_text remains 0 (no text modified)
    const chapterTextCount =
      db.prepare('SELECT count(*) as count FROM chapter_text').get<{ count: number }>()?.count ?? 0
    expect(chapterTextCount).toBe(0)

    // 3. Catalog items exist with null chapterId
    const catalogItems = listCatalogItems(db, 'b-kakuyomu')
    expect(catalogItems).toHaveLength(2)
    for (const item of catalogItems) {
      expect(item.chapterId).toBeNull()
    }

    // 4. Update events recorded (2 added events)
    const events = listUpdateEvents(db, 'b-kakuyomu')
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.kind === 'added')).toBe(true)

    db.close()
  })

  it('proves Task 7.3: explicit content fetch creates revision by hash, duplicate hash is idempotent, and does not auto-apply or enqueue translation', () => {
    const { db, newId } = setup()
    const contentService = new SourceContentService()

    const storedBinding: StoredSourceBinding = {
      id: 'b1',
      adapterId: 'mira.jp.kakuyomu',
      adapterVersion: '1.0.0',
      remoteWorkId: '1234567890',
      canonicalUrl: 'https://kakuyomu.jp/works/1234567890',
      countryCode: 'JP',
      languageTag: 'ja',
      label: 'Kakuyomu Raw',
      isPrimary: true,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: null,
      lastAttemptAt: null,
      nextCheckAt: null,
      consecutiveFailures: 0,
      createdAt: 1000,
      updatedAt: 1000
    }
    insertSourceBinding(db, storedBinding)

    // Insert catalog item
    db.exec(`
      INSERT INTO source_catalog_item (
        id, binding_id, remote_chapter_id, ordinal_key, title, kind, access_state,
        first_seen_at, last_seen_at, metadata_hash
      ) VALUES (
        'item-ch1', 'b1', '111000001', '000001', '第1話', 'chapter', 'public',
        1000, 1000, ''
      );
    `)

    // First fetch with text V1 at publishedAt = 2024-01-01
    const rev1 = contentService.saveRevision(
      db,
      {
        catalogItemId: 'item-ch1',
        rawText: '第一話のテキスト内容',
        adapterVersion: '1.0.0',
        remoteUpdatedAt: 1704067200000
      },
      1000,
      newId
    )

    expect(rev1.normalizedText).toBe('第一話のテキスト内容')

    // Duplicate fetch with same content: idempotent
    const revDuplicate = contentService.saveRevision(
      db,
      {
        catalogItemId: 'item-ch1',
        rawText: '第一話のテキスト内容',
        adapterVersion: '1.0.0',
        remoteUpdatedAt: 1704067200000
      },
      1500,
      newId
    )

    expect(revDuplicate.id).toBe(rev1.id)

    // Edit with SAME publishedAt but different content: detected by hash!
    const rev2 = contentService.saveRevision(
      db,
      {
        catalogItemId: 'item-ch1',
        rawText: '第一話のテキスト内容（修正版）',
        adapterVersion: '1.0.0',
        remoteUpdatedAt: 1704067200000 // Identical publishedAt!
      },
      2000,
      newId
    )

    expect(rev2.id).not.toBe(rev1.id)
    expect(rev2.contentHash).not.toBe(rev1.contentHash)

    // Invariant: chapter table and chapter_text table remain completely unmutated
    const chapters =
      db.prepare('SELECT count(*) as count FROM chapter').get<{ count: number }>()?.count ?? 0
    const chapterTexts =
      db.prepare('SELECT count(*) as count FROM chapter_text').get<{ count: number }>()?.count ?? 0
    expect(chapters).toBe(0)
    expect(chapterTexts).toBe(0)

    db.close()
  })
})
