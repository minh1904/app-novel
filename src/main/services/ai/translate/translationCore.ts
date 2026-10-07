import type { TokenUsage } from '../../../../shared/contracts/usage'
import type { SegmentRefusal, TranslateFailure } from '../../../../shared/contracts/aiTranslate'
import type {
  TempMappedUnit,
  TranslateUnit,
  ModelCompletionResult,
  TranslationModelCaller
} from '../../../../shared/contracts/translateCore'
import { mapToTempIds, reconcileTempItems } from '../../../../shared/algorithms/translateReconcile'
import { parseTranslationResponse } from '../../../../shared/algorithms/lenientParser'
import {
  buildRepairRequest,
  buildTranslateRequest,
  type TranslatePromptContext
} from './translatePrompt'
import { ProviderError } from '../../../infra/providers/types'
import { addUsage } from '../../../infra/providers/usage'
import { describeRefusals } from '../../../../shared/algorithms/refusalMessage'
import { describeProviderError } from '../errorPolicy'

export type { ModelCompletionResult, TranslationModelCaller }

/** Lỗi của một lô theo lời lõi dịch. Việc lỗi có dừng cả lượt hay không do bên gọi quyết theo chính sách. */
export type CoreFailure = Omit<TranslateFailure, 'haltsRun'>

export interface TranslateCoreBatchOptions {
  caller: TranslationModelCaller
  units: TranslateUnit[]
  /** Ngữ cảnh và thế hệ prompt; lượt hỏi lại dùng lại đúng ngữ cảnh này. */
  prompt?: TranslatePromptContext
  signal?: AbortSignal
  now?: () => number
}

