import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentTaskChanged, AgentTaskSummary } from '../../../../../shared/contracts/agentTask'
import { resetAllStores } from '../../../lib/testing/resetStores'
import { useTaskStore } from '../store/taskStore'
import { TaskList } from './TaskList'

const summary = (patch: Partial<AgentTaskSummary> = {}): AgentTaskSummary => ({
  id: 'k1',
  kind: 'translate_chapters',
  workId: 'w1',
  originTurnId: null,
  sourceTaskId: null,
  state: 'partially_completed',
  reason: null,
  model: { connectionId: 'c', entryId: 'e', settingsKey: 's' },
  overwritePolicy: 'fill_untranslated',
  options: {},
  budget: {},
  stateVersion: 7,
  createdAt: 1,
  updatedAt: 2,
  workTitle: 'Kiếm Lai',
  modelLabel: 'Gemini · Flash',
  counts: {
    queued: 0,
    running: 0,
    waiting_user: 0,
    completed: 29,
    failed: 1,
    skipped: 0,
    cancelled: 0
  },
  usage: null,
  ...patch
})

/** Server rendering reads zustand's initial state, so copy the live state into it first. */
function render(): string {
  Object.assign(useTaskStore.getInitialState(), useTaskStore.getState())
  return renderToStaticMarkup(createElement(TaskList, { onOpenChapter: () => {} }))
}

function bridge(tasks: AgentTaskSummary[]) {
  let changed: (event: AgentTaskChanged) => void = () => {}
  const api = {
    list: vi.fn(async () => ({ ok: true, value: { tasks } })),
    get: vi.fn(),
    create: vi.fn(),
    control: vi.fn(async () => ({ ok: true, value: tasks[0] })),
    onChanged: vi.fn((listener: (event: AgentTaskChanged) => void) => {
      changed = listener
      return () => {}
    })
  }
  ;(globalThis as unknown as { window: unknown }).window = { mira: { agent: { tasks: api } } }
  return { api, emit: (event: AgentTaskChanged) => changed(event) }
}

describe('TaskList', () => {
  beforeEach(() => resetAllStores())
  afterEach(() => {
    ;(globalThis as unknown as { window?: unknown }).window = undefined
  })

  it('shows 29 of 30 as partially done with the failed chapter, never as all done', async () => {
    bridge([summary()])
    await useTaskStore.getState().refresh()
    const html = render()
    expect(html).toContain('Xong một phần')
    expect(html).toContain('29/30 chương · 1 lỗi')
    expect(html).not.toContain('30/30')
    expect(html).toContain('aria-label="Tác vụ dịch Kiếm Lai: 29/30 chương · 1 lỗi"')
    expect(html).toContain('Thử lại mục lỗi')
    expect(html).not.toContain('Tạm dừng')
    expect(html).toContain('— (Provider không báo lượng dùng)')
    expect(html).toContain('aria-live="polite"')
  })

  it('offers only the controls a running task accepts', async () => {
    bridge([summary({ state: 'running' })])
    await useTaskStore.getState().refresh()
    const html = render()
    expect(html).toContain('Tạm dừng')
    expect(html).toContain('Hủy')
    expect(html).not.toContain('Thử lại')
    expect(html).not.toContain('Tiếp tục')
  })

  it('offers "Xem và duyệt" on a task waiting for context review', async () => {
    bridge([summary({ state: 'waiting_user', reason: 'context_review' })])
    await useTaskStore.getState().refresh()
    Object.assign(useTaskStore.getInitialState(), useTaskStore.getState())
    const html = renderToStaticMarkup(
      createElement(TaskList, { onOpenChapter: () => {}, onReviewContext: () => {} })
    )
    expect(html).toContain('Xem và duyệt')
    expect(html).toContain('cần duyệt ngữ cảnh')
    expect(render()).not.toContain('Xem và duyệt')
  })

  it('sends commands with the version it saw and refetches and announces on a change event', async () => {
    const { api, emit } = bridge([summary({ state: 'running' })])
    await useTaskStore.getState().refresh()
    const stop = useTaskStore.getState().listen()
    await useTaskStore.getState().control('k1', 'pause')
    expect(api.control).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'k1', command: 'pause', stateVersion: 7 })
    )
    const calls = api.list.mock.calls.length
    emit({ taskId: 'k1', workId: 'w1', state: 'paused', stateVersion: 8 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.list.mock.calls.length).toBe(calls + 1)
    expect(useTaskStore.getState().announcement).toBe('Tác vụ dịch Kiếm Lai: Tạm dừng.')
    stop()
  })
})
