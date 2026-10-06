/**
 * Thế hệ prompt mà dịch và chat dùng.
 *
 * `v1` là prompt đang chạy trong sản phẩm. `v2` là bản dựng lại theo nghiên cứu
 * [hệ thống prompt](../../../../docs/modules/context/prompt-system.md): system prompt cố định cho cả
 * tác phẩm, ngữ cảnh thay đổi nằm trong message user và được bọc thẻ. `v2` **chưa đo**, nên chỉ bật
 * qua biến môi trường để Bộ đo so với `v1`; đổi mặc định là một quyết định cần kết quả đo, không phải
 * một thay đổi mã.
 */
export const PROMPT_VERSIONS = ['v1', 'v2', 'v3', 'v4'] as const
export type PromptVersion = (typeof PROMPT_VERSIONS)[number]

export const DEFAULT_PROMPT_VERSION: PromptVersion = 'v1'

/**
 * `v3` = `v2` + model tự khai người nói → người nghe cho từng câu thoại trước khi chọn đại từ (thử
 * nghiệm 2026-10-06: Rion xưng "anh" với cả Milly vì cùng cảnh có Sophia). Mọi khối ngữ cảnh của `v2`
 * áp dụng cho `v3`. `v4` thêm cách tự xưng/gọi người nghe trước bản dịch để thử giảm lệch cặp.
 */
export function usesContextBlocks(version: PromptVersion): boolean {
  return version !== 'v1'
}

/** Đọc tên phiên bản từ biến môi trường. Rỗng là mặc định; tên lạ là `null` để người gọi báo lỗi. */
export function parsePromptVersion(value: string | undefined): PromptVersion | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return DEFAULT_PROMPT_VERSION
  return (PROMPT_VERSIONS as readonly string[]).includes(trimmed)
    ? (trimmed as PromptVersion)
    : null
}
