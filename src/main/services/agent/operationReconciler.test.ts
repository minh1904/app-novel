import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import {
  applyAgentTranslationBatch,
  markAgentOperationTerminal,
  prepareAgentOperation,
  readAgentOperationEvidence
} from '../../infra/storage/agentOperationJournal'
import { AgentRepository } from '../../infra/storage/agentRepository'
import { insertWork, readWork } from '../../infra/storage/workFile'
import { WorkFiles } from '../../infra/storage/workFiles'
import { saveText } from '../../infra/storage/textFile'
import { reconcileStartupOperations } from './operationReconciler'

const tempDir = createTempDirs()
const workFilesList: WorkFiles[] = []

afterEach(() => {
  for (const wf of workFilesList.splice(0)) {
    try {
      wf.index.close()
    } catch {
      // ignore
    }
  }
})

function setupFixture(dir: string): {
  workFiles: WorkFiles
  repo: AgentRepository
  workId: string
  chapterId: string
} {
  const workFiles = WorkFiles.open({ dataDir: dir, now: () => 1000 })
  workFilesList.push(workFiles)
  const repo = new AgentRepository(workFiles.index)

  const workId = '00000000-0000-0000-0000-000000000001'
  const chapterId = 'ch-1'

  const summary = workFiles.createWorkFile(workId, (db) => {
    insertWork(db, workId, { title: 'Tác phẩm 1', sourceLang: 'ja' }, 1000)
    db.prepare(
      'INSERT INTO chapter (id, position, title, created_at, updated_at) VALUES (?, 1, ?, 1000, 1000)'
    ).run(chapterId, 'Chương 1')
    let segSeq = 0
    const newSegId = () => `seg-${++segSeq}`
    saveText(
      db,
      {
        chapterId,
        side: 'source',
        content: 'Câu một. Câu hai.',
        expectedRev: 0,
        segments: [
          { start: 0, end: 8 },
          { start: 9, end: 17 }
        ]
      },
      1000,
      newSegId
    )
    saveText(
      db,
      {
        chapterId,
        side: 'target',
        content: '',
        expectedRev: 0,
        segments: []
      },
      1000,
      newSegId
    )
    return readWork(db)
  })
  workFiles.syncIndex(summary)

  return { workFiles, repo, workId, chapterId }
}

