import type { ChapterExportItem, NovelExportOptions, NovelMetadata } from '../exportTypes'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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

export function formatAsNovelHtml(
  novel: NovelMetadata,
  chapters: ChapterExportItem[],
  options: NovelExportOptions = {}
): string {
  const includeTitle = options.includeTitle ?? true
  const includeAuthor = options.includeAuthor ?? true
  const includeDesc = options.includeDescription ?? false
  const indent = options.paragraphSpacing === 'indent'
  const pageSize = options.pageSize ?? 'A5'

  const marginMm = pageSize === 'A5' ? '18mm 14mm' : '25mm 20mm'

  let body = ''

  // Title page if multiple chapters or includeTitle
  if (chapters.length > 1 && includeTitle) {
    body += `
      <section class="title-page">
        <h1 class="book-title">${escapeHtml(novel.title.trim())}</h1>
        ${
          includeAuthor && novel.author
            ? `<div class="book-author">Tác giả: ${escapeHtml(novel.author.trim())}</div>`
            : ''
        }
        ${
          includeDesc && novel.description
            ? `<div class="book-desc">${escapeHtml(novel.description.trim()).replace(/\n/g, '<br/>')}</div>`
            : ''
        }
      </section>
    `
  }

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const paragraphs = normalizeParagraphs(ch.content)

    body += `
      <article class="chapter-container">
        <h2 class="chapter-title">${escapeHtml(formatChapterTitle(ch))}</h2>
        <div class="chapter-body">
          ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')}
        </div>
      </article>
    `
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(novel.title)}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: ${marginMm};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: "Times New Roman", Times, Georgia, "Segoe UI", serif;
      font-size: ${pageSize === 'A5' ? '10.5pt' : '11.5pt'};
      line-height: 1.6;
      color: #111827;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      text-align: center;
      page-break-after: always;
      break-after: page;
      padding: 2rem 1rem;
    }

    .book-title {
      font-size: ${pageSize === 'A5' ? '22pt' : '26pt'};
      font-weight: 700;
      margin-bottom: 1.2rem;
      letter-spacing: -0.02em;
    }

    .book-author {
      font-size: 13pt;
      font-style: italic;
      color: #4b5563;
      margin-bottom: 2rem;
    }

    .book-desc {
      font-size: 10pt;
      color: #6b7280;
      max-width: 80%;
      line-height: 1.5;
    }

    .chapter-container {
      page-break-before: always;
      break-before: page;
      padding-top: 1.5rem;
    }

    /* First chapter doesn't need extra page break if no title page */
    .chapter-container:first-of-type {
      ${chapters.length > 1 && includeTitle ? '' : 'page-break-before: auto; break-before: auto;'}
    }

    .chapter-title {
      font-size: ${pageSize === 'A5' ? '14pt' : '16pt'};
      font-weight: 700;
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .chapter-body p {
      text-align: justify;
      hyphens: auto;
      ${
        indent
          ? 'text-indent: 1.8em; margin-bottom: 0;'
          : 'text-indent: 0; margin-bottom: 0.85em;'
      }
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`
}
