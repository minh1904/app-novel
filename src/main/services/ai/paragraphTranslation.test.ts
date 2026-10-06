import { afterEach, describe, expect, it } from 'vitest'
import { segment } from '../../../shared/algorithms/segmenter'
import { getProposal } from '../../infra/storage/aiProposals'
import { SecretStore, type SecretCrypto } from '../../infra/storage/secretStore'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { GlossaryService } from '../context/glossaryService'
import { acceptProposalParts, textHash } from '../proposals/proposalService'
import { ConnectionService } from './connectionService'
import { ParagraphTranslator, paragraphUnits } from './paragraphTranslation'
import { TRANSLATE_PROMPT_VERSION } from './translate/translatePrompt'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => { for (const store of stores.splice(0)) store.close() })

const crypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(value) { return Buffer.from(value) },
  async decrypt(value) { return { value: Buffer.from(value).toString('utf8'), shouldReEncrypt: false } }
}

function setup(sourceText = 'First paragraph.\n\nSecond paragraph.', targetText = '',
  beforeReply?: () => void): {
  library: LibraryStore
  translator: ParagraphTranslator
  workId: string
  chapterId: string
  connectionId: string
  entryId: string
  calls: string[][]
  messages: Array<Array<{ content: string }>>
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const calls: string[][] = []
  const messages: Array<Array<{ content: string }>> = []
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> }
    messages.push(body.messages)
    const user = body.messages[1].content
    const units = JSON.parse(/<source>\n([\s\S]*?)\n<\/source>/.exec(user)?.[1] ?? user) as
      Array<{ id: string; src: string }>
    calls.push(units.map((unit) => unit.src))
    beforeReply?.()
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(units.map((unit) => ({
        id: unit.id, dst: 'VI:' + unit.src
      }))) } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 }
    }), { status: 200 })
  }) as typeof fetch
  const connections = new ConnectionService({
    db: library.appDb, secrets: new SecretStore(crypto),
    now: () => 1000, newId: () => library.newAppId(), fetchImpl
  })
  const translator = new ParagraphTranslator({ library, connections, now: () => 1000 })
  const work = library.create({ title: 'A', sourceLang: 'en' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  library.saveText(work.id, chapter.id, 'source', sourceText, 0, segment(sourceText, 'en'))
  if (targetText) library.saveText(work.id, chapter.id, 'target', targetText, 0, segment(targetText, 'vi'))
  const connection = connections.create({ name: 'Mock', baseUrl: 'http://127.0.0.1:8317/v1', providerId: 'google' })
  const entryId = connections.addModels(connection.id, [{ model: 'gemini-flash-latest' }]).models[0].id
  return { library, translator, workId: work.id, chapterId: chapter.id,
    connectionId: connection.id, entryId, calls, messages }
}

describe('paragraph translation proposals', () => {
  it('keeps paragraph order and ignores blank blocks', () => {
    expect(paragraphUnits('\n First line\nsecond line \n\n \nThird\n'))
      .toMatchObject([{ order: 0, text: 'First line' },
        { order: 1, text: 'second line' }, { order: 2, text: 'Third' }])
  })

  it('stores review parts without changing the target, and retries a batch without duplicates', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    const input = { workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review' as const,
      sourceIds: plan.batches.flatMap((batch) => batch.sourceIds) }
    const first = await h.translator.runBatch(input)
    const retry = await h.translator.runBatch(input)
    expect(first.proposed).toHaveLength(2)
    expect(retry.proposed).toEqual(first.proposed)
    expect(h.calls).toHaveLength(1)
    expect(h.library.readText(h.workId, h.chapterId, 'target').content).toBe('')
    const proposal = h.library.withWork(h.workId, (db) => getProposal(db, first.proposalId!))
    expect(proposal.parts).toHaveLength(2)
    expect(proposal.parts.map((part) => part.sourceOrder)).toEqual([0, 1])
    expect(h.translator.finalize({ workId: h.workId, chapterId: h.chapterId,
      runId: plan.runId, policy: 'review' }).needsReview).toBe(2)
    h.library.withWork(h.workId, (db) => acceptProposalParts(db, {
      chapterId: h.chapterId, partIds: proposal.parts.map((part) => part.id),
      commandId: h.library.newAppId(), actor: 'user', now: 1000,
      newId: () => h.library.newAppId()
    }))
    expect(h.library.readText(h.workId, h.chapterId, 'target').content)
      .toBe('VI:First paragraph.\n\nVI:Second paragraph.')
  })

  it('accepts individual parts of one blank-target run in either order', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    const batch = await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review',
      sourceIds: plan.batches.flatMap((item) => item.sourceIds)
    })
    const proposal = h.library.withWork(h.workId, (db) => getProposal(db, batch.proposalId!))
    const apply = (partId: string): void => {
      h.library.withWork(h.workId, (db) => acceptProposalParts(db, {
        chapterId: h.chapterId, partIds: [partId], commandId: h.library.newAppId(),
        actor: 'user', now: 1000, newId: () => h.library.newAppId()
      }))
    }
    apply(proposal.parts[1].id)
    expect(h.library.readText(h.workId, h.chapterId, 'target').content).toBe('VI:Second paragraph.')
    apply(proposal.parts[0].id)
    expect(h.library.readText(h.workId, h.chapterId, 'target').content)
      .toBe('VI:First paragraph.\n\nVI:Second paragraph.')
  })

  it('auto accepts only a complete run on an unchanged blank target', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    for (const batch of plan.batches) await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'auto', sourceIds: batch.sourceIds
    })
    const final = h.translator.finalize({ workId: h.workId, chapterId: h.chapterId,
      runId: plan.runId, policy: 'auto' })
    expect(final).toMatchObject({ proposed: 2, applied: 2, needsReview: 0 })
    expect(final.targetContent).toBe('VI:First paragraph.\n\nVI:Second paragraph.')
  })

  it('keeps the first finished part when later batches are not sent, then resumes without duplication', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    const input = { workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review' as const }
    const first = await h.translator.runBatch({ ...input, sourceIds: [plan.batches[0].sourceIds[0]] })
    expect(h.library.withWork(h.workId, (db) => getProposal(db, first.proposalId!)).parts).toHaveLength(1)
    expect(h.library.readText(h.workId, h.chapterId, 'target').content).toBe('')
    await h.translator.runBatch({ ...input, sourceIds: plan.batches.flatMap((batch) => batch.sourceIds) })
    expect(h.library.withWork(h.workId, (db) => getProposal(db, first.proposalId!)).parts).toHaveLength(2)
    expect(h.calls).toHaveLength(2)
    expect(h.calls[1]).toEqual(['Second paragraph.'])
  })

  it('refuses a stale source or target before sending a batch', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    h.library.saveText(h.workId, h.chapterId, 'target', 'new text', plan.targetRev,
      segment('new text', 'vi'))
    await expect(h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'auto', sourceIds: plan.batches[0].sourceIds
    })).rejects.toMatchObject({ code: 'conflict' })
    expect(h.calls).toHaveLength(0)
  })

  it('persists the answer against its original base when target changes during the provider call', async () => {
    let changeTarget = (): void => {}
    const h = setup('First paragraph.', '', () => changeTarget())
    const plan = h.translator.plan(h)
    changeTarget = () => {
      h.library.saveText(h.workId, h.chapterId, 'target', 'human edit', plan.targetRev,
        segment('human edit', 'vi'))
    }
    const batch = await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'auto', sourceIds: plan.batches[0].sourceIds
    })
    expect(batch.proposed).toHaveLength(1)
    expect(h.library.withWork(h.workId, (db) => getProposal(db, batch.proposalId!)).targetBaseContent).toBe('')
    expect(h.translator.finalize({ workId: h.workId, chapterId: h.chapterId,
      runId: plan.runId, policy: 'auto' })).toMatchObject({ applied: 0, needsReview: 1 })
    expect(h.library.readText(h.workId, h.chapterId, 'target').content).toBe('human edit')
  })

  it('keeps a translation for placement when target already has text', async () => {
    const h = setup('First paragraph.', 'Human text')
    const plan = h.translator.plan(h)
    const batch = await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'auto', sourceIds: plan.batches[0].sourceIds
    })
    expect(batch.proposed).toHaveLength(1)
    expect(h.translator.finalize({ workId: h.workId, chapterId: h.chapterId,
      runId: plan.runId, policy: 'auto' })).toMatchObject({ applied: 0, needsReview: 1 })
    expect(h.library.readText(h.workId, h.chapterId, 'target').content).toBe('Human text')
  })

  it('records only approved context and hashes the payload actually sent', async () => {
    const h = setup()
    const glossary = new GlossaryService(h.library, () => 1000)
    const approved = glossary.create(h.workId, { source: 'First', target: 'Đầu', status: 'approved' })
    const pending = glossary.create(h.workId, { source: 'Second', target: 'Không gửi', status: 'pending' })
    const plan = h.translator.plan(h)
    const batch = await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review',
      sourceIds: plan.batches.flatMap((item) => item.sourceIds)
    })
    const payload = h.messages[0]
    expect(payload[1].content).toContain('Đầu')
    expect(payload[1].content).not.toContain('Không gửi')
    const proposal = h.library.withWork(h.workId, (db) => getProposal(db, batch.proposalId!))
    const trace = proposal.context[0] as { context: unknown[]; contextHash: string; usage: unknown }
    expect(JSON.stringify(trace.context)).toContain(approved.id)
    expect(JSON.stringify(trace.context)).not.toContain(pending.id)
    expect(trace.contextHash).toBe(textHash(JSON.stringify([payload[0].content, payload[1].content])))
    expect(proposal.contextHash).toBe(textHash(JSON.stringify([trace.contextHash])))
    expect(proposal.usage).toMatchObject({ inputTokens: 10, outputTokens: 5 })
  })

  it('sends the paragraphs before the batch and records the prompt version it used', async () => {
    const h = setup('One.\nTwo.\nThree.\nFour.\nFive.', '')
    const plan = h.translator.plan(h)
    const ids = plan.batches.flatMap((item) => item.sourceIds)
    const batch = await h.translator.runBatch({
      workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review', sourceIds: ids.slice(4)
    })
    const [system, user] = h.messages[0]
    expect(system.content).toContain('<output>')
    expect(user.content).toContain('<previous>\nTwo.\nThree.\nFour.\n</previous>')
    expect(h.calls[0]).toEqual(['Five.'])
    const proposal = h.library.withWork(h.workId, (db) => getProposal(db, batch.proposalId!))
    const trace = proposal.context[0] as { contextHash: string; promptVersion: string }
    expect(trace.promptVersion).toBe(TRANSLATE_PROMPT_VERSION)
    expect(trace.contextHash).toBe(textHash(JSON.stringify([system.content, user.content])))
  })

  it('accumulates metadata for each completed batch in the same proposal', async () => {
    const h = setup()
    const plan = h.translator.plan(h)
    const input = { workId: h.workId, chapterId: h.chapterId, runId: plan.runId,
      connectionId: h.connectionId, entryId: h.entryId, settingsKey: plan.settingsKey,
      sourceRev: plan.sourceRev, targetRev: plan.targetRev,
      targetBaseContent: plan.targetBaseContent, policy: 'review' as const }
    const ids = plan.batches.flatMap((batch) => batch.sourceIds)
    const first = await h.translator.runBatch({ ...input, sourceIds: [ids[0]] })
    await h.translator.runBatch({ ...input, sourceIds: [ids[1]] })
    const proposal = h.library.withWork(h.workId, (db) => getProposal(db, first.proposalId!))
    expect(proposal.context).toHaveLength(2)
    expect(proposal.usage).toMatchObject({ inputTokens: 20, outputTokens: 10 })
    await h.translator.runBatch({ ...input, sourceIds: [ids[1]] })
    expect(h.library.withWork(h.workId, (db) => getProposal(db, first.proposalId!)).usage)
      .toMatchObject({ inputTokens: 20, outputTokens: 10 })
  })
})
