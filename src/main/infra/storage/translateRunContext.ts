import type { Db } from './sqlite'

/**
 * The approved work context one chapter translation run was planned with (change
 * `translation-context-snapshot`). Written once by `plan()`, never updated: every batch, split,
 * retry-without-context and repair of the run builds its prompt from it, so they all see one version.
 */
export interface StoredRunContext {
  runKey: string
  chapterId: string
  /** Canonical JSON of the snapshot; parse with the reader that wrote it. */
  snapshotJson: string
  snapshotHash: string
  createdAt: number
}

/** A snapshot with no proposal after this long belongs to a run that produced nothing worth keeping. */
export const ORPHAN_RUN_CONTEXT_MS = 30 * 24 * 60 * 60 * 1000

export function createRunContext(db: Db, input: StoredRunContext): void {
  db.prepare(
    `INSERT INTO translate_run_context (run_key, chapter_id, snapshot_json, snapshot_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(input.runKey, input.chapterId, input.snapshotJson, input.snapshotHash, input.createdAt)
}

export function getRunContext(db: Db, runKey: string): StoredRunContext | null {
  const row = db
    .prepare(
      `SELECT run_key, chapter_id, snapshot_json, snapshot_hash, created_at
       FROM translate_run_context WHERE run_key = ?`
    )
    .get<{
      run_key: string
      chapter_id: string
      snapshot_json: string
      snapshot_hash: string
      created_at: number
    }>(runKey)
  if (!row) return null
  return {
    runKey: row.run_key,
    chapterId: row.chapter_id,
    snapshotJson: row.snapshot_json,
    snapshotHash: row.snapshot_hash,
    createdAt: row.created_at
  }
}

/**
 * Removes the chapter's snapshots that are older than `maxAgeMs` and that no proposal points to. A
 * proposal that still exists keeps its snapshot, so its trace stays rebuildable. Returns how many went.
 *
 * shortcut: a task item's snapshot (`task:<itemId>`) is always kept, because this work DB cannot join
 * `library.db` to see whether the item still exists; prune by item once tasks can be deleted.
 */
export function pruneOrphanRunContexts(
  db: Db,
  chapterId: string,
  now: number,
  maxAgeMs = ORPHAN_RUN_CONTEXT_MS
): number {
  const result = db
    .prepare(
      `DELETE FROM translate_run_context
       WHERE chapter_id = ? AND created_at < ?
         AND run_key NOT LIKE 'task:%'
         AND NOT EXISTS (SELECT 1 FROM proposal WHERE proposal.run_key = translate_run_context.run_key)`
    )
    .run(chapterId, now - maxAgeMs)
  return Number(result.changes)
}
