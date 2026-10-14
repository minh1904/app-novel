import type { Db } from './sqlite'

/** The match key of a dismissal: rule, rule version, paragraph and the target text it was made on. */
export const dismissalKey = (
  ruleCode: string,
  ruleVersion: number,
  segmentId: string,
  targetHash: string
): string => `${ruleCode}|${ruleVersion}|${segmentId}|${targetHash}`

/** Dismissals of one chapter, as match keys (change `add-translation-task-qa`). */
export function listDismissalKeys(db: Db, chapterId: string): Set<string> {
  return new Set(
    db
      .prepare(
        'SELECT rule_code, rule_version, segment_id, target_hash FROM qa_dismissal WHERE chapter_id = ?'
      )
      .all<{ rule_code: string; rule_version: number; segment_id: string; target_hash: string }>(
        chapterId
      )
      .map((row) => dismissalKey(row.rule_code, row.rule_version, row.segment_id, row.target_hash))
  )
}

export function addDismissal(
  db: Db,
  input: {
    ruleCode: string
    ruleVersion: number
    chapterId: string
    segmentId: string
    targetHash: string
    reason: string | null
    now: number
  }
): void {
  db.prepare(
    `INSERT OR IGNORE INTO qa_dismissal
       (rule_code, rule_version, chapter_id, segment_id, target_hash, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.ruleCode,
    input.ruleVersion,
    input.chapterId,
    input.segmentId,
    input.targetHash,
    input.reason,
    input.now
  )
}
