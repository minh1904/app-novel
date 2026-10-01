/** One block of the reading view: a paragraph of text, or the space between paragraphs. */
export type ReadingBlock = { kind: 'paragraph'; text: string } | { kind: 'gap' }

/**
 * The reading view's blocks for a text. Every non-empty line is a paragraph; one or more blank
 * lines in a row are one gap. Leading and trailing blank lines make no gap, and white space inside a
 * line (an indent, a full-width space) is kept. Nothing is read as Markdown.
 */
export function readingBlocks(text: string): ReadingBlock[] {
  const blocks: ReadingBlock[] = []
  let pendingGap = false
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      pendingGap = blocks.length > 0
      continue
    }
    if (pendingGap) blocks.push({ kind: 'gap' })
    pendingGap = false
    blocks.push({ kind: 'paragraph', text: line })
  }
  return blocks
}
