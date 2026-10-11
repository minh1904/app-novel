import { randomUUID } from 'node:crypto'
import type { AgentTurnState } from '../../../shared/contracts/agent'
import {
  acceptProposalParts,
  denyProposalPart,
  type AcceptResult
} from '../proposals/proposalService'
import {
  getAiSession,
  listAiSessions,
  listAiTurns,
  type StoredTurnStatus
} from '../../infra/storage/aiSessions'
import { getProposal as readProposal, type StoredProposal } from '../../infra/storage/aiProposals'
import type { Db } from '../../infra/storage/sqlite'
import type { WorkFiles } from '../../infra/storage/workFiles'

export interface LegacyRef {
  workId: string
  sessionId: string
  turnId: string
}

export interface LegacySessionListItem {
  workId: string
  legacySessionId: string
  title: string
  lastChapterId: string | null
  createdAt: number
  updatedAt: number
  agentSessionId?: string
}

export interface ImportLegacySessionResult {
  agentSessionId: string
  alreadyImported: boolean
  turnCount: number
}

export interface AcceptLegacyProposalInput {
  chapterId: string
  partIds: string[]
  commandId: string
  kind?: 'parts' | 'all'
  actor: 'user' | 'auto'
  now: number
  newId?: () => string
}

function mapLegacyTurnStatus(status: StoredTurnStatus): AgentTurnState {
  switch (status) {
    case 'done':
      return 'completed'
    case 'sending':
      return 'queued'
    case 'running':
      return 'running'
    case 'cancelled':
      return 'cancelled'
    case 'error':
      return 'failed'
    case 'interrupted':
      return 'interrupted'
    default:
      return 'completed'
  }
}

/**
 * Lists all legacy AI sessions across works on disk.
 * Returns both unimported and already imported legacy sessions (with agentSessionId if imported).
 */
