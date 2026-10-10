import type { SourceLanguage } from '../../../shared/contracts/library'
import type { ModelInfo } from '../../infra/providers/modelCatalog'
import type { Usage } from '../../infra/providers/usage'

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
const CHARS_PER_TOKEN: Partial<Record<SourceLanguage, number>> = {
  en: 4,
  'zh-Hans': 1.3,
  'zh-Hant': 1.3,
  ja: 1.3,
  ko: 1.5
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

/**
 * Tiền của một lượt đã chạy xong, từ `usage` **thật** nhà cung cấp báo.
 *
 * Khác `estimateCost` ở chỗ không ước lượng gì: không hệ số ký tự-trên-token, không tỷ lệ đầu ra,
 * không prompt overhead — ba thứ đều là phỏng đoán chưa đo, và ở đây không cần tới chúng. Trả `null`
 * khi chưa biết giá; **không bao giờ** trả 0, vì 0 đọc như "miễn phí".
 *
 * `usage.inputTokens` là phần đầu vào **không** đọc từ cache (xem `Usage`). Phần đọc/ghi cache tính
 * theo giá cache của model; bảng giá thiếu giá đó thì tính như đầu vào thường, vì đó là mức cao hơn
 * hoặc bằng và một con số hơi dư dễ chấp nhận hơn một con số thiếu. Token suy luận nằm **trong**
 * `outputTokens` nên đã được tính theo giá đầu ra.
 */
export function costOfUsage(usage: Usage, model?: ModelInfo): number | null {
  const inputPrice = model?.cost?.input
  const outputPrice = model?.cost?.output
  if (inputPrice === undefined || outputPrice === undefined) return null
  const cacheReadPrice = model?.cost?.cacheRead ?? inputPrice
  const cacheWritePrice = model?.cost?.cacheWrite ?? inputPrice
  const usd =
    (Math.max(0, usage.inputTokens) / 1_000_000) * inputPrice +
    (Math.max(0, usage.cacheReadTokens ?? 0) / 1_000_000) * cacheReadPrice +
    (Math.max(0, usage.cacheWriteTokens ?? 0) / 1_000_000) * cacheWritePrice +
    (Math.max(0, usage.outputTokens) / 1_000_000) * outputPrice
  return roundUsd(usd)
}

export function estimateCost(input: CostEstimateInput): CostEstimate {
  const { sourceChars, sourceLang, batchCount, model } = input
  const chars = Math.max(0, sourceChars)
  const batches = Math.max(0, Math.trunc(batchCount))

  const bodyTokens = Math.ceil(chars / (CHARS_PER_TOKEN[sourceLang] ?? 2))
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
