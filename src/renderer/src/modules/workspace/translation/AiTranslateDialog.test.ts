import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Figure } from './AiTranslateDialog'

describe('AiTranslateDialog figures (Task 7.2)', () => {
  it('renders paragraph count and batch count figures without token/cost estimates', () => {
    const paragraphFigure = renderToStaticMarkup(
      createElement(Figure, { label: 'Số đoạn sẽ dịch', value: '45' })
    )
    const batchFigure = renderToStaticMarkup(
      createElement(Figure, { label: 'Số lô sẽ gửi', value: '5' })
    )

    expect(paragraphFigure).toContain('Số đoạn sẽ dịch')
    expect(paragraphFigure).toContain('45')

    expect(batchFigure).toContain('Số lô sẽ gửi')
    expect(batchFigure).toContain('5')
  })
})
