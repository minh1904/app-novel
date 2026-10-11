import { createHash } from 'node:crypto'
import type { AgentProgress } from '../../../shared/contracts/agent'
import type { TranslationModelCaller } from '../../../shared/contracts/translateCore'
import { taskLimit } from '../../../shared/contracts/modelSettings'
import { buildRows, normalizeRowText, type Row } from '../../../shared/contracts/rows'
import { planBatches } from '../../../shared/translation/translatePlanner'
import { matchContextEntries } from '../../../shared/context/contextMatching'
import { listCharacters } from '../../infra/storage/addressingEntries'
import { StorageError } from '../../infra/storage/errors'
import type { SegmentText } from '../../infra/providers/types'
import { toWireUsage } from '../../infra/providers/usage'
import type { RowAuthor } from '../../infra/storage/sentenceRows'
import type { LibraryStore } from '../library/library'
import type { ConnectionService } from '../ai/connectionService'
import { executeTranslateBatch } from '../ai/translate/translationCore'
import { suggestRegister } from '../ai/translate/languageProfiles'
import {
  charactersMentionedIn,
  dyadsMentionedIn,
  PREVIOUS_PARAGRAPHS,
  type TranslatePromptContext
} from '../ai/translate/translatePrompt'
import { originFor } from '../ai/provenance'
import { isProtectedRow } from '../ai/chapterTranslation'
import type { TokenUsage } from '../../../shared/contracts/usage'

export interface ChapterTranslationRunInput {
  library: LibraryStore
  connections: ConnectionService
  workId: string
  chapterId: string
  operationId: string
  modelSelection: {
    connectionId: string
    entryId: string
    settingsKey?: string
  }
  onProgress?: (progress: AgentProgress) => void
  signal?: AbortSignal
  now?: () => number
}

export interface ChapterTranslationRunResult {
  state: 'completed' | 'partially_completed' | 'conflict' | 'cancelled' | 'failed'
  appliedUnits: number
  totalUnits: number
  protectedCount: number
  lastAppliedRev: number | null
  summary: string
  usage?: TokenUsage | null
}

function toSegmentText(row: Row): SegmentText {
  return { id: row.sourceId, text: row.sourceText }
}

