import { createHash } from 'node:crypto'
import type {
  ParagraphBatchInput,
  ParagraphBatchResult,
  ParagraphFinalizeInput,
  ParagraphFinalizeResult,
  ParagraphPlanInput,
  ParagraphTranslationPlan
} from '../../../shared/contracts/aiTranslateProposals'
import type { TranslateFailure, TranslateUsage } from '../../../shared/contracts/aiTranslate'
import { taskLimit } from '../../../shared/contracts/modelSettings'
import { planBatches } from '../../../shared/algorithms/translatePlanner'
import { matchContextEntries } from '../../../shared/algorithms/contextMatching'
import type { TranslationModelCaller } from '../../../shared/contracts/translateCore'
import { createProposal, appendProposalParts, getProposal } from '../../infra/storage/aiProposals'
import { StorageError } from '../../infra/storage/errors'
import { CATALOG_READ_AT, lookupModel } from '../../infra/providers/modelCatalog'
import { ProviderError, type SegmentText } from '../../infra/providers/types'
import { toWireUsage } from '../../infra/providers/usage'
import type { LibraryStore } from '../library/library'
import type { ConnectionService } from './connectionService'
import { estimateCost } from './costEstimate'
import { executeTranslateBatch } from './translate/translationCore'
import { listCharacters } from '../../infra/storage/addressingEntries'
import {
  buildTranslateRequest,
  charactersMentionedIn,
  dyadsMentionedIn,
  PREVIOUS_PARAGRAPHS,
  type TranslatePromptContext
} from './translate/translatePrompt'
import { suggestRegister } from './translate/languageProfiles'
import { acceptProposalParts, textHash } from '../proposals/proposalService'

interface ParagraphUnit extends SegmentText {
  order: number
}

