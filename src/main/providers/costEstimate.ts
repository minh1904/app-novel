import type { SourceLanguage } from '../../shared/library'
import type { ModelInfo } from './modelCatalog'

/**
 * Ước lượng chi phí trước khi chạy một job dịch.
 *
 * Không gọi API đếm token: mỗi nhà cung cấp một kiểu, và đường tương thích OpenAI không có. Ước
 * lượng từ số ký tự nguồn, nên **luôn là ước lượng** — giao diện phải nói đúng chữ đó, và sau khi
 * chạy thì ghi `usage` thật để đối chiếu (D7 của change `ai-connection`).
 */

/**
 * Số ký tự trên một token, theo ngôn ngữ nguồn. **Phỏng đoán, chưa đo** — cùng chỗ một hằng số để
 * sửa một lần khi có số thật từ bước kiểm chứng.
 */
const CHARS_PER_TOKEN: Record<SourceLanguage, number> = {
  en: 4,
  'zh-Hans': 1.3,
  'zh-Hant': 1.3,
  ja: 1.3
}

/**
 * Tỷ lệ token đầu ra trên token đầu vào khi dịch sang tiếng Việt. **Phỏng đoán, chưa đo**; nghiên
 * cứu công cụ dịch AI ghi khoảng 1,2–1,5.
 */
const OUTPUT_RATIO = 1.3

/** Token prompt cố định mỗi lô (hướng dẫn, định dạng ID). **Phỏng đoán, chưa đo.** */
const PROMPT_OVERHEAD_TOKENS_PER_BATCH = 400

export interface CostEstimateInput {
  /** Tổng ký tự của phần nguồn sẽ gửi. */
  sourceChars: number
  sourceLang: SourceLanguage
  /** Số lô sẽ gửi; mỗi lô cộng một lượng prompt cố định. */
  batchCount: number
  /** Thiếu thì kết quả không có `usd` — gọi là "chưa biết giá", không phải 0. */
  model?: ModelInfo
}

export interface CostEstimate {
  inputTokens: number
  outputTokens: number
  /** Thiếu khi model không có trong bản chụp hoặc bản chụp không có giá. */
  usd?: number
}

/** Làm tròn tiền về 4 chữ số thập phân; dưới mức đó không có ý nghĩa với người đọc. */
function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function estimateCost(input: CostEstimateInput): CostEstimate {
  const { sourceChars, sourceLang, batchCount, model } = input
  const chars = Math.max(0, sourceChars)
  const batches = Math.max(0, Math.trunc(batchCount))

  const bodyTokens = Math.ceil(chars / CHARS_PER_TOKEN[sourceLang])
  const inputTokens = bodyTokens + batches * PROMPT_OVERHEAD_TOKENS_PER_BATCH
  const outputTokens = Math.ceil(bodyTokens * OUTPUT_RATIO)

  const inputPrice = model?.cost?.input
  const outputPrice = model?.cost?.output
  if (inputPrice === undefined || outputPrice === undefined) {
    return { inputTokens, outputTokens }
  }

  const usd = (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice
  return { inputTokens, outputTokens, usd: roundUsd(usd) }
}
