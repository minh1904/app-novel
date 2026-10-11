import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import type {
  AgentCancelInput,
  AgentOperationDetailView,
  AgentSendInput,
  AgentSendResult,
  AgentSessionDetailView,
  AgentSessionView,
  AgentUndoInput,
  AgentUndoResult,
  AgentWriteIntentAck
} from '../../shared/contracts/agent'
import type { Result } from '../../shared/contracts/result'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'
import { AgentRepository } from '../infra/storage/agentRepository'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

interface Setup {
  library: LibraryStore
  call<T = unknown>(channel: Channel, raw?: unknown): Result<T>
}

function setup(): Setup {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  return { library, call: (channel, raw) => handlers[channel](raw) as Result<never> }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code)
  return result.value
}

describe('agent IPC handlers', () => {
  it('creates, lists and gets sessions through validated calls', () => {
    const { call } = setup()

    const created = value(
      call<AgentSessionView>(CHANNELS.agentSessionsCreate, { title: 'Phiên dịch 1' })
    )
    expect(created.title).toBe('Phiên dịch 1')

    const listed = value<{ sessions: AgentSessionView[] }>(
      call(CHANNELS.agentSessionsList, { limit: 10 })
    )
    expect(listed.sessions).toHaveLength(1)
    expect(listed.sessions[0].id).toBe(created.id)

    const detail = value<AgentSessionDetailView>(
      call(CHANNELS.agentSessionsGet, { sessionId: created.id })
    )
    expect(detail.session.id).toBe(created.id)
    expect(detail.turns).toHaveLength(0)
  })

  it('rejects an invalid session id when getting session detail', () => {
    const { call } = setup()
    const result = call(CHANNELS.agentSessionsGet, { sessionId: 'not-a-uuid' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('validation')
  })

  it('sends turn and cancels active turn', () => {
    const { call } = setup()

    const sent = value<AgentSendResult>(
      call<AgentSendResult>(CHANNELS.agentTurnSend, {
        instruction: 'Dịch chương 1',
        context: {}
      } satisfies AgentSendInput)
    )
    expect(sent.turnId).toBeDefined()
    expect(sent.sessionId).toBeDefined()

    const cancelled = call<void>(CHANNELS.agentTurnCancel, {
      turnId: sent.turnId
    } satisfies AgentCancelInput)
    expect(cancelled.ok).toBe(true)

    const detail = value<AgentSessionDetailView>(
      call(CHANNELS.agentSessionsGet, { sessionId: sent.sessionId })
    )
    expect(detail.turns).toHaveLength(1)
    expect(detail.turns[0].status).toBe('cancelled')
  })

  it('gets operation detail and executes undo', () => {
    const { library, call } = setup()
    const repo = new AgentRepository(library.appDb)
    const session = repo.createSession({ id: randomUUID(), now: 10 })
    const turn = repo.createTurn({
      id: randomUUID(),
      sessionId: session.id,
      instruction: 'test',
      context: {},
      now: 10
    })
    const op = repo.createOperation({
      id: randomUUID(),
      turnId: turn.id,
      commandId: randomUUID(),
      capability: 'translate_chapter',
      target: { kind: 'work', workId: '00000000-0000-4000-8000-000000000001', workLabel: 'Test' },
      now: 10
    })
    repo.transitionOperation(op.id, 'running', { now: 10 })
    repo.transitionOperation(op.id, 'completed', { now: 11, hasChanges: true })

    const opDetail = value<AgentOperationDetailView>(
      call(CHANNELS.agentOperationGet, { operationId: op.id })
    )
    expect(opDetail.operation.id).toBe(op.id)
    expect(opDetail.operation.state).toBe('completed')

    const undoRes = value<AgentUndoResult>(
      call(CHANNELS.agentOperationUndo, { operationId: op.id } satisfies AgentUndoInput)
    )
    expect(undoRes.targetRev).toBe(0)

    const opAfter = value<AgentOperationDetailView>(
      call(CHANNELS.agentOperationGet, { operationId: op.id })
    )
    expect(opAfter.operation.state).toBe('undone')
  })

  it('accepts write ack from coordinator without error', () => {
    const { call } = setup()
    const ack = call<void>(CHANNELS.agentTargetWriteAck, {
      intentId: randomUUID(),
      status: 'ack',
      revision: 1
    } satisfies AgentWriteIntentAck)
    expect(ack.ok).toBe(true)
  })
})
