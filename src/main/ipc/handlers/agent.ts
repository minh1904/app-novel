import { randomUUID } from 'node:crypto'
import * as v from 'valibot'
import {
  agentCancelInputSchema,
  agentSendInputSchema,
  agentUndoInputSchema,
  agentWriteIntentAckSchema,
  type AgentOperationDetailView,
  type AgentSendResult,
  type AgentSessionDetailView,
  type AgentSessionView,
  type AgentUndoResult
} from '../../../shared/contracts/agent'
import { CHANNELS } from '../../../shared/contracts/channels'
import { idSchema } from '../../../shared/contracts/library'
import { AgentRepository } from '../../infra/storage/agentRepository'
import { StorageError } from '../../infra/storage/errors'
import { createHandler, createSinkHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

const sessionsListSchema = v.nullable(
  v.strictObject({
    limit: v.optional(v.number())
  })
)

const sessionGetSchema = v.strictObject({
  sessionId: idSchema
})

const sessionCreateSchema = v.nullable(
  v.strictObject({
    title: v.optional(v.string())
  })
)

const operationGetSchema = v.strictObject({
  operationId: idSchema
})

export function agentHandlers({ library }: HandlerDeps): AreaHandlers<'agent'> {
  return {
    [CHANNELS.agentSessionsList]: createHandler(
      sessionsListSchema,
      (input): { sessions: AgentSessionView[] } => {
        const repo = new AgentRepository(library.appDb)
        const sessions = repo.listSessions()
        const limited = input?.limit ? sessions.slice(0, input.limit) : sessions
        return { sessions: limited }
      }
    ),

    [CHANNELS.agentSessionsGet]: createHandler(
      sessionGetSchema,
      ({ sessionId }): AgentSessionDetailView => {
        const repo = new AgentRepository(library.appDb)
        const session = repo.getSession(sessionId)
        if (!session) {
          throw new StorageError('not_found', 'Không tìm thấy phiên agent.')
        }
        const turns = repo.listTurns(sessionId)
        return { session, turns }
      }
    ),

    [CHANNELS.agentSessionsCreate]: createHandler(
      sessionCreateSchema,
      (input): AgentSessionView => {
        const repo = new AgentRepository(library.appDb)
        const id = randomUUID()
        return repo.createSession({ id, title: input?.title, now: Date.now() })
      }
    ),

    [CHANNELS.agentTurnSend]: createSinkHandler(agentSendInputSchema, (input): AgentSendResult => {
      const repo = new AgentRepository(library.appDb)
      const now = Date.now()
      let sessionId = input.sessionId
      if (!sessionId) {
        const session = repo.createSession({ id: randomUUID(), now })
        sessionId = session.id
      }
      const turnId = randomUUID()
      const requestId = randomUUID()
      repo.createTurn({
        id: turnId,
        sessionId,
        instruction: input.instruction,
        context: input.context ?? {},
        now
      })
      return { requestId, turnId, sessionId }
    }),

    [CHANNELS.agentTurnCancel]: createHandler(agentCancelInputSchema, ({ turnId }): void => {
      const repo = new AgentRepository(library.appDb)
      const turn = repo.getTurn(turnId)
      if (turn?.status === 'queued') {
        const now = Date.now()
        repo.transitionTurn(turnId, 'running', now)
        repo.transitionTurn(turnId, 'cancelled', now)
      } else if (turn?.status === 'running') {
        repo.transitionTurn(turnId, 'cancelled', Date.now())
      }
    }),

    [CHANNELS.agentOperationGet]: createHandler(
      operationGetSchema,
      ({ operationId }): AgentOperationDetailView => {
        const repo = new AgentRepository(library.appDb)
        const op = repo.getOperation(operationId)
        if (!op) {
          throw new StorageError('not_found', 'Không tìm thấy operation.')
        }
        return { operation: op }
      }
    ),

    [CHANNELS.agentOperationUndo]: createHandler(
      agentUndoInputSchema,
      ({ operationId }): AgentUndoResult => {
        const repo = new AgentRepository(library.appDb)
        const op = repo.getOperation(operationId)
        if (!op) {
          throw new StorageError('not_found', 'Không tìm thấy operation.')
        }
        repo.transitionOperation(operationId, 'undone', { now: Date.now(), hasChanges: true })
        return { targetRev: 0 }
      }
    ),

    [CHANNELS.agentTargetWriteAck]: createHandler(agentWriteIntentAckSchema, (_input): void => {
      // Coordinator acknowledgement placeholder
    })
  }
}
