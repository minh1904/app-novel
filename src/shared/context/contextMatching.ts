import type { ContextEntryItem } from '../contracts/glossary'

export interface MatchedContextEntry {
  entry: ContextEntryItem
  matchedForm: string
  count: number
}

export interface MatchContextOptions {
  minLengthCJK?: number
  minLengthLatin?: number
  maxMatches?: number
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isCJK(lang: string): boolean {
  const normalized = lang.toLowerCase()
  return normalized.startsWith('zh') || normalized.startsWith('ja') || normalized === 'cjk'
}

/**
 * Đếm số lần xuất hiện của `term` trong `text` theo chiến lược ngôn ngữ.
 * Với CJK: tìm kiếm chuỗi con trực tiếp.
 * Với chữ Latin/ngôn ngữ khác: dùng biểu thức chính quy kèm ranh giới từ (\b) khi thuật ngữ bắt đầu/kết thúc bằng ký tự từ.
 */
function countOccurrences(text: string, term: string, cjk: boolean): number {
  if (!text || !term) return 0

  if (cjk) {
    let count = 0
    let pos = 0
    while (pos < text.length) {
      const idx = text.indexOf(term, pos)
      if (idx === -1) break
      count++
      pos = idx + term.length
    }
    return count
  }

  // Chiến lược ranh giới từ cho chữ Latin
  const prefix = /^\w/.test(term) ? '\\b' : ''
  const suffix = /\w$/.test(term) ? '\\b' : ''
  try {
    const regex = new RegExp(`${prefix}${escapeRegex(term)}${suffix}`, 'gi')
    const matches = text.match(regex)
    return matches ? matches.length : 0
  } catch {
    return 0
  }
}

/**
 * Khớp các mục ngữ cảnh với văn bản gốc.
 * - Sắp xếp thuật ngữ dài nhất lên trước đối với CJK để ưu tiên các cụm từ cụ thể.
 * - Áp dụng minLength (mặc định 2 cho CJK, 3 cho Latin) để tránh nhiễu do từ đơn ký tự.
 * - Kiểm tra cả dạng gốc chính và toàn bộ bí danh.
 * - Trả về danh sách mục khớp sắp xếp theo độ dài khớp giảm dần, tần suất xuất hiện, rồi đến chuỗi nguồn.
 */
export function matchContextEntries(
  text: string,
  entries: ContextEntryItem[],
  lang: string,
  options: MatchContextOptions = {}
): MatchedContextEntry[] {
  if (!text || entries.length === 0) return []

  const cjk = isCJK(lang)
  const minLen = cjk ? (options.minLengthCJK ?? 2) : (options.minLengthLatin ?? 3)
  const matched: MatchedContextEntry[] = []

  for (const entry of entries) {
    const candidateForms = [entry.source, ...entry.aliases]
    let totalCount = 0
    let bestForm = entry.source

    // Sắp xếp các dạng ứng viên dài nhất lên trước
    const sortedForms = [...candidateForms].sort((a, b) => b.length - a.length)

    for (const form of sortedForms) {
      const trimmed = form.trim()
      if (trimmed.length < minLen) continue

      const count = countOccurrences(text, trimmed, cjk)
      if (count > 0) {
        totalCount += count
        if (totalCount === count) {
          bestForm = trimmed
        }
      }
    }

    if (totalCount > 0) {
      matched.push({
        entry,
        matchedForm: bestForm,
        count: totalCount
      })
    }
  }

  // Sắp xếp: dạng khớp dài nhất trước, rồi đến tần suất cao nhất, cuối cùng theo thứ tự bảng chữ cái của nguồn
  matched.sort((a, b) => {
    const lenDiff = b.matchedForm.length - a.matchedForm.length
    if (lenDiff !== 0) return lenDiff
    const countDiff = b.count - a.count
    if (countDiff !== 0) return countDiff
    return a.entry.source.localeCompare(b.entry.source)
  })

  if (options.maxMatches !== undefined && options.maxMatches > 0) {
    return matched.slice(0, options.maxMatches)
  }

  return matched
}
