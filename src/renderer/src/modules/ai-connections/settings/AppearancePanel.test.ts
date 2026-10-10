import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppearancePanel } from './AppearancePanel'

describe('Giao diện settings', () => {
  it('offers the three themes and nothing about window glass', () => {
    const html = renderToStaticMarkup(createElement(AppearancePanel))
    for (const label of ['Sáng', 'Tối', 'Theo hệ thống']) expect(html).toContain(label)
    expect(html).not.toContain('kính')
  })
})
