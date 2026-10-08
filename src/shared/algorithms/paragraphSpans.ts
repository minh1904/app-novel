/**
 * Paragraphs as ADR-005 defines them: each non-blank line is one. Shared by the chat tools in main, which
 * count paragraphs for the model, and by the renderer, which says where the caret is in the same numbers.
 */

/** One paragraph: a non-blank line, as ADR-005 defines it (`paragraphUnits`). */
export interface ParagraphSpan {
  /**
   * The slice of `content` this paragraph owns: from the start of its line to the start of the next
   * paragraph's line (the first one also owns any blank lines before it, the last one runs to the end).
   * Pages cut on these bounds join back into exactly `content`.
   */
  start: number
  end: number
  /** Where the line itself sits inside `content`, for excerpts. */
  lineStart: number
  lineEnd: number
}

export function splitParagraphs(content: string): ParagraphSpan[] {
  const lines: Array<{ start: number; end: number }> = []
  const pattern = /[^\r\n]*(\r\n|\r|\n|$)/g
  for (let match = pattern.exec(content); match !== null; match = pattern.exec(content)) {
    const text = match[0].replace(/[\r\n]+$/, '')
    if (text.trim() !== '') lines.push({ start: match.index, end: match.index + text.length })
    if (match[0] === '' || pattern.lastIndex >= content.length) break
  }
  return lines.map((line, index) => ({
    start: index === 0 ? 0 : line.start,
    end: index === lines.length - 1 ? content.length : lines[index + 1].start,
    lineStart: line.start,
    lineEnd: line.end
  }))
}

/** The 0-based paragraph whose span holds `offset`; the last one for an offset at the very end. */
export function paragraphAt(spans: ParagraphSpan[], offset: number): number {
  let low = 0
  let high = spans.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (spans[middle].start <= offset) low = middle
    else high = middle - 1
  }
  return low
}
