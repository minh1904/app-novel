/**
 * A line diff, only as clever as the panel needs.
 *
 * Shown before a proposal may be applied, so the translator sees what changes rather than finding out
 * afterwards. Lines, not words: a prose rewrite usually replaces whole sentences, and a word-level
 * diff of two different phrasings turns into confetti that is harder to read than the two versions.
 *
 * Plain LCS. The texts here are one paragraph to one chapter, so the quadratic table is fine; if that
 * ever stops being true the fix is to cap the input, not to get clever.
 */

export type DiffKind = 'same' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffKind
  text: string
}

/**
 * A text as its lines, with one contract applied everywhere: **empty text has no lines**.
 *
 * `''.split('\n')` gives `['']`, one empty line, which would show up in the diff as a removed blank —
 * noise above a proposal. Getting this wrong in one path and right in another is what makes a diff
 * lose or invent lines, so the conversion happens in exactly one place.
 */
function linesOf(text: string): string[] {
  return text === '' ? [] : text.split('\n')
}

/** Length table of the longest common subsequence of lines. */
function lcsTable(before: string[], after: string[]): number[][] {
  const table: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0)
  )
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      table[i][j] =
        before[i] === after[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  return table
}

/**
 * The lines of `after` against `before`, in reading order.
 *
 * A removed line and the added line replacing it come out adjacent (removed first), which is what lets
 * the panel show them as one swapped pair instead of two unrelated edits.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const left = linesOf(before)
  const right = linesOf(after)
  if (before === after) return left.map((text) => ({ kind: 'same', text }))
  const table = lcsTable(left, right)

  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({ kind: 'same', text: left[i] })
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ kind: 'removed', text: left[i] })
      i += 1
    } else {
      lines.push({ kind: 'added', text: right[j] })
      j += 1
    }
  }
  while (i < left.length) lines.push({ kind: 'removed', text: left[i++] })
  while (j < right.length) lines.push({ kind: 'added', text: right[j++] })
  return lines
}

/** How much changes, for a one-line summary above the diff. */
export function diffSummary(lines: DiffLine[]): { added: number; removed: number } {
  return {
    added: lines.filter((line) => line.kind === 'added').length,
    removed: lines.filter((line) => line.kind === 'removed').length
  }
}
