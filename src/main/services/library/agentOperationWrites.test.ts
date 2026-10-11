import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { segment } from '../../../shared/segmentation/segmenter'
import { LibraryStore } from './library'
import { createTempDirs } from '../../testing/testing'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function setup() {
  const library = LibraryStore.open({
    dataDir: tempDir(),
    now: () => 100,
    newContentId: randomUUID
  })
  stores.push(library)
  const work = library.create({ title: 'Tác phẩm', sourceLang: 'en' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const source = 'One. Two.'
  const saved = library.saveText(work.id, chapter.id, 'source', source, 0, segment(source, 'en'))
  return {
    library,
    workId: work.id,
    chapterId: chapter.id,
    sourceIds: saved.segments.map((item) => item.id)
  }
}

const throwsCode = (fn: () => unknown, code: string): void => {
  try {
    fn()
    throw new Error('expected function to throw')
  } catch (error) {
    expect(error).toMatchObject({ code })
  }
}

describe('agent operation writes', () => {
  it('prepares one idempotent checkpoint without claiming any revision was applied', () => {
    const { library, workId, chapterId } = setup()
    const input = {
      operationId: 'operation-1',
      chapterId,
      side: 'target' as const,
      totalUnits: 2
    }

    const first = library.prepareAgentOperation(workId, input)
    const retry = library.prepareAgentOperation(workId, input)

    expect(retry).toEqual(first)
    expect(first).toMatchObject({
      operationId: 'operation-1',
      state: 'prepared',
      beforeRev: 0,
      beforeContent: '',
      lastAppliedRev: null,
      appliedUnits: 0,
      terminalState: null
    })
    expect(library.readAgentOperationEvidence(workId, 'operation-1')?.batches).toEqual([])
    throwsCode(
      () => library.prepareAgentOperation(workId, { ...input, chapterId: randomUUID() }),
      'validation'
    )
  })

  it('atomically applies a translation batch with its journal and checkpoint, then deduplicates retry', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-1',
      chapterId,
      side: 'target',
      totalUnits: 2
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-1'
    )
    const input = {
      operationId: 'operation-1',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [
        { sourceId: sourceIds[0], text: 'Một.' },
        { sourceId: sourceIds[1], text: 'Hai.' }
      ],
      by: { origin: 'ai' as const, provider: 'fake', model: 'test' }
    }

    const first = library.applyAgentTranslationBatch(workId, input)
    const retry = library.applyAgentTranslationBatch(workId, input)

    expect(retry).toEqual(first)
    expect(first).toMatchObject({ afterRev: 2, appliedUnits: 2, checksum: 'sha256:batch-1' })
    expect(library.readText(workId, chapterId, 'target').content).toBe('Một. Hai.')
    expect(library.readAgentOperationEvidence(workId, 'operation-1')).toMatchObject({
      checkpoint: { state: 'applied', lastAppliedRev: 2, appliedUnits: 2 },
      batches: [{ batchKey: 'batch-1', expectedRev: 0, afterRev: 2, appliedUnits: 2 }]
    })
    throwsCode(
      () => library.applyAgentTranslationBatch(workId, { ...input, checksum: 'different' }),
      'validation'
    )
    release()
  })

  it('rolls back every row and checkpoint update when journal insertion faults', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-1',
      chapterId,
      side: 'target',
      totalUnits: 2
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-1'
    )
    library.withWork(workId, (db) =>
      db.exec(`CREATE TRIGGER fault_agent_batch BEFORE INSERT ON agent_operation_batch
        WHEN NEW.batch_key = 'fault' BEGIN SELECT RAISE(ABORT, 'injected journal fault'); END`)
    )

    expect(() =>
      library.applyAgentTranslationBatch(workId, {
        operationId: 'operation-1',
        batchKey: 'fault',
        expectedRev: 0,
        checksum: 'sha256:fault',
        rows: [
          { sourceId: sourceIds[0], text: 'Một.' },
          { sourceId: sourceIds[1], text: 'Hai.' }
        ],
        by: { origin: 'ai', provider: 'fake', model: 'test' }
      })
    ).toThrow('injected journal fault')
    release()

    expect(library.readText(workId, chapterId, 'target')).toMatchObject({ content: '', rev: 0 })
    expect(library.readAgentOperationEvidence(workId, 'operation-1')).toMatchObject({
      checkpoint: { state: 'prepared', lastAppliedRev: null, appliedUnits: 0 },
      batches: []
    })
  })

  it('requires the target lease for agent writes and blocks editor saves only on that target', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-1',
      chapterId,
      side: 'target',
      totalUnits: 1
    })
    const batch = {
      operationId: 'operation-1',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [{ sourceId: sourceIds[0], text: 'Một.' }],
      by: { origin: 'ai' as const, provider: 'fake', model: 'test' }
    }

    throwsCode(() => library.applyAgentTranslationBatch(workId, batch), 'conflict')
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-1'
    )
    throwsCode(() => library.saveText(workId, chapterId, 'target', 'Editor', 0, []), 'conflict')
    throwsCode(
      () =>
        library.saveRow(workId, {
          chapterId,
          sourceId: sourceIds[0],
          text: 'Editor',
          expectedRev: 0
        }),
      'conflict'
    )
    expect(() =>
      library.acquireTargetWriteLease({ workId, chapterId, side: 'target' }, 'operation-2')
    ).toThrow()

    library.applyAgentTranslationBatch(workId, batch)
    expect(() =>
      library.saveText(workId, chapterId, 'source', 'Changed.', 1, segment('Changed.', 'en'))
    ).not.toThrow()
    release()
    expect(() => library.saveText(workId, chapterId, 'target', 'Editor', 1, [])).not.toThrow()
  })

  it('persists terminal evidence that a reconciler can distinguish from prepared-only evidence', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-1',
      chapterId,
      side: 'target',
      totalUnits: 1
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-1'
    )
    library.applyAgentTranslationBatch(workId, {
      operationId: 'operation-1',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [{ sourceId: sourceIds[0], text: 'Một.' }],
      by: { origin: 'ai', provider: 'fake', model: 'test' }
    })
    library.markAgentOperationTerminal(workId, 'operation-1', 'completed', { translated: 1 })
    release()

    expect(library.readAgentOperationEvidence(workId, 'operation-1')).toMatchObject({
      checkpoint: {
        state: 'terminal',
        terminalState: 'completed',
        terminalResult: { translated: 1 },
        lastAppliedRev: 1
      },
      batches: [{ batchKey: 'batch-1' }]
    })
  })

  it('undoes an operation cleanly when revision matches lastAppliedRev, and is idempotent on retry', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-undo-1',
      chapterId,
      side: 'target',
      totalUnits: 1
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-undo-1'
    )
    library.applyAgentTranslationBatch(workId, {
      operationId: 'operation-undo-1',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [{ sourceId: sourceIds[0], text: 'Một.' }],
      by: { origin: 'ai', provider: 'fake', model: 'test' }
    })
    library.markAgentOperationTerminal(workId, 'operation-undo-1', 'completed', { translated: 1 })
    release()

    expect(library.readText(workId, chapterId, 'target').content).toBe('Một.')
    expect(library.readText(workId, chapterId, 'target').rev).toBe(1)

    // Undo operation
    const undoRes = library.undoAgentOperation(workId, 'operation-undo-1')
    expect(undoRes.checkpoint.state).toBe('undone')
    expect(undoRes.checkpoint.terminalState).toBe('undone')
    expect(library.readText(workId, chapterId, 'target').content).toBe('')
    expect(library.readText(workId, chapterId, 'target').rev).toBe(2)

    // Retry undo is idempotent
    const retryRes = library.undoAgentOperation(workId, 'operation-undo-1')
    expect(retryRes.checkpoint.state).toBe('undone')
    expect(library.readText(workId, chapterId, 'target').rev).toBe(2)
  })

  it('rejects undo with conflict when target has been modified after operation', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-undo-conflict',
      chapterId,
      side: 'target',
      totalUnits: 1
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-undo-conflict'
    )
    library.applyAgentTranslationBatch(workId, {
      operationId: 'operation-undo-conflict',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [{ sourceId: sourceIds[0], text: 'Một.' }],
      by: { origin: 'ai', provider: 'fake', model: 'test' }
    })
    library.markAgentOperationTerminal(workId, 'operation-undo-conflict', 'completed', {
      translated: 1
    })
    release()

    // Subsequent user edit
    library.saveText(workId, chapterId, 'target', 'Người dùng sửa thêm.', 1, [])
    expect(library.readText(workId, chapterId, 'target').rev).toBe(2)

    // Undo should be rejected with conflict
    throwsCode(() => library.undoAgentOperation(workId, 'operation-undo-conflict'), 'conflict')
    expect(library.readText(workId, chapterId, 'target').content).toBe('Người dùng sửa thêm.')
  })

  it('undoes an operation that was cancelled in the middle of execution', () => {
    const { library, workId, chapterId, sourceIds } = setup()
    library.prepareAgentOperation(workId, {
      operationId: 'operation-undo-cancelled',
      chapterId,
      side: 'target',
      totalUnits: 2
    })
    const release = library.acquireTargetWriteLease(
      { workId, chapterId, side: 'target' },
      'operation-undo-cancelled'
    )
    library.applyAgentTranslationBatch(workId, {
      operationId: 'operation-undo-cancelled',
      batchKey: 'batch-1',
      expectedRev: 0,
      checksum: 'sha256:batch-1',
      rows: [{ sourceId: sourceIds[0], text: 'Một.' }],
      by: { origin: 'ai', provider: 'fake', model: 'test' }
    })
    // Cancelled after batch 1
    library.markAgentOperationTerminal(workId, 'operation-undo-cancelled', 'cancelled', {
      cancelled: true
    })
    release()

    expect(library.readText(workId, chapterId, 'target').content).toBe('Một.')

    // Undo restores to beforeContent
    const res = library.undoAgentOperation(workId, 'operation-undo-cancelled')
    expect(res.checkpoint.state).toBe('undone')
    expect(library.readText(workId, chapterId, 'target').content).toBe('')
  })
})
