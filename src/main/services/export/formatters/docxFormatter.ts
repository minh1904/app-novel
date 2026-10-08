import { AlignmentType, Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from 'docx'
import type { ChapterExportItem, NovelExportOptions, NovelMetadata } from '../exportTypes'

function formatChapterTitle(chapter: ChapterExportItem): string {
  const trimmed = chapter.title.trim()
  if (/^chương\s+\d+/i.test(trimmed)) {
    return trimmed
  }
  return `Chương ${chapter.number}: ${trimmed}`
}

function normalizeParagraphs(content: string): string[] {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

export async function formatAsDocxBuffer(
  novel: NovelMetadata,
  chapters: ChapterExportItem[],
  options: NovelExportOptions = {}
): Promise<Buffer> {
  const includeTitle = options.includeTitle ?? true
  const includeAuthor = options.includeAuthor ?? true
  const includeDesc = options.includeDescription ?? false
  const indent = options.paragraphSpacing === 'indent'

  const docChildren: Paragraph[] = []

  // Novel cover / title page (if multiple chapters or includeTitle)
  if (chapters.length > 1 && includeTitle) {
    // Title
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 400 },
        children: [
          new TextRun({
            text: novel.title.trim(),
            bold: true,
            size: 48, // 24pt
            font: 'Times New Roman'
          })
        ]
      })
    )

    // Author
    if (includeAuthor && novel.author) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({
              text: `Tác giả: ${novel.author.trim()}`,
              italics: true,
              size: 26, // 13pt
              font: 'Times New Roman'
            })
          ]
        })
      )
    }

    // Description
    if (includeDesc && novel.description) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [
            new TextRun({
              text: novel.description.trim(),
              size: 22,
              italics: true,
              font: 'Times New Roman'
            })
          ]
        })
      )
    }

    // Page break after title page
    docChildren.push(
      new Paragraph({
        children: [new PageBreak()]
      })
    )
  }

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]

    // Page break before subsequent chapters
    if (i > 0) {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      )
    }

    // Chapter Heading
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 600 },
        children: [
          new TextRun({
            text: formatChapterTitle(ch),
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman'
          })
        ]
      })
    )

    // Body paragraphs
    const paragraphs = normalizeParagraphs(ch.content)
    for (const p of paragraphs) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: indent ? { firstLine: 720 } : undefined, // 0.5 inch first line indent
          spacing: {
            line: 360, // 1.5 line spacing
            after: indent ? 0 : 200
          },
          children: [
            new TextRun({
              text: p,
              size: 24, // 12pt
              font: 'Times New Roman'
            })
          ]
        })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: docChildren
      }
    ]
  })

  return await Packer.toBuffer(doc)
}
