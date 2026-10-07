import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AiTurn } from './AiTurn'
import type { TurnView } from './chatTurns'

function turn(patch: Partial<TurnView>): TurnView {
  return {
    localId: 't1',
    requestId: 'r1',
    question: 'Dịch đoạn này',
    mode: 'ask',
    answer: '',
    status: 'done',
    error: null,
    usage: null,
    usd: null,
    keyTail: null,
    finishReason: null,
    autoApply: null,
    context: [],
    tools: [],
    range: null,
    ...patch
  } as TurnView
}

const render = (view: TurnView, retryWith?: { label: string; onClick(): void }): string =>
  renderToStaticMarkup(
    createElement(AiTurn, {
      turn: view,
      onCancel: () => undefined,
      onRetry: () => undefined,
      onApply: () => undefined,
      onShowInEditor: () => undefined,
      onNavigateChapter: () => undefined,
      retryWith
    })
  )

describe('AiTurn and fallbacks', () => {
  it('shows a switch to a fallback apart from what the model read', () => {
    const html = render(
      turn({
        answer: 'Xong',
        tools: [
          {
            name: 'fallback',
            detail: 'Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.'
          },
          { name: 'read_chapter', detail: 'chương 3, bản gốc' }
        ]
      })
    )
    expect(html).toContain('Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.')
    expect(html).toContain('Đã đọc: chương 3, bản gốc')
    expect(html).not.toContain('Đã đọc: Đã chuyển sang')
  })

  it('offers the fallback model on a failed turn', () => {
    const html = render(
      turn({
        status: 'error',
        error: { kind: 'quota', message: 'Hết hạn mức', retryable: false, recoverAt: null }
      }),
      { label: 'Dự phòng · deepseek-v4', onClick: () => undefined }
    )
    expect(html).toContain('Thử bằng Dự phòng · deepseek-v4')
  })
})
