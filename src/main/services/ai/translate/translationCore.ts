import type { TokenUsage } from '../../../../shared/contracts/usage'
import type { TranslateFailure } from '../../../../shared/contracts/aiTranslate'
import type {
  TranslateUnit,
  ModelCompletionResult,
  TranslationModelCaller
} from '../../../../shared/contracts/translateCore'
import { mapToTempIds, reconcileTempItems } from '../../../../shared/algorithms/translateReconcile'
import { parseTranslationResponse } from '../../../../shared/algorithms/lenientParser'
import type { SourceLanguage } from '../../../../shared/contracts/library'
import {
  REPAIR_SYSTEM_PROMPT_V1,
  buildTranslateSystemPrompt,
  type PromptContextLayers,
  buildTranslatePayload,
  buildRepairPayload
} from './promptBuilder'
import { ProviderError } from '../../../infra/providers/types'
import { addUsage } from '../../../infra/providers/usage'

export type { ModelCompletionResult, TranslationModelCaller }

export interface TranslateCoreBatchOptions {
  caller: TranslationModelCaller
  units: TranslateUnit[]
  sourceLang?: SourceLanguage | string
  layers?: PromptContextLayers
  customConventions?: string
  signal?: AbortSignal
  now?: () => number
}

export interface TranslateCoreBatchOutcome {
  items: TranslateUnit[]
  failedIds: string[]
  usage: TokenUsage | null
  error: TranslateFailure | null
}

/**
 * Dịch một lô đơn vị qua mô hình AI:
 * - Ánh xạ ID tạm [1], [2], ...
 * - Gửi prompt chuẩn hóa
 * - Phân tích cú pháp khoan dung
 * - Đối soát ID
 * - Hỏi lại (repair) đúng các ID bị thiếu 1 lần duy nhất
 */
export async function executeTranslateBatch({
  caller,
  units,
  sourceLang,
  layers,
  customConventions,
  signal,
  now
}: TranslateCoreBatchOptions): Promise<TranslateCoreBatchOutcome> {
  let totalUsage: TokenUsage | null = null

  // 1. Ánh xạ ID tạm và tách đơn vị rỗng
  const { sendable, skippedEmpty, tempToId } = mapToTempIds(units)

  if (sendable.length === 0) {
    return {
      items: skippedEmpty,
      failedIds: [],
      usage: null,
      error: null
    }
  }

  // 2. Gửi yêu cầu chính tới mô hình
  const { prompt: systemPrompt } = buildTranslateSystemPrompt({
    sourceLang,
    layers,
    customConventions
  })

  const mainMessages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: buildTranslatePayload(sendable) }
  ]

  let mainCall: ModelCompletionResult
  try {
    mainCall = await caller.complete(mainMessages, { signal })
    totalUsage = addUsage(totalUsage, mainCall.usage)
  } catch (error) {
    if (error instanceof ProviderError) {
      const currentTime = now ? now() : Date.now()
      const recoverAt =
        error.retryAfterMs === undefined ? null : currentTime + Math.max(0, error.retryAfterMs)
      return {
        items: skippedEmpty,
        failedIds: sendable.map((u) => u.originalId),
        usage: totalUsage,
        error: { kind: error.kind, message: error.message, recoverAt }
      }
    }
    throw error
  }

  if (mainCall.finishReason === 'length') {
    return {
      items: skippedEmpty,
      failedIds: sendable.map((u) => u.originalId),
      usage: totalUsage,
      error: {
        kind: 'invalid_response',
        message: 'Phản hồi bị cắt vì hết giới hạn đầu ra.',
        recoverAt: null
      }
    }
  }

  // 3. Phân tích cú pháp và đối soát
  const parsedItems = parseTranslationResponse(mainCall.text)
  const reconciliation = reconcileTempItems(sendable, tempToId, parsedItems)

  const matched = [...reconciliation.matched]
  let missingIds = [...reconciliation.missing, ...reconciliation.empty]

  // 4. Nếu có ID thiếu và chưa bị hủy, hỏi lại đúng các ID đó 1 lần
  if (missingIds.length > 0 && !signal?.aborted) {
    const missingUnits = sendable.filter((u) => missingIds.includes(u.originalId))
    if (missingUnits.length > 0) {
      const repairMessages = [
        { role: 'system' as const, content: REPAIR_SYSTEM_PROMPT_V1 },
        { role: 'user' as const, content: buildRepairPayload(missingUnits) }
      ]

      try {
        const repairCall = await caller.complete(repairMessages, { signal })
        totalUsage = addUsage(totalUsage, repairCall.usage)

        if (repairCall.finishReason !== 'length') {
          const repairParsed = parseTranslationResponse(repairCall.text)
          const repairReconciliation = reconcileTempItems(missingUnits, tempToId, repairParsed)

          matched.push(...repairReconciliation.matched)
          const newlyMatchedIds = new Set(repairReconciliation.matched.map((m) => m.id))
          missingIds = missingIds.filter((id) => !newlyMatchedIds.has(id))
        }
      } catch {
        // Lỗi ở lượt sửa không làm mất các câu đã dịch được ở lượt chính
      }
    }
  }

  const allItems = [...skippedEmpty, ...matched]
  const error: TranslateFailure | null =
    missingIds.length > 0
      ? {
          kind: 'invalid_response',
          message: `Thiếu ${missingIds.length} đoạn sau khi đã thử lại.`,
          recoverAt: null
        }
      : null

  return {
    items: allItems,
    failedIds: missingIds,
    usage: totalUsage,
    error
  }
}
