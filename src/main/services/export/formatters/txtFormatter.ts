import type { ChapterExportItem, NovelExportOptions, NovelMetadata } from '../exportTypes'

function formatChapterTitle(chapter: ChapterExportItem): string {
  const trimmed = chapter.title.trim()
  if (/^chương\s+\d+/i.test(trimmed)) {
    return trimmed
  }
  return `Chương ${chapter.number}: ${trimmed}`
}

function normalizeContent(raw: string): string[] {
  // Normalize CRLF to LF, and split into non-empty paragraphs
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n+/)
  return lines.map((line) => line.trim()).filter((line) => line.length > 0)
}

export function formatAsTxt(
  novel: NovelMetadata,
  chapters: ChapterExportItem[],
  options: NovelExportOptions = {}
): string {
  const parts: string[] = []
  const includeTitle = options.includeTitle ?? true
  const includeAuthor = options.includeAuthor ?? true
  const includeDesc = options.includeDescription ?? false
  const indent = options.paragraphSpacing === 'indent'

  // Header if multiple chapters or explicitly requested
  if (chapters.length > 1 && includeTitle) {
    parts.push(novel.title.trim().toUpperCase())
    if (includeAuthor && novel.author) {
      parts.push(`Tác giả: ${novel.author.trim()}`)
    }
    if (includeDesc && novel.description) {
      parts.push(`\n${novel.description.trim()}`)
    }
    parts.push('\n' + '='.repeat(40) + '\n')
  }

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const chLines: string[] = []

    chLines.push(formatChapterTitle(ch))
    chLines.push('') // blank line after chapter heading

    const paragraphs = normalizeContent(ch.content)
    for (const p of paragraphs) {
      chLines.push(indent ? `    ${p}` : p)
      if (!indent) {
        chLines.push('')
      }
    }

    parts.push(chLines.join('\n').trimEnd())
  }

  // Return standard UTF-8 string with trailing newline
  return parts.join('\n\n\n\n') + '\n'
}
