import type { SourceLanguage } from '../../../../shared/contracts/library'
import type { TokenUsage } from '../../../../shared/contracts/usage'
import type { TranslateFailure } from '../../../../shared/contracts/aiTranslate'
import type { Generation } from '../../../infra/providers/generation'
import type { TranslateUnit } from '../../../../shared/contracts/translateCore'

export type { TranslateUnit } from '../../../../shared/contracts/translateCore'

export interface TranslateCoreRequest {
  sourceLang: SourceLanguage
  targetLang?: string
  units: TranslateUnit[]
  model: string
  generation?: Generation
  signal?: AbortSignal
}

export interface TranslateCoreResult {
  /** Các đơn vị đã dịch thành công, mang ID gốc */
  items: TranslateUnit[]
  /** Các ID gốc không dịch được sau khi đã thử lại */
  failedIds: string[]
  /** Tổng lượng token đã tiêu thụ */
  usage: TokenUsage | null
  /** Lỗi phân loại nếu có */
  error: TranslateFailure | null
}
