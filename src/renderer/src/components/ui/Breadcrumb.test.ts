import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Breadcrumb } from './Breadcrumb'

describe('Breadcrumb', () => {
  it('renders breadcrumb items with 13px text-body-sm style', () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumb, {
        items: [{ label: 'Thư viện', onClick: () => undefined }, { label: 'Chương 1: Mở đầu' }]
      })
    )

    expect(html).toContain('text-body-sm')
    expect(html).toContain('Thư viện')
    expect(html).toContain('Chương 1: Mở đầu')
    expect(html).toContain('/')
    expect(html).toContain('aria-label="Đường dẫn điều hướng"')
    expect(html).toContain('aria-current="page"')
  })

  it('renders clickable button for non-last items with onClick', () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumb, {
        items: [
          { label: 'Tác phẩm', onClick: () => undefined, title: 'Về tác phẩm' },
          { label: 'Chương 2' }
        ]
      })
    )

    expect(html).toContain('<button type="button"')
    expect(html).toContain('title="Về tác phẩm"')
  })
})
