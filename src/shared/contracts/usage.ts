/**
 * Lượng token nhà cung cấp báo đã dùng thật, ở dạng đi qua IPC. Một kiểu chung cho chat và dịch.
 *
 * `inputTokens` là **tổng** đầu vào, đã gồm phần đọc/ghi cache: đó là con số người dùng quen thấy.
 * Main giữ dạng chi tiết hơn (`Usage` ở `infra/providers/usage.ts`, tách cache và suy luận) và đổi
 * sang dạng này ở ranh giới.
 */
export interface TokenUsage {
  /** Total provider-reported input, including cache reads/writes. */
  inputTokens: number
  /** Input not served from or written to cache, when the provider breakdown makes it knowable. */
  uncachedInputTokens?: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  /** A subset of outputTokens, never an additional count. */
  reasoningTokens?: number
  source: 'provider'
  /** False when at least one executed provider call omitted usage. */
  complete: boolean
}