function paragraphId(order: number, text: string): string {
  const hex = createHash('sha256').update(`${order}\0${text}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** Each nonblank source line is one paragraph, as defined by ADR-005. */
export function paragraphUnits(content: string): ParagraphUnit[] {
  return content
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, order) => ({ id: paragraphId(order, text), text, order }))
}

function failure(error: unknown, now: number): TranslateFailure {
  if (error instanceof ProviderError)
    return {
      kind: error.kind,
      message: error.message,
      recoverAt: error.retryAfterMs === undefined ? null : now + Math.max(0, error.retryAfterMs)
    }
  throw error
}

export class ParagraphTranslator {
  constructor(
    private readonly options: {
      library: LibraryStore
      connections: ConnectionService
      now: () => number
    }
  ) {}

  plan({ workId, chapterId, connectionId, entryId }: ParagraphPlanInput): ParagraphTranslationPlan {
    const { library, connections } = this.options
    const { connection, entry, settingsKey } = connections.translator(connectionId, entryId)
    const work = library.get(workId)
    const source = library.readText(workId, chapterId, 'source')
    const target = library.readText(workId, chapterId, 'target')
    const units = paragraphUnits(source.content)
    if (units.length === 0)
      throw new StorageError('validation', 'Chương này chưa có đoạn gốc để dịch.')
    const batches = planBatches(units, {
      maxTokens: taskLimit(entry.settings.inputTokenLimit) || undefined,
      maxUnits: taskLimit(entry.settings.inputTokenLimit) ? Number.MAX_SAFE_INTEGER : undefined,
      maxUnitChars: Number.MAX_SAFE_INTEGER,
      sourceLang: work.sourceLang
    }).batches.map((batch) => ({
      sourceIds: batch.units.map((unit) => unit.id),
      sourceChars: batch.charCount
    }))
    return {
      runId: library.newAppId(),
      sourceRev: source.rev,
      targetRev: target.rev,
      targetBaseContent: target.content,
      connectionId,
      connectionName: connection.name,
      entryId,
      entryName: entry.name,
      model: entry.model,
      settingsKey,
      catalogReadAt: CATALOG_READ_AT,
      paragraphCount: units.length,
      batches,
      hasTranslation: target.content.trim() !== '',
      estimate: estimateCost({
        sourceChars: batches.reduce((sum, batch) => sum + batch.sourceChars, 0),
        sourceLang: work.sourceLang,
        batchCount: batches.length,
        model: lookupModel(entry.model, connection.providerId ?? undefined)
      })
    }
  }

  async runBatch(input: ParagraphBatchInput): Promise<ParagraphBatchResult> {
    const { library, connections, now } = this.options
    const translator = connections.translator(input.connectionId, input.entryId)
    if (translator.settingsKey !== input.settingsKey) {
      throw new StorageError('conflict', 'Cấu hình model đã đổi. Hãy lập kế hoạch lại.')
    }
    const work = library.get(input.workId)
    const source = library.readText(input.workId, input.chapterId, 'source')
    const target = library.readText(input.workId, input.chapterId, 'target')
    if (
      source.rev !== input.sourceRev ||
      target.rev !== input.targetRev ||
      target.content !== input.targetBaseContent
    ) {
      throw new StorageError('conflict', 'Bản gốc hoặc bản dịch đã đổi. Hãy lập kế hoạch lại.')
    }
    const all = paragraphUnits(source.content)
    const byId = new Map(all.map((unit) => [unit.id, unit]))
    const requested = [...new Set(input.sourceIds)].map((id) => {
      const unit = byId.get(id)
      if (!unit) throw new StorageError('conflict', 'Đoạn gốc đã đổi. Hãy lập kế hoạch lại.')
      return unit
    })
    const key = `translate:${input.runId}`
    const prior = library.withWork(input.workId, (db) => {
      const row = db.prepare('SELECT id FROM proposal WHERE run_key = ?').get<{ id: string }>(key)
      return row ? getProposal(db, row.id) : null
    })
    if (
      prior &&
      (prior.chapterId !== input.chapterId ||
        prior.sourceHash !== textHash(source.content) ||
        prior.targetBaseRev !== input.targetRev ||
        prior.targetBaseContent !== target.content ||
        prior.policy !== input.policy ||
        prior.model !== translator.entry.model)
    ) {
      throw new StorageError('conflict', 'Lượt dịch không còn khớp kế hoạch ban đầu.')
    }
    const done = new Set(prior?.parts.map((part) => part.batchKey) ?? [])
    const units = requested.filter((unit) => !done.has(`${key}:${unit.id}`))
    if (units.length === 0)
      return {
        proposalId: prior?.id ?? null,
        proposed: requested.map((unit) => unit.id),
        failed: [],
        error: null,
        usage: null,
        keyTail: null
      }

    const glossary = library.getEffectiveGlossary(input.workId, input.chapterId, {
      approvedOnly: true
    })
    const matched = matchContextEntries(
      units.map((unit) => unit.text).join('\n'),
      glossary,
      work.sourceLang
    )
    const allDyads = library.getEffectiveAddressing(input.workId, input.chapterId)
    // Gửi đúng các cặp có mặt trong chương và vài đoạn gốc liền trước lô.
    const dyads = dyadsMentionedIn(allDyads, source.content)
    const first = Math.min(...units.map((unit) => unit.order))
    const prompt: TranslatePromptContext = {
      sourceLang: work.sourceLang,
      genre: work.genre,
      glossary: matched,
      dyads,
      register: suggestRegister(work.sourceLang, work.genre),
      characters: charactersMentionedIn(
        library.withWork(input.workId, (db) => listCharacters(db, { status: 'approved' })),
        source.content
      ),
      previous: all.slice(Math.max(0, first - PREVIOUS_PARAGRAPHS), first).map((unit) => unit.text)
    }
    const context = [...matched, ...dyads]
    // Hash của request lượt chính, tính bằng cùng bộ dựng lõi dịch dùng để gửi: không thể lệch nhau.
    const planned = buildTranslateRequest(
      prompt,
      units.map((unit, index) => ({
        tempId: `[${index + 1}]`,
        originalId: unit.id,
        text: unit.text
      }))
    )
    let contextHash = planned.requestHash
    let items: SegmentText[] = []
    let usage: TranslateUsage | null = null
    let error: TranslateFailure | null = null
    try {
      if (typeof (translator.provider as TranslationModelCaller).complete === 'function') {
        const result = await executeTranslateBatch({
          caller: translator.provider as TranslationModelCaller,
          units,
          prompt,
          now
        })
        contextHash = result.request?.requestHash ?? contextHash
        items = result.items
        usage = result.usage ? toWireUsage(result.usage) : null
        error = result.error
      } else {
        const result = await translator.provider.translate({
          sourceLang: work.sourceLang,
          targetLang: 'vi',
          segments: units
        })
        items = result.items
        usage = result.usage ? toWireUsage(result.usage) : null
      }
    } catch (caught) {
      return {
        proposalId: prior?.id ?? null,
        proposed: [],
        failed: units.map((unit) => unit.id),
        error: failure(caught, now()),
        usage: null,
        keyTail: translator.lastKeyTail()
      }
    }
    const returned = new Map(items.map((item) => [item.id, item.text.trim()]))
    const good = units.filter((unit) => returned.get(unit.id))
    const proposed = good.map((unit) => unit.id)
    const failed = units.filter((unit) => !returned.get(unit.id)).map((unit) => unit.id)
    let proposalId = prior?.id ?? null
    if (good.length > 0) {
      const trace = {
        sourceIds: units.map((unit) => unit.id),
        context,
        contextHash,
        promptVersion: planned.version,
        systemHash: planned.systemHash,
        usage
      }
      const parts = good.map((unit) => ({
        id: library.newAppId(),
        baseFrom: target.content === '' ? 0 : null,
        baseTo: target.content === '' ? 0 : null,
        beforeText: '',
        afterText: returned.get(unit.id)!,
        sourceOrder: unit.order,
        sourceText: unit.text,
        batchKey: `${key}:${unit.id}`,
        status: target.content === '' ? ('pending' as const) : ('needs-placement' as const)
      }))
      library.withWork(input.workId, (db) =>
        db.transaction(() => {
          const existing = db
            .prepare('SELECT id FROM proposal WHERE run_key = ?')
            .get<{ id: string }>(key)
          proposalId = existing?.id ?? proposalId
          if (proposalId === null) {
            proposalId = library.newAppId()
            createProposal(db, {
              id: proposalId,
              chapterId: input.chapterId,
              origin: 'translate',
              policy: input.policy,
              sourceRev: source.rev,
              sourceHash: textHash(source.content),
              targetBaseRev: target.rev,
              targetBaseContent: target.content,
              context: [trace],
              contextHash: textHash(JSON.stringify([contextHash])),
              provider: translator.provider.id,
              model: translator.entry.model,
              usage,
              runKey: key,
              now: now(),
              parts
            })
          } else {
            const saved = getProposal(db, proposalId)
            if (
              saved.chapterId !== input.chapterId ||
              saved.sourceHash !== textHash(source.content) ||
              saved.targetBaseRev !== input.targetRev ||
              saved.targetBaseContent !== target.content ||
              saved.policy !== input.policy ||
              saved.model !== translator.entry.model
            ) {
              throw new StorageError('conflict', 'Lượt dịch không còn khớp kế hoạch ban đầu.')
            }
            const fresh = parts.filter(
              (part) => !saved.parts.some((old) => old.batchKey === part.batchKey)
            )
            if (fresh.length > 0) {
              appendProposalParts(db, proposalId, fresh, now())
              const traces = [...saved.context, trace]
              const oldUsage = saved.usage as TranslateUsage | null
              const totalUsage = usage
                ? {
                    inputTokens: (oldUsage?.inputTokens ?? 0) + usage.inputTokens,
                    outputTokens: (oldUsage?.outputTokens ?? 0) + usage.outputTokens
                  }
                : oldUsage
              db.prepare(
                `UPDATE proposal SET context_json = ?, context_hash = ?, usage_json = ?,
              updated_at = ? WHERE id = ?`
              ).run(
                JSON.stringify(traces),
                textHash(JSON.stringify(traces.map((item) => (item as typeof trace).contextHash))),
                totalUsage ? JSON.stringify(totalUsage) : null,
                now(),
                proposalId
              )
            }
          }
        })
      )
    }
    return {
      proposalId,
      proposed,
      failed,
      error:
        error ??
        (failed.length
          ? {
              kind: 'invalid_response',
              message: `Thiếu bản dịch cho ${failed.length} đoạn.`,
              recoverAt: null
            }
          : null),
      usage,
      keyTail: translator.lastKeyTail()
    }
  }

  finalize(input: ParagraphFinalizeInput): ParagraphFinalizeResult {
    const { library } = this.options
    return library.withWork(input.workId, (db) => {
      const key = `translate:${input.runId}`
      const row = db.prepare('SELECT id FROM proposal WHERE run_key = ?').get<{ id: string }>(key)
      const target = library.readText(input.workId, input.chapterId, 'target')
      if (!row)
        return {
          proposed: 0,
          applied: 0,
          needsReview: 0,
          targetRev: target.rev,
          targetContent: target.content
        }
      const proposal = getProposal(db, row.id)
      if (proposal.chapterId !== input.chapterId || proposal.policy !== input.policy) {
        throw new StorageError('validation', 'Lượt dịch không thuộc chương hoặc chính sách này.')
      }
      const ids = proposal.parts.filter((part) => part.status === 'pending').map((part) => part.id)
      if (input.policy === 'auto' && ids.length > 0) {
        acceptProposalParts(db, {
          chapterId: input.chapterId,
          partIds: ids,
          commandId: input.runId,
          actor: 'auto',
          now: this.options.now(),
          newId: () => library.newAppId()
        })
      }
      const final = getProposal(db, proposal.id)
      const latest = library.readText(input.workId, input.chapterId, 'target')
      return {
        proposed: final.parts.length,
        applied: final.parts.filter((part) => part.status === 'applied').length,
        needsReview: final.parts.filter(
          (part) => part.status !== 'applied' && part.status !== 'rejected'
        ).length,
        targetRev: latest.rev,
        targetContent: latest.content
      }
    })
  }
}
