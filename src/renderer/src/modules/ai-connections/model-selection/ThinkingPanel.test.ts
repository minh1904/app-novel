import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import { ThinkingPanel } from './ModelSelectionMenu'

const entry = (levels: ModelEntryView['capability']['thinkingLevels']): ModelEntryView => ({
  id: 'e',
  name: 'gemini-2.5-flash',
  model: 'gemini-2.5-flash',
  settings: { thinking: 'medium' },
  capability: { thinkingLevels: levels, temperature: true, structuredOutput: false }
})

const render = (levels: ModelEntryView['capability']['thinkingLevels']): string =>
  renderToStaticMarkup(
    createElement(ThinkingPanel, { entry: entry(levels), onChoose: () => undefined })
  )

describe('thinking submenu', () => {
  it('lists only the levels the model takes, then Mặc định', () => {
    const html = render(['low', 'medium', 'high'])
    expect(html).toContain('Thấp')
    expect(html).toContain('Cao')
    expect(html).not.toContain('Tối đa')
    expect(html).toContain('Mặc định')
    expect(html).not.toContain('Tùy chọn')
  })

  it('offers the on/off switch only when the model can turn thinking off', () => {
    expect(render(['off', 'low', 'high'])).toContain('Tùy chọn')
  })

  it('has only Mặc định for a model it knows nothing about', () => {
    const html = render([])
    expect(html).toContain('Mặc định')
    expect(html).not.toContain('Thấp')
  })
})
