/**
 * Lượng token nhà cung cấp báo đã dùng thật, ở dạng đi qua IPC. Một kiểu chung cho chat và dịch.
 *
 * `inputTokens` là **tổng** đầu vào, đã gồm phần đọc/ghi cache: đó là con số người dùng quen thấy.
 * Main giữ dạng chi tiết hơn (`Usage` ở `infra/providers/usage.ts`, tách cache và suy luận) và đổi
 * sang dạng này ở ranh giới.
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}
