/**
 * Parses range expressions like "1, 5, 10-25", "1..5", or "3" into a sorted array of unique integers.
 * Ignores invalid tokens and non-positive numbers.
 */
export function parseRangeString(raw: string, max?: number): number[] {
  const tokens = raw
    .trim()
    .split(/[,;\s]+/)
    .filter(Boolean)
  const result = new Set<number>()

  for (const token of tokens) {
    const rangeMatch = /^(\d+)(?:-|\.\.)(\d+)$/.exec(token)
    if (rangeMatch) {
      const from = Number.parseInt(rangeMatch[1], 10)
      const to = Number.parseInt(rangeMatch[2], 10)
      if (from > 0 && to > 0) {
        const start = Math.min(from, to)
        const end = Math.max(from, to)
        for (let i = start; i <= end; i++) {
          if (max === undefined || i <= max) {
            result.add(i)
          }
        }
      }
      continue
    }

    const singleMatch = /^(\d+)$/.exec(token)
    if (singleMatch) {
      const num = Number.parseInt(singleMatch[1], 10)
      if (num > 0 && (max === undefined || num <= max)) {
        result.add(num)
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b)
}
