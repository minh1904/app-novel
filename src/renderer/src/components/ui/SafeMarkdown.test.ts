import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { SafeMarkdown } from './SafeMarkdown'

const render = (text: string): string => renderToStaticMarkup(createElement(SafeMarkdown, { text }))

describe('safe chat Markdown', () => {
  it('renders headings, lists, links and fenced code as readable blocks', () => {
    const html = render(
      '# Ghi chú\n\n- Một\n- Hai\n\n[Xem](https://example.com/a)\n\n```md\n**truyện**\n```'
    )
    expect(html).toContain('<h4')
    expect(html).toContain('<ul')
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('<code>**truyện**</code>')
  })

  it('escapes HTML, refuses unsafe links and does not load remote images', () => {
    const html = render(
      '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![cover](https://example.com/a.png)'
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('<img')
    expect(html).toContain('ảnh bị chặn: cover')
  })
})
