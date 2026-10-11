import * as v from 'valibot'
import {
  agentCancelInputSchema,
  agentSendInputSchema,
  agentUndoInputSchema,
  agentWriteIntentAckSchema,
  type AgentCancelResult,
  type AgentOperationDetailView,
  type AgentSendResult,
  type AgentSessionDetailView,
  type AgentSessionView,
  type AgentUndoResult
} from '../../../shared/contracts/agent'
import { CHANNELS, EVENT_CHANNELS } from '../../../shared/contracts/channels'
import { idSchema } from '../../../shared/contracts/library'
import { StorageError } from '../../infra/storage/errors'
import { createHandler, createSinkHandler } from '../handler'
import { agentOf, type AreaHandlers, type HandlerDeps } from './deps'

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

export function agentHandlers(deps: HandlerDeps): AreaHandlers<'agent'> {
  return {
    [CHANNELS.agentSessionsList]: createHandler(
      sessionsListSchema,
      (input): { sessions: AgentSessionView[] } => {
        const agent = agentOf(deps)
        const sessions = agent.listSessions()
        const limited = input?.limit ? sessions.slice(0, input.limit) : sessions
        return { sessions: limited }
      }
    ),

    [CHANNELS.agentSessionsGet]: createHandler(
      sessionGetSchema,
      ({ sessionId }): AgentSessionDetailView => {
        const agent = agentOf(deps)
        const session = agent.getSession(sessionId)
        if (!session) {
          throw new StorageError('not_found', 'Không tìm thấy phiên agent.')
        }
        const turns = agent.listTurns(sessionId)
        return { session, turns }
      }
    ),

    [CHANNELS.agentSessionsCreate]: createHandler(
      sessionCreateSchema,
      (input): AgentSessionView => {
        return agentOf(deps).createSession(input?.title)
      }
    ),

    [CHANNELS.agentTurnSend]: createSinkHandler(
      agentSendInputSchema,
      (input, sink): AgentSendResult => {
        const agent = agentOf(deps)
        const accepted = agent.acceptTurn(input)
        if (accepted.created) {
          sink.onDestroyed(() => agent.cancelTurn(accepted.turnId))
          setImmediate(() => {
            void agent
              .runExistingTurn({
                sessionId: accepted.sessionId,
                turnId: accepted.turnId,
                requestId: accepted.requestId,
                commandId: input.clientCommandId,
                instruction: input.instruction,
                context: input.context,
                modelSelection: input.modelSelection,
                onStream: (event) => {
                  if (!sink.isDestroyed()) sink.send(EVENT_CHANNELS.agentStreamEvent, event)
                },
                onWriteIntent: (intent) => {
                  if (!sink.isDestroyed()) sink.send(EVENT_CHANNELS.agentTargetWriteIntent, intent)
                },
                onTargetChanged: (event) => {
                  if (!sink.isDestroyed()) sink.send(EVENT_CHANNELS.agentTargetChanged, event)
                }
              })
              .catch((error: unknown) => {
                console.error(
                  'Agent runtime failed:',
                  error instanceof Error ? error.message : 'unknown'
                )
              })
          })
        }
        return {
          requestId: accepted.requestId,
          turnId: accepted.turnId,
          sessionId: accepted.sessionId
        }
      }
    ),

    [CHANNELS.agentTurnCancel]: createHandler(
      agentCancelInputSchema,
      ({ turnId }): AgentCancelResult => ({ status: agentOf(deps).cancelTurn(turnId) })
    ),

    [CHANNELS.agentOperationGet]: createHandler(
      operationGetSchema,
      ({ operationId }): AgentOperationDetailView => {
        const op = agentOf(deps).getOperation(operationId)
        if (!op) {
          throw new StorageError('not_found', 'Không tìm thấy operation.')
        }
        return { operation: op }
      }
    ),

    [CHANNELS.agentOperationUndo]: createSinkHandler(
      agentUndoInputSchema,
      ({ operationId }, sink): AgentUndoResult => {
        const agent = agentOf(deps)
        const undone = agent.undoOperation(operationId)
        if (undone.target.kind === 'chapter' && !sink.isDestroyed()) {
          sink.send(EVENT_CHANNELS.agentTargetChanged, {
            target: {
              workId: undone.target.workId,
              chapterId: undone.target.chapterId,
              side: 'target'
            },
            lastAppliedRev: undone.targetRev,
            operationId
          })
        }
        return { targetRev: undone.targetRev }
      }
    ),

    [CHANNELS.agentTargetWriteAck]: createHandler(agentWriteIntentAckSchema, (input): void => {
      agentOf(deps).acknowledgeWriteIntent(input)
    })
  }
}
