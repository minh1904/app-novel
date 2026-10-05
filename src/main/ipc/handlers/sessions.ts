import { aiSessionsListSchema, aiTurnsListSchema, type AiTurnView } from '../../../shared/contracts/aiHistory'
import { CHANNELS } from '../../../shared/contracts/channels'
import { listAiSessions, listAiTurns } from '../../infra/storage/aiSessions'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

export function sessionHandlers({ library }: HandlerDeps): AreaHandlers<'ai:sessions'> {
  return {
    [CHANNELS.aiSessionsList]: createHandler(aiSessionsListSchema, (input) =>
      library.withWork(input.workId, (db) => ({
        sessions: listAiSessions(db, input.limit ?? 30,
          input.beforeUpdatedAt === undefined || input.beforeId === undefined
            ? undefined : { updatedAt: input.beforeUpdatedAt, id: input.beforeId })
      }))
    ),
    [CHANNELS.aiTurnsList]: createHandler(aiTurnsListSchema, (input) =>
      library.withWork(input.workId, (db) => ({
        turns: listAiTurns(db, input.sessionId, input.limit ?? 100,
          input.beforeCreatedAt === undefined || input.beforeId === undefined
            ? undefined : { createdAt: input.beforeCreatedAt, id: input.beforeId })
          .map((turn): AiTurnView => {
            const link = db.prepare(`SELECT p.id AS proposal_id, pp.id AS part_id, pp.status
              FROM proposal p JOIN proposal_part pp ON pp.proposal_id = p.id
              WHERE p.turn_id = ? ORDER BY pp.ordinal LIMIT 1`)
              .get<{ proposal_id: string; part_id: string; status: AiTurnView['proposalStatus'] }>(turn.id)
            return {
              ...turn, proposalId: link?.proposal_id ?? null,
              partId: link?.part_id ?? null, proposalStatus: link?.status ?? null
            }
          })
      }))
    )
  }
}
