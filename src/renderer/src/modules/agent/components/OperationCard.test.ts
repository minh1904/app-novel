import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentOperation } from '../../../../../shared/contracts/agent'
import { OperationCard } from './OperationCard'

describe('OperationCard (Task 6.7)', () => {
  const baseOp: AgentOperation = {
    id: 'op-translate-1',
    turnId: 'turn-1',
    taskItemId: null,
    commandId: 'cmd-1',
    capability: 'translate_chapter',
    target: {
      kind: 'chapter',
      workId: 'work-1',
      workLabel: 'Đại Đạo Triều Thiên',
      chapterId: 'ch-1',
      chapterLabel: 'Chương 1: Khởi đầu'
    },
    state: 'running',
    model: { connectionId: 'c1', entryId: 'm1' },
    progress: {
      completed: 45,
      total: 100,
      unit: 'segments'
    },
    result: null,
    error: null,
    usage: null,
    createdAt: 1000,
    updatedAt: 1500
  }

  it('renders target label, progress bar and Dừng button when running', () => {
    const html = renderToStaticMarkup(
      createElement(OperationCard, {
        operation: baseOp,
        onOpenTarget: () => {},
        onCancel: () => {},
        onUndo: () => {}
      })
    )

    expect(html).toContain('Dịch chương')
    expect(html).toContain('Đại Đạo Triều Thiên › Chương 1: Khởi đầu')
    expect(html).toContain('45 / 100 segments (45%)')
    expect(html).toContain('Đang chạy')
    expect(html).toContain('Mở đích')
    expect(html).toContain('Dừng')
    expect(html).not.toContain('Hoàn tác')
  })

  it('renders Hoàn tác button and hides Dừng when completed', () => {
    const completedOp: AgentOperation = {
      ...baseOp,
      state: 'completed',
      progress: {
        completed: 100,
        total: 100,
        unit: 'segments'
      }
    }

    const html = renderToStaticMarkup(
      createElement(OperationCard, {
        operation: completedOp,
        onOpenTarget: () => {},
        onCancel: () => {},
        onUndo: () => {}
      })
    )

    expect(html).toContain('Hoàn tất')
    expect(html).toContain('Hoàn tác')
    expect(html).not.toContain('Dừng')
  })

  it('does NOT render long target translation content in the card transcript', () => {
    const longContent = 'A'.repeat(50000)
    const opWithLargeResult: AgentOperation = {
      ...baseOp,
      state: 'completed',
      result: { summary: 'Hoàn tất dịch 100 đoạn', fullTextContent: longContent }
    }

    const html = renderToStaticMarkup(
      createElement(OperationCard, {
        operation: opWithLargeResult
      })
    )

    // The long content is NOT in the rendered transcript card
    expect(html).not.toContain(longContent)
  })
})
