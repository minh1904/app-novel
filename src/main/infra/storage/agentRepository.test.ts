import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { librarySchema } from './librarySchema'
import { migrate } from './migrate'
import { openDatabase } from './sqlite'
import { AgentRepository } from './agentRepository'
import { StorageError } from './errors'

const tempDir = createTempDirs()
const id = (n: number): string => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`

function repository(): { repo: AgentRepository; close(): void } {
  const db = openDatabase(join(tempDir(), 'library.db'))
  migrate(db, librarySchema)
  return { repo: new AgentRepository(db), close: () => db.close() }
}

describe('AgentRepository', () => {
  it('creates, reads and lists app sessions and turns', () => {
    const { repo, close } = repository()
    repo.createSession({ id: id(1), title: 'Phiên', now: 1 })
    repo.createTurn({
      id: id(2),
      sessionId: id(1),
      instruction: 'dịch chương này',
      context: { workId: id(3), chapterId: id(4) },
      now: 2
    })
    expect(repo.getSession(id(1))).toMatchObject({ id: id(1), title: 'Phiên' })
    expect(repo.listSessions()).toHaveLength(1)
    expect(repo.getTurn(id(2))).toMatchObject({
      sessionId: id(1),
      status: 'queued',
      context: { workId: id(3), chapterId: id(4) }
    })
    expect(repo.listTurns(id(1)).map((turn) => turn.id)).toEqual([id(2)])
    close()
  })

  it('rejects a second active turn and permits another after a terminal transition', () => {
    const { repo, close } = repository()
    repo.createSession({ id: id(1), title: '', now: 1 })
    repo.createTurn({ id: id(2), sessionId: id(1), instruction: 'one', context: {}, now: 2 })
    expect(() =>
      repo.createTurn({ id: id(3), sessionId: id(1), instruction: 'two', context: {}, now: 3 })
    ).toThrowError(StorageError)
    repo.transitionTurn(id(2), 'running', 4)
    repo.transitionTurn(id(2), 'completed', 5)
    expect(() =>
      repo.createTurn({ id: id(3), sessionId: id(1), instruction: 'two', context: {}, now: 6 })
    ).not.toThrow()
    close()
  })

  it('deduplicates operation creation by command id and rejects reverse transitions', () => {
    const { repo, close } = repository()
    repo.createSession({ id: id(1), title: '', now: 1 })
    repo.createTurn({ id: id(2), sessionId: id(1), instruction: 'run', context: {}, now: 2 })
    const first = repo.createOperation({
      id: id(3),
      turnId: id(2),
      commandId: 'command-1',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId: id(4),
        workLabel: 'A',
        chapterId: id(5),
        chapterLabel: 'C1'
      },
      now: 3
    })
    const retry = repo.createOperation({
      id: id(6),
      turnId: id(2),
      commandId: 'command-1',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId: id(4),
        workLabel: 'A',
        chapterId: id(5),
        chapterLabel: 'C1'
      },
      now: 4
    })
    expect(retry.id).toBe(first.id)
    repo.transitionOperation(first.id, 'running', { now: 5 })
    repo.transitionOperation(first.id, 'completed', { now: 6, result: { applied: 2 } })
    expect(() => repo.transitionOperation(first.id, 'running', { now: 7 })).toThrowError(
      StorageError
    )
    close()
  })

  it('updates one activity row while preserving activity id and step sequence', () => {
    const { repo, close } = repository()
    repo.createSession({ id: id(1), title: '', now: 1 })
    repo.createTurn({ id: id(2), sessionId: id(1), instruction: 'run', context: {}, now: 2 })
    repo.putActivity({
      id: id(3),
      turnId: id(2),
      operationId: null,
      stepSeq: 1,
      kind: 'read',
      state: 'pending',
      label: 'Đọc',
      detail: { done: 0 },
      now: 3
    })
    repo.putActivity({
      id: id(3),
      turnId: id(2),
      operationId: null,
      stepSeq: 1,
      kind: 'read',
      state: 'running',
      label: 'Đang đọc',
      detail: { done: 7 },
      now: 4
    })
    expect(repo.listActivities(id(2))).toEqual([
      expect.objectContaining({ id: id(3), stepSeq: 1, state: 'running', detail: { done: 7 } })
    ])
    expect(() =>
      repo.putActivity({
        id: id(9),
        turnId: id(2),
        operationId: null,
        stepSeq: 1,
        kind: 'read',
        state: 'completed',
        label: 'Wrong id',
        detail: null,
        now: 5
      })
    ).toThrowError(StorageError)
    close()
  })
})