export function listLegacySessions(workFiles: WorkFiles, libraryDb: Db): LegacySessionListItem[] {
  const importedMap = new Map<string, string>()
  const importRows = libraryDb
    .prepare('SELECT work_id, legacy_session_id, agent_session_id FROM agent_legacy_import')
    .all<{ work_id: string; legacy_session_id: string; agent_session_id: string }>()
  for (const row of importRows) {
    importedMap.set(`${row.work_id}:${row.legacy_session_id}`, row.agent_session_id)
  }

  const result: LegacySessionListItem[] = []
  const { works } = workFiles.list()

  for (const work of works) {
    try {
      workFiles.withWork(work.id, (workDb) => {
        const sessions = listAiSessions(workDb, 1000)
        for (const session of sessions) {
          const importedId = importedMap.get(`${work.id}:${session.id}`)
          result.push({
            workId: work.id,
            legacySessionId: session.id,
            title: session.title,
            lastChapterId: session.lastChapterId,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            agentSessionId: importedId
          })
        }
      })
    } catch {
      // Work file might have problems, ignore and continue
    }
  }

  return result.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Lazily imports a legacy session from a work database into library.db.
 * Idempotent: importing the same (workId, legacySessionId) multiple times returns
 * the existing agentSessionId without duplicating session or turns.
 */
export function importLegacySession(
  libraryDb: Db,
  workFiles: WorkFiles,
  input: { workId: string; legacySessionId: string },
  now: number
): ImportLegacySessionResult {
  // Check if already imported
  const existing = libraryDb
    .prepare(
      'SELECT agent_session_id FROM agent_legacy_import WHERE work_id = ? AND legacy_session_id = ?'
    )
    .get<{ agent_session_id: string }>(input.workId, input.legacySessionId)

  if (existing) {
    const turnCount =
      libraryDb
        .prepare('SELECT count(*) as count FROM agent_turn WHERE session_id = ?')
        .get<{ count: number }>(existing.agent_session_id)?.count ?? 0
    return {
      agentSessionId: existing.agent_session_id,
      alreadyImported: true,
      turnCount
    }
  }

  // Read legacy session and turns from original work DB
  const { session, turns } = workFiles.withWork(input.workId, (workDb) => {
    const session = getAiSession(workDb, input.legacySessionId)
    const turns = listAiTurns(workDb, input.legacySessionId, 1000)
    return { session, turns }
  })

  // Sort turns in chronological order
  turns.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))

  return libraryDb.transaction(() => {
    // Re-check inside transaction in case of concurrent import
    const conExisting = libraryDb
      .prepare(
        'SELECT agent_session_id FROM agent_legacy_import WHERE work_id = ? AND legacy_session_id = ?'
      )
      .get<{ agent_session_id: string }>(input.workId, input.legacySessionId)

    if (conExisting) {
      const turnCount =
        libraryDb
          .prepare('SELECT count(*) as count FROM agent_turn WHERE session_id = ?')
          .get<{ count: number }>(conExisting.agent_session_id)?.count ?? 0
      return {
        agentSessionId: conExisting.agent_session_id,
        alreadyImported: true,
        turnCount
      }
    }

    const agentSessionId = randomUUID()

    libraryDb
      .prepare('INSERT INTO agent_session (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(agentSessionId, session.title, session.createdAt, session.updatedAt)

    libraryDb
      .prepare(
        'INSERT INTO agent_legacy_import (work_id, legacy_session_id, agent_session_id, imported_at) VALUES (?, ?, ?, ?)'
      )
      .run(input.workId, input.legacySessionId, agentSessionId, now)

    const insertTurn = libraryDb.prepare(
      `INSERT INTO agent_turn (
        id, session_id, instruction, answer, reasoning, context_json,
        status, usage_json, cost_usd, legacy_ref_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const insertTurnMap = libraryDb.prepare(
      `INSERT INTO agent_legacy_turn_import (
        work_id, legacy_session_id, legacy_turn_id, agent_turn_id, imported_at
      ) VALUES (?, ?, ?, ?, ?)`
    )

    for (const turn of turns) {
      const agentTurnId = randomUUID()
      const legacyRef: LegacyRef = {
        workId: input.workId,
        sessionId: input.legacySessionId,
        turnId: turn.id
      }
      const context = {
        workId: input.workId,
        chapterId: turn.chapterId ?? undefined,
        blocks: turn.context
      }

      insertTurn.run(
        agentTurnId,
        agentSessionId,
        turn.question,
        turn.answer,
        turn.reasoning,
        JSON.stringify(context),
        mapLegacyTurnStatus(turn.status),
        turn.usage ? JSON.stringify(turn.usage) : null,
        turn.costUsd,
        JSON.stringify(legacyRef),
        turn.createdAt,
        turn.updatedAt
      )

      insertTurnMap.run(input.workId, input.legacySessionId, turn.id, agentTurnId, now)
    }

    return {
      agentSessionId,
      alreadyImported: false,
      turnCount: turns.length
    }
  })
}

/**
 * Reads proposals created by a legacy turn from the original work DB.
 */
export function getLegacyProposalsForTurn(
  workFiles: WorkFiles,
  legacyRef: LegacyRef
): StoredProposal[] {
  return workFiles.withWork(legacyRef.workId, (workDb) => {
    const rows = workDb
      .prepare(
        'SELECT id FROM proposal WHERE session_id = ? AND turn_id = ? ORDER BY created_at, id'
      )
      .all<{ id: string }>(legacyRef.sessionId, legacyRef.turnId)

    return rows.map((r) => readProposal(workDb, r.id))
  })
}

/**
 * Routes Accept proposal parts for a legacy turn to the original work DB.
 */
export function acceptLegacyProposalParts(
  workFiles: WorkFiles,
  legacyRef: LegacyRef,
  input: AcceptLegacyProposalInput
): AcceptResult {
  return workFiles.withWork(legacyRef.workId, (workDb) => {
    return acceptProposalParts(workDb, {
      ...input,
      newId: input.newId ?? randomUUID
    })
  })
}

/**
 * Routes Deny proposal part for a legacy turn to the original work DB.
 */
export function denyLegacyProposalPart(
  workFiles: WorkFiles,
  legacyRef: LegacyRef,
  chapterId: string,
  partId: string,
  now: number
): void {
  workFiles.withWork(legacyRef.workId, (workDb) => {
    denyProposalPart(workDb, chapterId, partId, now)
  })
}

/**
 * Retrieves the legacyRef for an agent turn, if the turn was imported from a legacy session.
 */
export function getLegacyRefForTurn(libraryDb: Db, agentTurnId: string): LegacyRef | null {
  const row = libraryDb
    .prepare('SELECT legacy_ref_json FROM agent_turn WHERE id = ?')
    .get<{ legacy_ref_json: string | null }>(agentTurnId)

  if (!row?.legacy_ref_json) return null
  try {
    return JSON.parse(row.legacy_ref_json) as LegacyRef
  } catch {
    return null
  }
}
