import { createHash } from 'node:crypto'
import {
  applyEdits,
  resegment,
  segFromRecord,
  toSegmentInputs
} from '../../../shared/segmentation/segmentMap'
import {
  getProposal,
  insertTextSnapshot,
  latestTextSnapshot,
  setProposalPartDecision,
  type StoredProposalPart
} from '../../infra/storage/aiProposals'
import { StorageError } from '../../infra/storage/errors'
import type { Db } from '../../infra/storage/sqlite'
import { readText, saveText } from '../../infra/storage/textFile'
import { planProposalParts, type Candidate, type PlannedPart } from './proposalPlanner'

export const textHash = (text: string): string => createHash('sha256').update(text).digest('hex')

export interface AcceptResult {
  chapterId: string
  accepted: string[]
  skipped: PlannedPart[]
  rev: number
  content: string
  commandId: string
}

interface BeforeDecision {
  partId: string
  status: StoredProposalPart['status']
  actor: StoredProposalPart['decisionActor']
  reason: string | null
}

interface CheckpointPayload {
  before: BeforeDecision[]
  result: AcceptResult
}

function candidatesFor(db: Db, chapterId: string, partIds: string[]): Candidate[] {
  const result: Candidate[] = []
  for (const id of [...new Set(partIds)]) {
    const row = db
      .prepare(`SELECT p.id AS proposal_id FROM proposal_part pp
      JOIN proposal p ON p.id = pp.proposal_id WHERE pp.id = ? AND p.chapter_id = ?`)
      .get<{ proposal_id: string }>(id, chapterId)
    if (!row) throw new StorageError('not_found', 'Phần đề xuất không thuộc chương đang duyệt.')
    const proposal = getProposal(db, row.proposal_id)
    const part = proposal.parts.find((item) => item.id === id)!
    result.push({ proposal, part })
  }
  return result
}

export interface AcceptInput {
  chapterId: string
  partIds: string[]
  commandId: string
  kind?: 'parts' | 'all'
  actor: 'user' | 'auto'
  now: number
  newId: () => string
}

