import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import {
  ORPHAN_RUN_CONTEXT_MS,
  createRunContext,
  getRunContext,
  pruneOrphanRunContexts,
  type StoredRunContext
} from './translateRunContext'
import { workSchema } from './workSchema'

const tempDir = createTempDirs()
const NOW = 1_700_000_000_000

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'run-context.mira'))
  migrate(db, workSchema)
  db.exec(`
    INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'T', 'ja', 1, 1);
    INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c1', 0, 1, 1), ('c2', 1, 1, 1);
  `)
  return db
}

const snapshot = (runKey: string, chapterId = 'c1', createdAt = NOW): StoredRunContext => ({
  runKey,
  chapterId,
  snapshotJson: '{"version":1}',
  snapshotHash: 'hash-' + runKey,
  createdAt
})

function addProposal(db: Db, runKey: string): void {
  db.prepare(
    `INSERT INTO proposal (id, chapter_id, origin, policy, source_rev, source_hash, target_base_rev,
       target_base_content, run_key, created_at, updated_at)
     VALUES (?, 'c1', 'translate', 'review', 0, 'h', 0, '', ?, 1, 1)`
  ).run('p-' + runKey, runKey)
}

describe('translate run context', () => {
  it('stores a snapshot once and reads it back by run key', () => {
    const db = fresh()
    createRunContext(db, snapshot('translate:a'))
    expect(getRunContext(db, 'translate:a')).toEqual(snapshot('translate:a'))
    expect(getRunContext(db, 'translate:missing')).toBeNull()
    // Immutable: a second write for the same run is an error, not an update.
    expect(() =>
      createRunContext(db, { ...snapshot('translate:a'), snapshotHash: 'other' })
    ).toThrow()
    db.close()
  })

  it('goes away with its chapter', () => {
    const db = fresh()
    createRunContext(db, snapshot('translate:a'))
    db.exec("DELETE FROM chapter WHERE id = 'c1'")
    expect(getRunContext(db, 'translate:a')).toBeNull()
    db.close()
  })

  it('prunes only old snapshots of the chapter that no proposal points to', () => {
    const db = fresh()
    const old = NOW - ORPHAN_RUN_CONTEXT_MS - 1
    createRunContext(db, snapshot('translate:old-orphan', 'c1', old))
    createRunContext(db, snapshot('translate:old-kept', 'c1', old))
    createRunContext(db, snapshot('translate:recent', 'c1', NOW - 1000))
    createRunContext(db, snapshot('translate:other-chapter', 'c2', old))
    addProposal(db, 'translate:old-kept')

    expect(pruneOrphanRunContexts(db, 'c1', NOW)).toBe(1)
    expect(getRunContext(db, 'translate:old-orphan')).toBeNull()
    expect(getRunContext(db, 'translate:old-kept')).not.toBeNull()
    expect(getRunContext(db, 'translate:recent')).not.toBeNull()
    expect(getRunContext(db, 'translate:other-chapter')).not.toBeNull()
    db.close()
  })
})
