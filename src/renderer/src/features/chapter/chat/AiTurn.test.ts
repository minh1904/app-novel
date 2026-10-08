import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ProposalQueueItem } from '../../../../../shared/contracts/aiProposals'
import { AiTurn } from './AiTurn'
import type { TurnView } from './chatTurns'

const NOW = Date.now()

function turn(patch: Partial<TurnView>): TurnView {
  return {
    localId: 't1',
    requestId: 'r1',
    question: 'Dịch đoạn này',
    chapterId: 'c',
    mode: 'chat',
    answer: '',
    reasoning: '',
    createdAt: NOW - 12_000,
    finishedAt: NOW,
    status: 'done',
    error: null,
    usage: null,
    usd: null,
    keyTail: null,
    finishReason: null,
    context: [],
    tools: [],
    proposals: [],
    range: null,
    ...patch
  }
}

const queue: ProposalQueueItem[] = [
  {
    id: 'p1',
    chapterId: 'c',
    origin: 'chat',
    policy: 'review',
    createdAt: 1,
    parts: [
      {
        id: 'part1',
        baseFrom: 0,
        baseTo: 4,
        beforeText: 'Hai.',
        afterText: 'Hai đã sửa.',
        sourceOrder: null,
        status: 'pending',
        reason: null
      }
    ]
  }
]

const render = (view: TurnView, retryWith?: { label: string; onClick(): void }): string =>
  renderToStaticMarkup(
    createElement(AiTurn, {
      turn: view,
      workId: 'w',
      currentChapterId: 'c',
      queueItem: (id) => queue.find((item) => item.id === id),
      actions: { accept: () => undefined, deny: () => undefined, show: () => undefined },
      onRetry: () => undefined,
      onNavigateChapter: () => undefined,
      retryWith
    })
  )

describe('AiTurn, laid out like Hermes', () => {
  it('shows the question in its box, the answer as text, and the time with copy and retry', () => {
    const html = render(turn({ answer: 'Chào bạn! Có điều gì mình có thể giúp không?' }))
    expect(html).toContain('Dịch đoạn này')
    expect(html).toContain('Chào bạn! Có điều gì mình có thể giúp không?')
    expect(html).toContain('Hôm nay, ')
    expect(html).toContain('aria-label="Sao chép"')
    expect(html).toContain('aria-label="Hỏi lại"')
    // The token count is no longer a line of its own.
    expect(html).not.toContain('>Nhà cung cấp không báo lượng dùng<')
  })

  it('shows what the model thought as a closed "Thought" row once the turn is over', () => {
    const html = render(turn({ reasoning: 'The user just said hello.', answer: 'Chào bạn!' }))
    expect(html).toContain('Đã suy nghĩ 12 giây')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('The user just said hello.')
  })

  it('shows the thinking live, open, while the model has not answered yet', () => {
    const html = render(
      turn({ status: 'running', finishedAt: null, reasoning: 'Đang cân nhắc cách xưng hô' })
    )
    expect(html).toContain('Đang suy nghĩ')
    expect(html).toContain('Đang cân nhắc cách xưng hô')
    expect(html).toContain('max-h-40')
  })

  it('says it is thinking before anything arrives', () => {
    const html = render(turn({ status: 'sending', finishedAt: null }))
    expect(html).toContain('Đang suy nghĩ')
  })

  it('never shows what was attached or selected, nor an old mode', () => {
    const html = render(
      turn({
        mode: 'edit',
        context: [{ kind: 'range', label: 'Đoạn đang sửa', detail: '1 đoạn', text: 'abc' }],
        answer: 'x'
      })
    )
    expect(html).not.toContain('Đã gửi kèm')
    expect(html).not.toContain('Đoạn đang sửa')
    expect(html).not.toContain('Lượt cũ')
  })

  it('collapses tool calls into one quiet line, and names the running call while it runs', () => {
    const done = render(
      turn({
        answer: 'x',
        tools: [
          { name: 'read_chapter', detail: 'Chương 2 · bản gốc — đoạn 1–5/5', status: 'ok' },
          {
            name: 'search_work',
            detail: 'Tìm "魔王" · bản gốc — 1 chỗ ở 1 chương, trả 1',
            status: 'ok'
          }
        ]
      })
    )
    expect(done).toContain('Đã đọc 1 chương, tìm 1 lần')
    const running = render(
      turn({
        status: 'running',
        finishedAt: null,
        tools: [{ name: 'read_segments', detail: 'Chương 2 · bản dịch — đoạn 3', status: 'ok' }]
      })
    )
    expect(running).toContain('Chương 2 · bản dịch — đoạn 3')
  })

  it('keeps a fallback notice apart', () => {
    const html = render(
      turn({
        answer: 'Xong',
        tools: [
          {
            name: 'fallback',
            detail: 'Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.'
          }
        ]
      })
    )
    expect(html).toContain('Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.')
  })

  it('shows a proposal under the answer with its status from the queue', () => {
    const html = render(
      turn({
        answer: 'Đã đề xuất.',
        proposals: [
          {
            type: 'edit',
            proposalId: 'p1',
            partIds: ['part1'],
            chapterId: 'c',
            label: 'Sửa đoạn 2 bản dịch'
          }
        ]
      })
    )
    expect(html).toContain('Sửa đoạn 2 bản dịch')
    expect(html).toContain('Chờ duyệt')
  })

  it('says a stopped turn stopped, quietly', () => {
    expect(render(turn({ status: 'cancelled', answer: 'một nửa' }))).toContain('Đã dừng')
  })

  it('offers the fallback model, and a relogin for an account error', () => {
    const html = render(
      turn({
        status: 'error',
        error: {
          kind: 'auth',
          message: 'Cần đăng nhập lại',
          retryable: false,
          recoverAt: null,
          account: 'codex'
        }
      }),
      { label: 'Dự phòng · deepseek-v4', onClick: () => undefined }
    )
    expect(html).toContain('Thử bằng Dự phòng · deepseek-v4')
    expect(html).toContain('Đăng nhập lại')
  })
})