/** One transaction is the only write path for manual and automatic acceptance. */
export function acceptProposalParts(db: Db, input: AcceptInput): AcceptResult {
  return db.transaction(() => {
    const old = db
      .prepare(
        'SELECT chapter_id, kind, part_ids_json, actor, result_json FROM proposal_accept_command WHERE command_id = ?'
      )
      .get<{
        chapter_id: string
        kind: 'parts' | 'all'
        part_ids_json: string
        actor: AcceptInput['actor']
        result_json: string
      }>(input.commandId)
    if (old) {
      if (
        old.chapter_id !== input.chapterId ||
        old.actor !== input.actor ||
        old.kind !== (input.kind ?? 'parts') ||
        old.part_ids_json !== JSON.stringify([...new Set(input.partIds)])
      ) {
        throw new StorageError('validation', 'ID lệnh duyệt đã được dùng cho yêu cầu khác.')
      }
      return JSON.parse(old.result_json) as AcceptResult
    }
    const target = readText(db, input.chapterId, 'target')
    const source = readText(db, input.chapterId, 'source')
    const candidates = candidatesFor(db, input.chapterId, input.partIds)
    const plan = planProposalParts(
      { content: target.content, rev: target.rev, sourceHash: textHash(source.content) },
      candidates,
      input.actor === 'auto'
    )
    const before: BeforeDecision[] = candidates
      .filter(({ part }) => plan.accepted.includes(part.id))
      .map(({ part }) => ({
        partId: part.id,
        status: part.status,
        actor: part.decisionActor,
        reason: part.reason
      }))

    let saved = target
    if (plan.accepted.length > 0) {
      const moved = applyEdits(target.segments.map(segFromRecord), plan.edits)
      const segments = toSegmentInputs(resegment(plan.content, moved, 'vi'))
      saved = saveText(
        db,
        {
          chapterId: input.chapterId,
          side: 'target',
          content: plan.content,
          expectedRev: target.rev,
          segments
        },
        input.now,
        input.newId
      )
      for (const id of plan.accepted) {
        setProposalPartDecision(db, id, 'applied', input.actor, null, input.now)
      }
    }
    for (const skipped of plan.skipped) {
      const status =
        skipped.reason === 'needs-placement'
          ? 'needs-placement'
          : skipped.reason === 'source-changed'
            ? 'stale'
            : 'conflict'
      setProposalPartDecision(db, skipped.partId, status, null, skipped.reason, input.now)
    }
    const result: AcceptResult = {
      chapterId: input.chapterId,
      accepted: plan.accepted,
      skipped: plan.skipped,
      rev: saved.rev,
      content: saved.content,
      commandId: input.commandId
    }
    if (plan.accepted.length > 0) {
      insertTextSnapshot(db, {
        id: input.newId(),
        commandId: input.commandId,
        chapterId: input.chapterId,
        beforeRev: target.rev,
        afterRev: saved.rev,
        beforeContent: target.content,
        decisions: { before, result } satisfies CheckpointPayload,
        actor: input.actor,
        createdAt: input.now
      })
    }
    db.prepare(`INSERT INTO proposal_accept_command
      (command_id, chapter_id, kind, part_ids_json, actor, result_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      input.commandId,
      input.chapterId,
      input.kind ?? 'parts',
      JSON.stringify([...new Set(input.partIds)]),
      input.actor,
      JSON.stringify(result),
      input.now
    )
    return result
  })
}

export function acceptAllChapterParts(db: Db, input: Omit<AcceptInput, 'partIds'>): AcceptResult {
  return db.transaction(() => {
    const old = db
      .prepare(
        'SELECT chapter_id, kind, actor, result_json FROM proposal_accept_command WHERE command_id = ?'
      )
      .get<{
        chapter_id: string
        kind: 'parts' | 'all'
        actor: AcceptInput['actor']
        result_json: string
      }>(input.commandId)
    if (old) {
      if (old.chapter_id !== input.chapterId || old.actor !== input.actor || old.kind !== 'all') {
        throw new StorageError('validation', 'ID lệnh duyệt đã được dùng cho yêu cầu khác.')
      }
      return JSON.parse(old.result_json) as AcceptResult
    }
    const ids = db
      .prepare(`SELECT pp.id FROM proposal_part pp JOIN proposal p ON p.id = pp.proposal_id
      WHERE p.chapter_id = ? AND pp.status IN ('pending', 'conflict', 'stale', 'needs-placement')
      ORDER BY p.created_at, p.id, pp.ordinal`)
      .all<{ id: string }>(input.chapterId)
      .map((row) => row.id)
    return acceptProposalParts(db, { ...input, partIds: ids, kind: 'all' })
  })
}

export function denyProposalPart(db: Db, chapterId: string, partId: string, now: number): void {
  db.transaction(() => {
    const [{ part }] = candidatesFor(db, chapterId, [partId])
    if (part.status === 'applied') throw new StorageError('conflict', 'Phần này đã được nhận.')
    setProposalPartDecision(db, partId, 'rejected', 'user', null, now)
  })
}

export function undoLatestAccept(
  db: Db,
  chapterId: string,
  now: number,
  newId: () => string
): { content: string; rev: number; commandId: string } {
  return db.transaction(() => {
    const snapshot = latestTextSnapshot(db, chapterId)
    if (!snapshot || snapshot.undoneAt !== null) {
      throw new StorageError('not_found', 'Không có lượt duyệt để hoàn tác.')
    }
    const current = readText(db, chapterId, 'target')
    if (current.rev !== snapshot.afterRev) {
      throw new StorageError(
        'conflict',
        'Bản dịch đã đổi sau lượt duyệt; không thể hoàn tác tự động.'
      )
    }
    const moved = applyEdits(current.segments.map(segFromRecord), [
      { from: 0, to: current.content.length, insert: snapshot.beforeContent }
    ])
    const saved = saveText(
      db,
      {
        chapterId,
        side: 'target',
        content: snapshot.beforeContent,
        expectedRev: current.rev,
        segments: toSegmentInputs(resegment(snapshot.beforeContent, moved, 'vi'))
      },
      now,
      newId
    )
    const payload = snapshot.decisions as CheckpointPayload
    for (const decision of payload.before) {
      setProposalPartDecision(
        db,
        decision.partId,
        decision.status,
        decision.actor,
        decision.reason,
        now
      )
    }
    db.prepare('UPDATE text_snapshot SET undone_at = ? WHERE id = ?').run(now, snapshot.id)
    return { content: saved.content, rev: saved.rev, commandId: snapshot.commandId }
  })
}
