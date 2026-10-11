import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentActivity } from '../../../../../shared/contracts/agent'
import { ActivityTimeline } from './ActivityTimeline'

describe('ActivityTimeline (Task 6.3)', () => {
  it('returns null when activities list is empty', () => {
    expect(renderToStaticMarkup(createElement(ActivityTimeline, { activities: [] }))).toBe('')
  })

  it('renders read activity with completed state', () => {
    const act: AgentActivity = {
      id: 'act-read-1',
      turnId: 'turn-1',
      operationId: null,
      stepSeq: 1,
      kind: 'read',
      state: 'completed',
      label: 'Đọc thông tin tra cứu',
      detail: { chaptersCount: 15 },
      createdAt: 1000,
      updatedAt: 1200
    }

    const html = renderToStaticMarkup(createElement(ActivityTimeline, { activities: [act] }))
    expect(html).toContain('Đọc thông tin tra cứu')
    expect(html).toContain('Hoàn tất')
    expect(html).toContain('Chi tiết')
  })

  it('renders translate progress from 1/7 to 7/7 batches', () => {
    const actPartial: AgentActivity = {
      id: 'act-trans-1',
      turnId: 'turn-1',
      operationId: 'op-1',
      stepSeq: 2,
      kind: 'write',
      state: 'running',
      label: 'Dịch chương "Mở màn" (1/7 đoạn)',
      detail: { applied: 1, total: 7 },
      createdAt: 1000,
      updatedAt: 1200
    }

    const html1 = renderToStaticMarkup(
      createElement(ActivityTimeline, { activities: [actPartial] })
    )
    expect(html1).toContain('(1/7 đoạn)')
    expect(html1).toContain('Đang chạy')

    const actFinished: AgentActivity = {
      ...actPartial,
      state: 'completed',
      label: 'Dịch chương "Mở màn" (7/7 đoạn)',
      detail: { applied: 7, total: 7 }
    }
    const html2 = renderToStaticMarkup(
      createElement(ActivityTimeline, { activities: [actFinished] })
    )
    expect(html2).toContain('(7/7 đoạn)')
    expect(html2).toContain('Hoàn tất')
  })

  it('renders conflict and cancel error states', () => {
    const actConflict: AgentActivity = {
      id: 'act-conflict',
      turnId: 'turn-1',
      operationId: 'op-1',
      stepSeq: 1,
      kind: 'write',
      state: 'failed',
      label: 'Xung đột phiên bản: chương đã được sửa đổi',
      detail: { error: 'conflict' },
      createdAt: 1000,
      updatedAt: 1100
    }

    const htmlConflict = renderToStaticMarkup(
      createElement(ActivityTimeline, { activities: [actConflict] })
    )
    expect(htmlConflict).toContain('Xung đột phiên bản')
    expect(htmlConflict).toContain('Lỗi')

    const actCancelled: AgentActivity = {
      id: 'act-cancelled',
      turnId: 'turn-2',
      operationId: 'op-2',
      stepSeq: 1,
      kind: 'write',
      state: 'cancelled',
      label: 'Đã dừng thao tác theo yêu cầu người dùng',
      detail: { error: 'cancelled' },
      createdAt: 1000,
      updatedAt: 1100
    }
    const htmlCancelled = renderToStaticMarkup(
      createElement(ActivityTimeline, { activities: [actCancelled] })
    )
    expect(htmlCancelled).toContain('Đã dừng thao tác')
    expect(htmlCancelled).toContain('Đã dừng')
  })

  it('restores history in stepSeq order regardless of input array ordering', () => {
    const acts: AgentActivity[] = [
      {
        id: 'act-3',
        turnId: 'turn-1',
        operationId: 'op-1',
        stepSeq: 3,
        kind: 'write',
        state: 'completed',
        label: 'Ghi bản dịch',
        detail: null,
        createdAt: 1000,
        updatedAt: 1300
      },
      {
        id: 'act-1',
        turnId: 'turn-1',
        operationId: null,
        stepSeq: 1,
        kind: 'resolve',
        state: 'completed',
        label: 'Xác định mục tiêu',
        detail: null,
        createdAt: 1000,
        updatedAt: 1100
      },
      {
        id: 'act-2',
        turnId: 'turn-1',
        operationId: null,
        stepSeq: 2,
        kind: 'read',
        state: 'completed',
        label: 'Đọc thuật ngữ',
        detail: null,
        createdAt: 1000,
        updatedAt: 1200
      }
    ]

    const html = renderToStaticMarkup(createElement(ActivityTimeline, { activities: acts }))
    const idx1 = html.indexOf('Xác định mục tiêu')
    const idx2 = html.indexOf('Đọc thuật ngữ')
    const idx3 = html.indexOf('Ghi bản dịch')

    expect(idx1).toBeLessThan(idx2)
    expect(idx2).toBeLessThan(idx3)
  })
})
