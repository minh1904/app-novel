import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { WorkFiles } from './workFiles'
import {
  insertCatalogItem,
  insertSourceBinding,
  listCatalogItems,
  listSourceBindings,
  rebuildScheduleIndex,
  type StoredCatalogItem,
  type StoredSourceBinding
} from './sourceStorage'

const tempDir = createTempDirs()

describe('source storage and schedule index projection', () => {
  it('rebuilds schedule index projection from work files and preserves bindings and catalog when projection is cleared', () => {
    const dir = tempDir()
    let nowTime = 1000
    const files = WorkFiles.open({ dataDir: dir, now: () => nowTime })

    // Create two works
    const work1 = files.createWorkFile('11111111-1111-4111-8111-111111111111', (db) => {
      db.exec(
        "INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('11111111-1111-4111-8111-111111111111', 'Truyện 1', 'ja', 1, 1)"
      )
      return { id: '11111111-1111-4111-8111-111111111111' }
    })
    const work2 = files.createWorkFile('22222222-2222-4222-8222-222222222222', (db) => {
      db.exec(
        "INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('22222222-2222-4222-8222-222222222222', 'Truyện 2', 'ko', 1, 1)"
      )
      return { id: '22222222-2222-4222-8222-222222222222' }
    })

    const binding1: StoredSourceBinding = {
      id: 'b1',
      adapterId: 'builtin.folder',
      adapterVersion: '1.0.0',
      remoteWorkId: 'folder:w1',
      canonicalUrl: null,
      countryCode: 'JP',
      languageTag: 'ja',
      label: 'Bản Nhật',
      isPrimary: true,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: 1000,
      lastAttemptAt: 1000,
      nextCheckAt: 2000,
      consecutiveFailures: 0,
      createdAt: 1000,
      updatedAt: 1000
    }

    const item1: StoredCatalogItem = {
      id: 'item1',
      bindingId: 'b1',
      remoteChapterId: 'ch-01',
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

    files.withWork(work1.id, (db) => {
      insertSourceBinding(db, binding1)
      insertCatalogItem(db, item1)
    })

    const binding2: StoredSourceBinding = {
      id: 'b2',
      adapterId: 'builtin.folder',
      adapterVersion: '1.0.0',
      remoteWorkId: 'folder:w2',
      canonicalUrl: null,
      countryCode: 'KR',
      languageTag: 'ko',
      label: 'Bản Hàn',
      isPrimary: true,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: 1000,
      lastAttemptAt: 1000,
      nextCheckAt: 3000,
      consecutiveFailures: 0,
      createdAt: 1000,
      updatedAt: 1000
    }

    files.withWork(work2.id, (db) => {
      insertSourceBinding(db, binding2)
    })

    // Rebuild schedule index in library.db
    const allBindings = [
      { workId: work1.id, bindings: files.withWork(work1.id, (db) => listSourceBindings(db)) },
      { workId: work2.id, bindings: files.withWork(work2.id, (db) => listSourceBindings(db)) }
    ]
    rebuildScheduleIndex(files.index, allBindings)

    const indexed = files.index
      .prepare(
        'SELECT work_id, binding_id, next_check_at FROM source_schedule_index ORDER BY binding_id'
      )
      .all<{ work_id: string; binding_id: string; next_check_at: number }>()
    expect(indexed).toEqual([
      { work_id: work1.id, binding_id: 'b1', next_check_at: 2000 },
      { work_id: work2.id, binding_id: 'b2', next_check_at: 3000 }
    ])

    // Delete projection completely from library.db
    files.index.exec('DELETE FROM source_schedule_index')
    expect(files.index.prepare('SELECT count(*) AS n FROM source_schedule_index').get()).toEqual({
      n: 0
    })

    // Work files still have all their bindings and catalogs
    files.withWork(work1.id, (db) => {
      const bindings = listSourceBindings(db)
      expect(bindings).toHaveLength(1)
      expect(bindings[0].label).toBe('Bản Nhật')
      const items = listCatalogItems(db, 'b1')
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Hồi 1')
    })
    files.withWork(work2.id, (db) => {
      const bindings = listSourceBindings(db)
      expect(bindings).toHaveLength(1)
      expect(bindings[0].label).toBe('Bản Hàn')
    })

    // Rebuild projection again restores the index
    rebuildScheduleIndex(files.index, [
      { workId: work1.id, bindings: files.withWork(work1.id, (db) => listSourceBindings(db)) },
      { workId: work2.id, bindings: files.withWork(work2.id, (db) => listSourceBindings(db)) }
    ])
    const restored = files.index
      .prepare(
        'SELECT work_id, binding_id, next_check_at FROM source_schedule_index ORDER BY binding_id'
      )
      .all<{ work_id: string; binding_id: string; next_check_at: number }>()
    expect(restored).toEqual(indexed)

    files.close()
  })
})
