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
 * Counts occurrences of `term` in `text` based on language strategy.
 * For CJK: substring search.
 * For Latin/other: regex with word boundaries (\b) when term starts/ends with word chars.
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

  // Latin / Word-boundary strategy
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
 * Matches context entries against source text.
 * - Sorts terms longest-first for CJK to prioritize specific terms.
 * - Enforces minLength (default 2 for CJK, 3 for Latin) to prevent single-character noise.
 * - Checks both primary source and all aliases.
 * - Returns matched entries sorted by longest match length, then frequency, then source.
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

    // Sort candidate forms longest-first
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

  // Sort: longest matched form first, then highest frequency, then alphabetical source
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
