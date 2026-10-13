import { describe, expect, it } from 'vitest'
import { segment } from '../../../shared/segmentation/segmenter'
import type { TokenUsage } from '../../../shared/contracts/usage'
import { getRunContext } from '../../infra/storage/translateRunContext'
import { setupAgent } from './agentTestKit'
import { runChapterTranslation, type ChapterTranslationRunInput } from './chapterTranslationRunner'

/** A chapter of three one-sentence paragraphs, translated one batch per paragraph. */
function threeBatches() {
  const kit = setupAgent()
  kit.services.connections.updateEntry(kit.modelSelection.entryId, {
    settings: { inputTokenLimit: 1 }
  })
  const chapter = kit.library.createChapter(kit.work1.id, 'Ba đoạn').chapter
  const text = 'Một.\n\nHai.\n\nBa.'
  kit.library.saveText(kit.work1.id, chapter.id, 'source', text, 0, segment(text, 'zh-Hans'))
  let operation = 0
  const run = (extra: Partial<ChapterTranslationRunInput> = {}) =>
    runChapterTranslation({
      library: kit.library,
      connections: kit.services.connections,
      workId: kit.work1.id,
      chapterId: chapter.id,
      operationId: 'op-' + ++operation,
      modelSelection: kit.modelSelection,
      ...extra
    })
  return { ...kit, chapter, run }
}

describe('runChapterTranslation for durable tasks', () => {
  it('builds every batch from one stored snapshot, even after the store changes mid-run', async () => {
    const { run, library, services, translations, work1, chapter } = threeBatches()
    let batches = 0
    const result = await run({
      onProgress: () => {
        // A glossary entry approved between batches must not reach the next prompt.
        if (++batches === 1) {
          services.glossary.create(work1.id, { source: 'Hai', target: 'Nhị', status: 'approved' })
        }
      }
    })
    expect(result.state).toBe('completed')
    expect(translations.prompts.some((prompt) => prompt.includes('Nhị'))).toBe(false)
    const stored = library.withWork(work1.id, (db) => getRunContext(db, 'agent:op-1'))
    expect(stored?.chapterId).toBe(chapter.id)
    expect(result.contextHash).toBe(stored?.snapshotHash)

    // A new run takes a new snapshot and sees the entry.
    library.saveText(
      work1.id,
      chapter.id,
      'target',
      '',
      library.readText(work1.id, chapter.id, 'target').rev,
      []
    )
    await run()
    expect(translations.prompts.slice(3).some((prompt) => prompt.includes('Nhị'))).toBe(true)
  })

  it('shares one call budget across batches, stops at the task gate before the request', async () => {
    const { run, translations } = threeBatches()
    let allowed = 2
    const usages: Array<TokenUsage | null> = []
    const result = await run({
      policy: 'fill_untranslated',
      gate: () => allowed-- > 0,
      onUsage: (usage) => usages.push(usage)
    })
    expect(result).toMatchObject({ state: 'stopped', stopReason: 'budget', appliedUnits: 2 })
    expect(translations.requests).toHaveLength(2)
    expect(usages.at(-1)).toMatchObject({ inputTokens: 40, complete: false })
  })

  it('keeps the usage of two batches when batch three fails', async () => {
    const { run, translations } = threeBatches()
    translations.failOn = 3
    const usages: Array<TokenUsage | null> = []
    await expect(run({ onUsage: (usage) => usages.push(usage) })).rejects.toThrow()
    expect(usages.at(-1)).toMatchObject({ inputTokens: 40, outputTokens: 30, complete: false })
  })

  it('retries only rows no run translated yet, AI rows included, and never writes them twice', async () => {
    const { run, translations, library, work1, chapter } = threeBatches()
    translations.failOn = 3
    await expect(run({ policy: 'fill_untranslated' })).rejects.toThrow()
    const afterFirst = library.readText(work1.id, chapter.id, 'target').content
    expect(afterFirst).toContain('Dịch: Một.')

    translations.failOn = undefined
    const sent = translations.requests.length
    const retry = await run({ policy: 'fill_untranslated' })
    expect(retry).toMatchObject({
      state: 'partially_completed',
      appliedUnits: 1,
      protectedCount: 2
    })
    expect(translations.requests.slice(sent)).toEqual([['Ba.']])
    expect(library.readText(work1.id, chapter.id, 'target').content).toContain('Dịch: Ba.')
  })

  it('treats a committed batch key with a different checksum as a conflict', async () => {
    const { run } = threeBatches()
    const result = await run({
      policy: 'fill_untranslated',
      batchKeyPrefix: 'item:i1:',
      priorBatch: (key) => (key.startsWith('item:i1:') ? { checksum: 'sha256:other' } : null)
    })
    expect(result.state).toBe('conflict')
    expect(result.appliedUnits).toBe(0)
  })

  it('stops at a safe point before a batch and marks the operation interrupted', async () => {
    const { run, translations, library, work1 } = threeBatches()
    let checks = 0
    const result = await run({ shouldStop: () => (++checks === 2 ? 'pause' : null) })
    expect(result).toMatchObject({ state: 'stopped', stopReason: 'pause', appliedUnits: 1 })
    expect(translations.requests).toHaveLength(1)
    expect(library.readAgentOperationEvidence(work1.id, 'op-1')?.checkpoint.terminalState).toBe(
      'interrupted'
    )
  })

  it('commits nothing once a cancel is accepted and finishes as cancelled', async () => {
    const { run, library, work1, chapter } = threeBatches()
    const controller = new AbortController()
    const result = await run({
      signal: controller.signal,
      beforeCommit: async () => controller.abort()
    })
    expect(result).toMatchObject({ state: 'cancelled', appliedUnits: 0 })
    expect(library.readText(work1.id, chapter.id, 'target').content).toBe('')
  })

  it('completes a task run with nothing left to translate', async () => {
    const { run } = threeBatches()
    await run({ policy: 'fill_untranslated' })
    expect(await run({ policy: 'fill_untranslated' })).toMatchObject({
      state: 'completed',
      appliedUnits: 0,
      protectedCount: 3
    })
  })
})
