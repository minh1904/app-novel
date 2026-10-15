import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../testing/testing'
import { openDatabase } from '../infra/storage/sqlite'
import { workSchema } from '../infra/storage/workSchema'
import { migrate } from '../infra/storage/migrate'
import { readText, saveText } from '../infra/storage/textFile'
import {
  insertCatalogItem,
  insertSourceBinding,
  listContentRevisions,
  listUpdateEvents,
  type StoredCatalogItem,
  type StoredSourceBinding
} from '../infra/storage/sourceStorage'
import { SourceContentService } from './contentService'

const tempDir = createTempDirs()

describe('SourceContentService', () => {
  function setupDb() {
    const dbPath = join(tempDir(), 'work.mira')
    const db = openDatabase(dbPath)
    migrate(db, workSchema)
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
      VALUES ('w1', 'Tác phẩm', 'ja', 1, 1);
      INSERT INTO chapter (id, position, title, created_at, updated_at)
      VALUES ('c1', 0, 'Chương 1', 1, 1);
    `)

    const binding: StoredSourceBinding = {
      id: 'b1',
      adapterId: 'builtin.single-file',
      adapterVersion: '1.0.0',
      remoteWorkId: 'file:raw.txt',
      canonicalUrl: null,
      countryCode: 'JP',
      languageTag: 'ja',
      label: 'Bản file',
      isPrimary: true,
      enabled: true,
      authProfileId: null,
      schedulePolicyJson: '{}',
      catalogCursorJson: null,
      lastValidSyncAt: 1000,
      lastAttemptAt: 1000,
      nextCheckAt: null,
      consecutiveFailures: 0,
      createdAt: 1000,
      updatedAt: 1000
    }
    insertSourceBinding(db, binding)

    const catalogItem: StoredCatalogItem = {
      id: 'item1',
      bindingId: 'b1',
      remoteChapterId: 'ch1',
      remoteUrl: null,
      chapterId: 'c1',
      ordinalKey: '0001',
      volumeTitle: null,
      title: 'Chương 1',
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
    insertCatalogItem(db, catalogItem)

    return { db, binding, catalogItem }
  }

  it('inserts content revision idempotently when hash is identical', () => {
    const { db } = setupDb()
    const service = new SourceContentService()
    let idCounter = 1
    const newId = () => `rev-${idCounter++}`

    const rev1 = service.saveRevision(
      db,
      {
        catalogItemId: 'item1',
        rawText: '最初の段落\r\n次の段落',
        adapterVersion: '1.0.0'
      },
      1000,
      newId
    )

    expect(rev1.id).toBe('rev-1')
    expect(rev1.normalizedText).toBe('最初の段落\n次の段落')
    expect(listContentRevisions(db, 'item1')).toHaveLength(1)

    // Save again with identical content
    const rev2 = service.saveRevision(
      db,
      {
        catalogItemId: 'item1',
        rawText: '最初の段落\n次の段落', // CRLF vs LF normalizes to same
        adapterVersion: '1.0.0'
      },
      2000,
      newId
    )

    expect(rev2.id).toBe('rev-1')
    expect(listContentRevisions(db, 'item1')).toHaveLength(1)

    db.close()
  })

  it('detects raw_changed event when remote text changes, but never overwrites source or target', () => {
    const { db } = setupDb()
    const service = new SourceContentService()
    let idCounter = 1
    const newId = () => `id-${idCounter++}`

    // Initial source text and target translation
    saveText(
      db,
      {
        chapterId: 'c1',
        side: 'source',
        content: 'Bản gốc ban đầu',
        expectedRev: 0,
        segments: []
      },
      1000,
      newId
    )

    saveText(
      db,
      {
        chapterId: 'c1',
        side: 'target',
        content: 'Bản dịch tiếng Việt đã hoàn thành',
        expectedRev: 0,
        segments: []
      },
      1000,
      newId
    )

    // Now a new revision arrives from remote with modified raw text
    service.saveRevision(
      db,
      {
        catalogItemId: 'item1',
        rawText: 'Bản gốc đã được tác giả sửa đổi',
        adapterVersion: '1.0.0'
      },
      2000,
      newId
    )

    // Check that raw_changed event was created
    const events = listUpdateEvents(db, 'b1')
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('raw_changed')
    expect(events[0].catalogItemId).toBe('item1')
    expect(events[0].seenAt).toBeNull()
    expect(events[0].actedAt).toBeNull()

    // CRITICAL: verify that chapter_text.source and chapter_text.target are NOT overwritten
    const sourceAfter = readText(db, 'c1', 'source')
    const targetAfter = readText(db, 'c1', 'target')
    expect(sourceAfter.content).toBe('Bản gốc ban đầu')
    expect(targetAfter.content).toBe('Bản dịch tiếng Việt đã hoàn thành')

    db.close()
  })

  it('provides apply preview and rejects apply with revision conflict', () => {
    const { db } = setupDb()
    const service = new SourceContentService()
    let idCounter = 1
    const newId = () => `id-${idCounter++}`

    saveText(
      db,
      {
        chapterId: 'c1',
        side: 'source',
        content: 'V1',
        expectedRev: 0,
        segments: []
      },
      1000,
      newId
    )
    saveText(
      db,
      {
        chapterId: 'c1',
        side: 'target',
        content: 'Bản dịch V1',
        expectedRev: 0,
        segments: []
      },
      1000,
      newId
    )

    const rev = service.saveRevision(
      db,
      {
        catalogItemId: 'item1',
        rawText: 'V2 Mới',
        adapterVersion: '1.0.0'
      },
      2000,
      newId
    )

    const preview = service.previewApply(db, 'c1', rev.id)
    expect(preview.chapterId).toBe('c1')
    expect(preview.currentContent).toBe('V1')
    expect(preview.newContent).toBe('V2 Mới')
    expect(preview.expectedRev).toBe(1)
    expect(preview.hasTarget).toBe(true)
    expect(preview.targetContent).toBe('Bản dịch V1')

    // Expect conflict when expectedRev is wrong
    expect(() =>
      service.applyRevision(
        db,
        {
          chapterId: 'c1',
          revisionId: rev.id,
          expectedRev: 99
        },
        3000,
        newId
      )
    ).toThrowError(/conflict/i)

    // Verify DB was not modified on failed apply
    expect(readText(db, 'c1', 'source').content).toBe('V1')

    // Apply with correct expectedRev succeeds
    const applied = service.applyRevision(
      db,
      {
        chapterId: 'c1',
        revisionId: rev.id,
        expectedRev: 1
      },
      3000,
      newId
    )

    expect(applied.currentRev).toBe(2)
    expect(readText(db, 'c1', 'source').content).toBe('V2 Mới')
    expect(readText(db, 'c1', 'source').segments).toHaveLength(1)
    // Target translation is completely preserved!
    expect(readText(db, 'c1', 'target').content).toBe('Bản dịch V1')

    // Event marked as acted
    const events = listUpdateEvents(db, 'b1')
    expect(events[0].actedAt).toBe(3000)

    db.close()
  })
})
