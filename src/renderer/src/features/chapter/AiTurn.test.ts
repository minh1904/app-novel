import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ProposalQueueItem } from '../../../../shared/contracts/aiProposals'
import { AiTurn } from './AiTurn'
import type { TurnView } from './chatTurns'

function turn(patch: Partial<TurnView>): TurnView {
  return {
    localId: 't1',
    requestId: 'r1',
    question: 'Dịch đoạn này',
    chapterId: 'c',
    mode: 'chat',
    answer: '',
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
      onCancel: () => undefined,
      onRetry: () => undefined,
      onNavigateChapter: () => undefined,
      retryWith
    })
  )

describe('AiTurn', () => {
  it('shows a switch to a fallback apart from the tool summary', () => {
    const html = render(
      turn({
        answer: 'Xong',
        tools: [
          {
            name: 'fallback',
            detail: 'Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.'
          },
          { name: 'read_chapter', detail: 'Chương 3 · bản gốc — đoạn 1–2/2', status: 'ok' }
        ]
      })
    )
    expect(html).toContain('Đã chuyển sang Dự phòng · deepseek-v4 vì Gemini hết hạn mức.')
    expect(html).toContain('Đã đọc 1 chương')
    expect(html).not.toContain('Đã đọc: Đã chuyển sang')
  })

  it('collapses the tool calls into one line that opens a list', () => {
    const html = render(
      turn({
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
    expect(html).toContain('Đã đọc 1 chương, tìm 1 lần')
    expect(html).toContain('aria-expanded="false"')
    // Closed: the per-call lines are not rendered yet.
    expect(html).not.toContain('Tìm &quot;魔王&quot;')
  })

  it('says which call is running while the turn runs', () => {
    const html = render(
      turn({
        status: 'running',
        tools: [
          {
            name: 'read_segments',
            detail: 'Chương 2 · bản dịch — đoạn 3 kèm đoạn tương ứng',
            status: 'ok'
          }
        ]
      })
    )
    expect(html).toContain('Đang gọi công cụ · Chương 2 · bản dịch — đoạn 3 kèm đoạn tương ứng')
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
    expect(html).toContain('Chấp nhận')
    expect(html).toContain('Bỏ')
  })

  it('labels an old turn with its mode and keeps what it sent along', () => {
    const html = render(
      turn({
        mode: 'edit',
        context: [{ kind: 'range', label: 'Đoạn đang sửa', detail: '1 đoạn', text: 'abc' }]
      })
    )
    expect(html).toContain('Lượt cũ · chế độ Sửa')
    expect(html).toContain('Đã gửi kèm 1 khối ngữ cảnh')
  })

  it('has no mode label on a new turn', () => {
    expect(render(turn({}))).not.toContain('Lượt cũ')
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
