import type { ChapterExportItem, NovelExportOptions, NovelMetadata } from '../exportTypes'

function formatChapterHeading(chapter: ChapterExportItem): string {
  const trimmed = chapter.title.trim()
  if (/^chương\s+\d+/i.test(trimmed)) {
    return `## ${trimmed}`
  }
  return `## Chương ${chapter.number}: ${trimmed}`
}

export function formatAsMarkdown(
  novel: NovelMetadata,
  chapters: ChapterExportItem[],
  options: NovelExportOptions = {}
): string {
  const parts: string[] = []
  const includeTitle = options.includeTitle ?? true
  const includeAuthor = options.includeAuthor ?? true
  const includeDesc = options.includeDescription ?? false

  // Book header
  if (chapters.length > 1 && includeTitle) {
    const meta: string[] = [`# ${novel.title.trim()}`]
    if (includeAuthor && novel.author) {
      meta.push(`\n**Tác giả:** ${novel.author.trim()}`)
    }
    if (includeDesc && novel.description) {
      const descLines = novel.description
        .trim()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
      meta.push(`\n${descLines}`)
    }
    parts.push(meta.join('\n'))
  }

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const content = ch.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

    parts.push(`${formatChapterHeading(ch)}\n\n${content}`)
  }

  return parts.join('\n\n---\n\n') + '\n'
}