describe('operationReconciler', () => {
  it('reconciles crash trước batch: prepared checkpoint đơn độc không có batch nào thì thành interrupted', () => {
    const dir = tempDir()
    const { workFiles, repo, workId, chapterId } = setupFixture(dir)

    const session = repo.createSession({ id: 's1', title: 'Phiên 1', now: 1000 })
    const turn = repo.createTurn({
      id: 't1',
      sessionId: session.id,
      instruction: 'Dịch chương 1',
      context: { workId, chapterId },
      now: 1010
    })
    repo.transitionTurn(turn.id, 'running', 1015)

    const op = repo.createOperation({
      id: 'op-1',
      turnId: turn.id,
      commandId: 'cmd-1',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId,
        workLabel: 'Tác phẩm 1',
        chapterId,
        chapterLabel: 'Chương 1'
      },
      now: 1020
    })
    repo.transitionOperation(op.id, 'running', { now: 1025 })

    // Work DB only has prepared checkpoint, 0 batches committed
    workFiles.withWork(workId, (workDb) => {
      prepareAgentOperation(
        workDb,
        { operationId: op.id, chapterId, side: 'target', totalUnits: 10 },
        1030
      )
    })

    // Simulate startup reconciliation
    const result = reconcileStartupOperations(workFiles.index, workFiles, 1100)
    expect(result.reconciledOperations).toHaveLength(1)
    expect(result.reconciledOperations[0]).toMatchObject({
      operationId: op.id,
      from: 'running',
      to: 'interrupted',
      batchesCommitted: 0,
      appliedUnits: 0,
      reason: 'prepared_checkpoint_no_batches'
    })

    // Check operation in library.db
    const updatedOp = repo.getOperation(op.id)
    expect(updatedOp?.state).toBe('interrupted')

    // Check checkpoint in work DB is terminal interrupted
    workFiles.withWork(workId, (workDb) => {
      const evidence = readAgentOperationEvidence(workDb, op.id)
      expect(evidence?.checkpoint.state).toBe('terminal')
      expect(evidence?.checkpoint.terminalState).toBe('interrupted')
    })

    // Check turn in library.db is transitioned to interrupted
    const updatedTurn = repo.getTurn(turn.id)
    expect(updatedTurn?.status).toBe('interrupted')
  })

  it('reconciles crash sau từng batch commit: chuyển thành partially_completed và giữ batch đã commit', () => {
    const dir = tempDir()
    const { workFiles, repo, workId, chapterId } = setupFixture(dir)

    const session = repo.createSession({ id: 's2', title: 'Phiên 2', now: 1000 })
    const turn = repo.createTurn({
      id: 't2',
      sessionId: session.id,
      instruction: 'Dịch chương 1',
      context: { workId, chapterId },
      now: 1010
    })
    repo.transitionTurn(turn.id, 'running', 1015)

    const op = repo.createOperation({
      id: 'op-2',
      turnId: turn.id,
      commandId: 'cmd-2',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId,
        workLabel: 'Tác phẩm 1',
        chapterId,
        chapterLabel: 'Chương 1'
      },
      now: 1020
    })
    repo.transitionOperation(op.id, 'running', { now: 1025 })

    // Work DB: prepare 2 units, apply 1 batch (1 unit)
    workFiles.withWork(workId, (workDb) => {
      prepareAgentOperation(
        workDb,
        { operationId: op.id, chapterId, side: 'target', totalUnits: 2 },
        1030
      )
      applyAgentTranslationBatch(
        workDb,
        {
          operationId: op.id,
          batchKey: 'batch-1',
          expectedRev: 1,
          checksum: 'chk-1',
          rows: [{ sourceId: 'seg-1', text: 'Bản dịch câu một.' }],
          by: { origin: 'ai', provider: 'fake', model: 'fake-model' }
        },
        1035,
        () => 'seg-t-auto-1'
      )
    })

    // Simulate startup reconciliation
    const result = reconcileStartupOperations(workFiles.index, workFiles, 1100)
    expect(result.reconciledOperations).toHaveLength(1)
    expect(result.reconciledOperations[0]).toMatchObject({
      operationId: op.id,
      from: 'running',
      to: 'partially_completed',
      batchesCommitted: 1,
      appliedUnits: 1,
      totalUnits: 2,
      reason: 'partial_batches_committed'
    })

    // Check operation in library.db
    const updatedOp = repo.getOperation(op.id)
    expect(updatedOp?.state).toBe('partially_completed')
    expect(updatedOp?.progress).toEqual({ completed: 1, total: 2, unit: 'segments' })

    // Check checkpoint in work DB is terminal partially_completed
    workFiles.withWork(workId, (workDb) => {
      const evidence = readAgentOperationEvidence(workDb, op.id)
      expect(evidence?.checkpoint.state).toBe('terminal')
      expect(evidence?.checkpoint.terminalState).toBe('partially_completed')
      expect(evidence?.batches).toHaveLength(1)
    })

    // Turn is transitioned to interrupted
    const updatedTurn = repo.getTurn(turn.id)
    expect(updatedTurn?.status).toBe('interrupted')
  })

  it('reconciles crash sau terminal marker và trước update library DB: áp dụng terminal state từ work DB', () => {
    const dir = tempDir()
    const { workFiles, repo, workId, chapterId } = setupFixture(dir)

    const session = repo.createSession({ id: 's3', title: 'Phiên 3', now: 1000 })
    const turn = repo.createTurn({
      id: 't3',
      sessionId: session.id,
      instruction: 'Dịch chương 1 hoàn chỉnh',
      context: { workId, chapterId },
      now: 1010
    })
    repo.transitionTurn(turn.id, 'running', 1015)

    const op = repo.createOperation({
      id: 'op-3',
      turnId: turn.id,
      commandId: 'cmd-3',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId,
        workLabel: 'Tác phẩm 1',
        chapterId,
        chapterLabel: 'Chương 1'
      },
      now: 1020
    })
    repo.transitionOperation(op.id, 'running', { now: 1025 })

    // Work DB: prepare, commit batch, commit terminal marker
    workFiles.withWork(workId, (workDb) => {
      prepareAgentOperation(
        workDb,
        { operationId: op.id, chapterId, side: 'target', totalUnits: 1 },
        1030
      )
      applyAgentTranslationBatch(
        workDb,
        {
          operationId: op.id,
          batchKey: 'batch-full',
          expectedRev: 1,
          checksum: 'chk-full',
          rows: [{ sourceId: 'seg-1', text: 'Bản dịch đầy đủ.' }],
          by: { origin: 'ai', provider: 'fake', model: 'fake-model' }
        },
        1035,
        () => 'seg-t-auto-2'
      )
      markAgentOperationTerminal(
        workDb,
        op.id,
        'completed',
        { unitsTranslated: 1, finishedCleanly: true },
        1040
      )
    })

    // Simulate crash before library DB update, now app starts up
    const result = reconcileStartupOperations(workFiles.index, workFiles, 1100)
    expect(result.reconciledOperations).toHaveLength(1)
    expect(result.reconciledOperations[0]).toMatchObject({
      operationId: op.id,
      from: 'running',
      to: 'completed',
      batchesCommitted: 1,
      appliedUnits: 1,
      totalUnits: 1,
      reason: 'work_db_already_terminal'
    })

    // Check operation in library.db
    const updatedOp = repo.getOperation(op.id)
    expect(updatedOp?.state).toBe('completed')
    expect(updatedOp?.result).toEqual({ unitsTranslated: 1, finishedCleanly: true })

    // Check turn is completed
    const updatedTurn = repo.getTurn(turn.id)
    expect(updatedTurn?.status).toBe('completed')
  })

  it('reconciles operation khi work DB không mở được: chuyển thành interrupted và giữ target nguyên vẹn', () => {
    const dir = tempDir()
    const { workFiles, repo } = setupFixture(dir)

    const nonexistentWorkId = '00000000-0000-0000-0000-999999999999'
    const session = repo.createSession({ id: 's4', title: 'Phiên 4', now: 1000 })
    const turn = repo.createTurn({
      id: 't4',
      sessionId: session.id,
      instruction: 'Thao tác với work không tồn tại',
      context: { workId: nonexistentWorkId },
      now: 1010
    })
    repo.transitionTurn(turn.id, 'running', 1015)

    const op = repo.createOperation({
      id: 'op-4',
      turnId: turn.id,
      commandId: 'cmd-4',
      capability: 'translate_chapter',
      target: {
        kind: 'chapter',
        workId: nonexistentWorkId,
        workLabel: 'Tác phẩm lỗi',
        chapterId: 'ch-missing',
        chapterLabel: 'Chương lỗi'
      },
      now: 1020
    })
    repo.transitionOperation(op.id, 'running', { now: 1025 })

    const result = reconcileStartupOperations(workFiles.index, workFiles, 1100)
    expect(result.reconciledOperations[0]).toMatchObject({
      operationId: op.id,
      from: 'running',
      to: 'interrupted',
      reason: 'work_db_unavailable'
    })

    const updatedOp = repo.getOperation(op.id)
    expect(updatedOp?.state).toBe('interrupted')
    expect(updatedOp?.target.workId).toBe(nonexistentWorkId)

    const updatedTurn = repo.getTurn(turn.id)
    expect(updatedTurn?.status).toBe('interrupted')
  })
})
