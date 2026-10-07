import type { RefusalGroup } from './aiTranslate'

/**
 * Hợp đồng dữ liệu cho Lõi dịch (translation-core).
 * Đơn vị làm việc là các block/đoạn văn bản độc lập có ID.
 */

export interface TranslateUnit {
  id: string
  text: string
}

export interface TempMappedUnit {
  /** ID tạm thời gửi cho mô hình, dạng "[1]", "[2]", ... */
  tempId: string
  /** ID gốc ban đầu của người gọi */
  originalId: string
  text: string
}

export interface ParsedTranslateItem {
  tempId: string
  text: string
}

export interface ReconciliationResult {
  /** Các đơn vị đối soát thành công và gán đúng ID gốc */
  matched: TranslateUnit[]
  /** Các ID gốc bị mô hình bỏ sót */
  missing: string[]
  /** Các ID tạm lạ mà mô hình tự sinh không có trong yêu cầu */
  extraneous: string[]
  /** Các ID có bản dịch rỗng hoặc chỉ toàn khoảng trắng */
  empty: string[]
}

export interface ModelCompletionResult {
  text: string
  usage: { inputTokens: number; outputTokens: number } | null
  finishReason?: string
  /** Khi `finishReason` là `filter`: lý do nhà cung cấp nêu, đã gộp nhóm. */
  filter?: { group: RefusalGroup; raw: string }
  status?: number
}

export interface TranslationModelCaller {
  complete(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<ModelCompletionResult>
}