export async function runChapterTranslation(
  input: ChapterTranslationRunInput
): Promise<ChapterTranslationRunResult> {
  const {
    library,
    connections,
    workId,
    chapterId,
    operationId,
    modelSelection,
    onProgress,
    signal
  } = input
  const now = input.now ?? Date.now

  const translator = connections.translator(modelSelection.connectionId, modelSelection.entryId)
  if (modelSelection.settingsKey && translator.settingsKey !== modelSelection.settingsKey) {
    throw new StorageError(
      'conflict',
      'Cấu hình model đã đổi so với lúc khởi tạo lượt. Vui lòng thử lại.'
    )
  }

  const work = library.get(workId)
  const source = library.readText(workId, chapterId, 'source')
  if (source.segments.length === 0) {
    throw new StorageError('validation', 'Chương này chưa có bản gốc để dịch.')
  }

  const targetInit = library.readText(workId, chapterId, 'target')
  const links = library.listLinks(workId, chapterId)
  const rows = buildRows(source, targetInit, links).rows
  const sendable = rows.filter((row) => row.sourceText.trim() !== '')

  if (sendable.length === 0) {
    throw new StorageError('validation', 'Bản gốc của chương này không có câu nào để dịch.')
  }

  const protectedRows = sendable.filter(isProtectedRow)
  const safeRowCount = sendable.length - protectedRows.length

  // Checkpoint preparation
  library.prepareAgentOperation(workId, {
    operationId,
    chapterId,
    side: 'target',
    totalUnits: sendable.length
  })

  // If all sendable rows are protected, no safe rows exist -> conflict without applying batches
  if (safeRowCount === 0) {
    library.markAgentOperationTerminal(workId, operationId, 'conflict', {
      reason: 'all_rows_protected',
      protectedCount: protectedRows.length
    })
    return {
      state: 'conflict',
      appliedUnits: 0,
      totalUnits: sendable.length,
      protectedCount: protectedRows.length,
      lastAppliedRev: null,
      summary: `Toàn bộ ${protectedRows.length} câu trong chương đã có bản dịch và được bảo vệ. Không có câu nào được ghi đè.`
    }
  }

  const planned = planBatches(sendable.map(toSegmentText), {
    maxTokens: taskLimit(translator.entry.settings.inputTokenLimit) || undefined,
    maxUnits: taskLimit(translator.entry.settings.inputTokenLimit)
      ? Number.MAX_SAFE_INTEGER
      : undefined,
    sourceLang: work.sourceLang
  })

  const releaseLease = library.acquireTargetWriteLease(
    { workId, chapterId, side: 'target' },
    operationId
  )

  let currentRev = targetInit.rev
  let appliedUnits = 0
  const rowMap = new Map(rows.map((r) => [r.sourceId, r]))
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let hasUsage = false

  try {
    for (let batchIdx = 0; batchIdx < planned.batches.length; batchIdx++) {
      if (signal?.aborted) {
        break
      }

      const batch = planned.batches[batchIdx]

      let translatedItems: SegmentText[] = []
      const batchAuthor: RowAuthor = {
        origin: originFor(translator.provider.id),
        provider: translator.provider.id,
        model: translator.entry.model
      }

      if (
        typeof (translator.provider as unknown as TranslationModelCaller).complete === 'function'
      ) {
        const prompt: TranslatePromptContext = {
          sourceLang: work.sourceLang,
          genre: work.genre,
          register: suggestRegister(work.sourceLang, work.genre)
        }
        try {
          const glossaryEntries = library.getEffectiveGlossary(workId, chapterId, {
            approvedOnly: true
          })
          const combinedSource = batch.units.map((s) => s.text).join('\n')
          prompt.glossary = matchContextEntries(combinedSource, glossaryEntries, work.sourceLang)
          const dyads = library.getEffectiveAddressing(workId, chapterId)
          const ordered = [...rows]
          const chapterSource = ordered.map((row) => row.sourceText).join('\n')
          prompt.dyads = dyadsMentionedIn(dyads, chapterSource)
          prompt.characters = charactersMentionedIn(
            library.withWork(workId, (db) => listCharacters(db, { status: 'approved' })),
            chapterSource
          )
          const first = ordered.findIndex((r) => r.sourceId === batch.units[0].id)
          prompt.previous = ordered
            .slice(Math.max(0, first - PREVIOUS_PARAGRAPHS), Math.max(0, first))
            .map((r) => r.sourceText)
        } catch {
          // Ignore context collection errors and proceed
        }

        const outcome = await executeTranslateBatch({
          caller: translator.provider as unknown as TranslationModelCaller,
          units: batch.units,
          prompt,
          now
        })
        translatedItems = outcome.items
        if (outcome.usage) {
          const wire = toWireUsage(outcome.usage)
          totalInputTokens += wire.inputTokens
          totalOutputTokens += wire.outputTokens
          hasUsage = true
        }
      } else {
        const res = await translator.provider.translate({
          sourceLang: work.sourceLang,
          targetLang: 'vi',
          segments: batch.units
        })
        translatedItems = res.items
        if (res.usage) {
          const wire = toWireUsage(res.usage)
          totalInputTokens += wire.inputTokens
          totalOutputTokens += wire.outputTokens
          hasUsage = true
        }
      }

      // Filter protected rows per D6: protected row output is dropped, NOT turned into proposal
      const safeBatchRows: Array<{ sourceId: string; text: string }> = []
      for (const item of translatedItems) {
        const row = rowMap.get(item.id)
        if (!row) continue
        if (isProtectedRow(row)) {
          // Dropped
          continue
        }
        const text = normalizeRowText(item.text)
        if (text === '') continue
        safeBatchRows.push({ sourceId: row.sourceId, text })
      }

      if (safeBatchRows.length > 0) {
        const batchKey = `batch-${batchIdx + 1}`
        const checksum =
          'sha256:' + createHash('sha256').update(JSON.stringify(safeBatchRows)).digest('hex')
        const applied = library.applyAgentTranslationBatch(workId, {
          operationId,
          batchKey,
          expectedRev: currentRev,
          checksum,
          rows: safeBatchRows,
          by: batchAuthor
        })
        currentRev = applied.afterRev
        appliedUnits += safeBatchRows.length
      }

      onProgress?.({
        completed: appliedUnits,
        total: sendable.length,
        unit: 'segments',
        message: `Đã dịch ${appliedUnits}/${sendable.length} câu (${batchIdx + 1}/${planned.batches.length} lô)`
      })
    }

    let finalState: ChapterTranslationRunResult['state'] = 'completed'
    if (signal?.aborted) {
      finalState = 'cancelled'
    } else if (protectedRows.length > 0) {
      finalState = 'partially_completed'
    }

    const terminalResult = {
      appliedUnits,
      totalUnits: sendable.length,
      protectedCount: protectedRows.length,
      cancelled: signal?.aborted ?? false
    }

    library.markAgentOperationTerminal(workId, operationId, finalState, terminalResult)

    const summary =
      finalState === 'cancelled'
        ? `Đã dừng dịch. Đã hoàn thành ${appliedUnits}/${sendable.length} câu trước khi hủy.`
        : finalState === 'partially_completed'
          ? `Đã dịch ${appliedUnits} câu mới; giữ nguyên ${protectedRows.length} câu đã có bản dịch.`
          : `Đã dịch hoàn tất ${appliedUnits}/${sendable.length} câu.`

    const usage: TokenUsage | null = hasUsage
      ? {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          source: 'provider',
          complete: true
        }
      : null

    return {
      state: finalState,
      appliedUnits,
      totalUnits: sendable.length,
      protectedCount: protectedRows.length,
      lastAppliedRev: appliedUnits > 0 ? currentRev : null,
      summary,
      usage
    }
  } finally {
    releaseLease()
  }
}