export interface TranslateCoreBatchOutcome {
  items: TranslateUnit[]
  failedIds: string[]
  /**
   * Đơn vị nhà cung cấp từ chối dịch (bộ lọc nội dung), đã khoanh tới từng đoạn. Nằm cả trong
   * `failedIds`; tách riêng để báo người dịch rằng thử lại cũng vô ích, cần dịch tay hoặc model khác.
   */
  refusedIds: string[]
  /** Lý do chặn của từng đoạn trong `refusedIds`, cùng thứ tự. */
  refusals: SegmentRefusal[]
  /**
   * Đoạn bộ lọc chặn khi gửi kèm ngữ cảnh tác phẩm nhưng qua được khi gửi lại không kèm glossary,
   * nhân vật và cặp xưng hô. Đã có bản dịch, nhưng tên và xưng hô chưa được đối chiếu, cần soát lại.
   */
  withoutContextIds: string[]
  usage: TokenUsage | null
  error: CoreFailure | null
  /** Request lượt chính đã gửi; `null` khi lô không có gì để gửi. */
  request: { version: string; systemHash: string; requestHash: string } | null
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
  prompt = {},
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
      refusedIds: [],
      refusals: [],
      withoutContextIds: [],
      usage: null,
      error: null,
      request: null
    }
  }

  // 2. Gửi yêu cầu chính tới mô hình
  const main = buildTranslateRequest(prompt, sendable)
  const request = {
    version: main.version,
    systemHash: main.systemHash,
    requestHash: main.requestHash
  }

  let mainCall: ModelCompletionResult
  try {
    mainCall = await caller.complete(main.messages, { signal })
    totalUsage = addUsage(totalUsage, mainCall.usage)
  } catch (error) {
    if (error instanceof ProviderError) {
      const currentTime = now ? now() : Date.now()
      const recoverAt =
        error.retryAfterMs === undefined ? null : currentTime + Math.max(0, error.retryAfterMs)
      return {
        items: skippedEmpty,
        failedIds: sendable.map((u) => u.originalId),
        refusedIds: [],
        refusals: [],
        withoutContextIds: [],
        usage: totalUsage,
        error: { kind: error.kind, message: describeProviderError(error), recoverAt },
        request
      }
    }
    throw error
  }

  if (mainCall.finishReason === 'length') {
    return {
      items: skippedEmpty,
      failedIds: sendable.map((u) => u.originalId),
      refusedIds: [],
      refusals: [],
      withoutContextIds: [],
      usage: totalUsage,
      error: {
        kind: 'invalid_response',
        message: 'Phản hồi bị cắt vì hết giới hạn đầu ra.',
        recoverAt: null
      },
      request
    }
  }

  // 3. Phân tích cú pháp và đối soát. Lô bị bộ lọc nội dung chặn thì chia đôi để cứu các đoạn vô can.
  const matched: TranslateUnit[] = []
  let missingIds: string[] = []
  let refusals: SegmentRefusal[] = []
  let withoutContextIds: string[] = []
  if (mainCall.finishReason === 'filter') {
    const split = await splitFiltered(
      sendable,
      prompt,
      caller,
      tempToId,
      signal,
      false,
      mainCall.filter
    )
    totalUsage = addUsage(totalUsage, split.usage)
    matched.push(...split.matched)
    missingIds = split.missing
    refusals = split.refused

    // Đoạn vẫn bị chặn: thử thêm một vòng không kèm glossary, nhân vật và cặp xưng hô. Lý do giữ lại là
    // của lần chặn cuối cùng; đoạn qua được ở vòng này thì không còn lý do nào.
    const bare = withoutWorkContext(prompt)
    if (refusals.length > 0 && bare && !signal?.aborted) {
      const blocked = new Set(refusals.map((refusal) => refusal.id))
      const refusedUnits = sendable.filter((u) => blocked.has(u.originalId))
      const retry = await splitFiltered(refusedUnits, bare, caller, tempToId, signal, true)
      totalUsage = addUsage(totalUsage, retry.usage)
      matched.push(...retry.matched)
      withoutContextIds = retry.matched.map((item) => item.id)
      missingIds.push(...retry.missing)
      refusals = retry.refused
    }
  } else {
    const reconciliation = reconcileTempItems(
      sendable,
      tempToId,
      parseTranslationResponse(mainCall.text)
    )
    matched.push(...reconciliation.matched)
    missingIds = [...reconciliation.missing, ...reconciliation.empty]
  }

  // 4. Nếu có ID thiếu và chưa bị hủy, hỏi lại đúng các ID đó 1 lần
  if (missingIds.length > 0 && !signal?.aborted) {
    const missingUnits = sendable.filter((u) => missingIds.includes(u.originalId))
    if (missingUnits.length > 0) {
      const repair = buildRepairRequest(prompt, missingUnits)

      try {
        const repairCall = await caller.complete(repair.messages, { signal })
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
  const refusedIds = refusals.map((refusal) => refusal.id)
  const error: CoreFailure | null =
    refusals.length > 0
      ? {
          kind: 'refused',
          message:
            describeRefusals(refusals.map((refusal) => refusal.group)) +
            (missingIds.length > 0
              ? ` Thiếu thêm ${missingIds.length} đoạn sau khi đã thử lại.`
              : ''),
          recoverAt: null
        }
      : missingIds.length > 0
        ? {
            kind: 'invalid_response',
            message: `Thiếu ${missingIds.length} đoạn sau khi đã thử lại.`,
            recoverAt: null
          }
        : null

  return {
    items: allItems,
    failedIds: [...missingIds, ...refusedIds],
    refusedIds,
    refusals,
    withoutContextIds,
    usage: totalUsage,
    error,
    request
  }
}

/**
 * Ngữ cảnh gửi lại cho đoạn bị chặn: bỏ glossary, nhân vật và cặp xưng hô, giữ nguyên bản gốc, đoạn
 * liền trước và mọi chỉ dẫn. `null` khi prompt vốn không có các khối đó, gửi lại cũng như cũ.
 */
function withoutWorkContext(prompt: TranslatePromptContext): TranslatePromptContext | null {
  const has = (list?: unknown[]): boolean => (list?.length ?? 0) > 0
  if (!has(prompt.glossary) && !has(prompt.characters) && !has(prompt.dyads)) return null
  return { ...prompt, glossary: [], characters: [], dyads: [] }
}

/** Số lời gọi tối đa để khoanh các đoạn bị bộ lọc chặn trong một lô: đủ cho lô 30 đoạn có vài đoạn xấu. */
export const MAX_FILTER_SPLIT_CALLS = 16

/**
 * Lô bị bộ lọc nội dung của nhà cung cấp chặn: chia đôi và gửi lại từng nửa, cho tới khi khoanh được
 * đúng các đoạn vẫn bị chặn khi đứng một mình. Thường chỉ vài câu kích hoạt bộ lọc, mà không chia thì
 * cả lô mất. Không đổi nội dung hay chỉ dẫn gửi đi: đoạn bộ lọc vẫn chặn thì để trống và báo
 * `refused`. Nửa trả về bình thường mà thiếu id thì để lượt hỏi lại xử lý như mọi lô.
 * `untried`: `units` chưa gửi với `prompt` này, gửi cả nhóm trước rồi mới chia.
 */
async function splitFiltered(
  units: TempMappedUnit[],
  prompt: TranslatePromptContext,
  caller: TranslationModelCaller,
  tempToId: Map<string, string>,
  signal?: AbortSignal,
  untried = false,
  firstReason?: ModelCompletionResult['filter']
): Promise<{
  matched: TranslateUnit[]
  missing: string[]
  refused: SegmentRefusal[]
  usage: TokenUsage | null
}> {
  const matched: TranslateUnit[] = []
  const missing: string[] = []
  const refused: SegmentRefusal[] = []
  let usage: TokenUsage | null = null
  let calls = 0
  const ids = (part: TempMappedUnit[]): string[] => part.map((unit) => unit.originalId)

  // `part` là phần vừa bị chặn và `reason` là lý do của lần chặn đó: một đoạn thì đã khoanh xong và mang
  // lý do ấy, nhiều hơn thì chia tiếp.
  const narrow = async (
    part: TempMappedUnit[],
    reason: ModelCompletionResult['filter']
  ): Promise<void> => {
    if (part.length === 1) {
      refused.push({
        id: part[0].originalId,
        group: reason?.group ?? 'other',
        raw: reason?.raw ?? ''
      })
      return
    }
    const middle = Math.ceil(part.length / 2)
    for (const half of [part.slice(0, middle), part.slice(middle)]) await attempt(half)
  }

  const attempt = async (part: TempMappedUnit[]): Promise<void> => {
    if (signal?.aborted || calls >= MAX_FILTER_SPLIT_CALLS) {
      missing.push(...ids(part))
      return
    }
    calls++
    let result: ModelCompletionResult
    try {
      result = await caller.complete(buildTranslateRequest(prompt, part).messages, { signal })
    } catch {
      missing.push(...ids(part))
      return
    }
    usage = addUsage(usage, result.usage)
    if (result.finishReason === 'filter') {
      await narrow(part, result.filter)
    } else if (result.finishReason === 'length') {
      missing.push(...ids(part))
    } else {
      const reconciliation = reconcileTempItems(
        part,
        tempToId,
        parseTranslationResponse(result.text)
      )
      matched.push(...reconciliation.matched)
      missing.push(...reconciliation.missing, ...reconciliation.empty)
    }
  }

  await (untried ? attempt(units) : narrow(units, firstReason))
  return { matched, missing, refused, usage }
}
