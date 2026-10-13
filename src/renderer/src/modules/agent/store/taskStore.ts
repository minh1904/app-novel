import { create } from 'zustand'
import type {
  AgentTaskChanged,
  AgentTaskCommand,
  AgentTaskDetailView,
  AgentTaskSummary
} from '../../../../../shared/contracts/agentTask'
import { registerStoreReset } from '../../../lib/testing/resetStores'

export interface TaskState {
  tasks: AgentTaskSummary[]
  /** Item lists of the tasks a person expanded; refreshed with the list. */
  details: Record<string, AgentTaskDetailView>
  load: 'idle' | 'loading' | 'ready' | 'failed'
  lastError: string | null
  /** The last state change, read out by the live region. */
  announcement: string
  refresh: () => Promise<void>
  expand: (taskId: string) => Promise<void>
  collapse: (taskId: string) => void
  control: (taskId: string, command: AgentTaskCommand, itemId?: string) => Promise<void>
  /** Subscribes to `agentTaskChanged` and refetches; returns the unsubscribe. */
  listen: () => () => void
  reset: () => void
}

const bridge = () => (typeof window === 'undefined' ? undefined : window.mira?.agent?.tasks)

export const TASK_STATE_LABELS: Record<AgentTaskSummary['state'], string> = {
  queued: 'Đang chờ',
  running: 'Đang chạy',
  pausing: 'Đang tạm dừng',
  paused: 'Tạm dừng',
  waiting_user: 'Chờ bạn',
  cancelling: 'Đang hủy',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
  partially_completed: 'Xong một phần',
  failed: 'Lỗi'
}

let listeners = 0
let unbind: (() => void) | null = null

/**
 * Tasks as Main has them: the store never changes a state itself, it sends a command with the version
 * it saw and refetches. Every window refetches on `agentTaskChanged`, so they agree.
 */
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  details: {},
  load: 'idle',
  lastError: null,
  announcement: '',

  refresh: async () => {
    const api = bridge()
    if (!api) return
    if (get().load === 'idle') set({ load: 'loading' })
    const res = await api.list()
    if (!res.ok) {
      set({ load: 'failed', lastError: res.error.message })
      return
    }
    const details: Record<string, AgentTaskDetailView> = {}
    for (const taskId of Object.keys(get().details)) {
      const detail = await api.get(taskId)
      if (detail.ok) details[taskId] = detail.value
    }
    set({ tasks: res.value.tasks, details, load: 'ready' })
  },

  expand: async (taskId) => {
    const res = await bridge()?.get(taskId)
    if (res?.ok) set((s) => ({ details: { ...s.details, [taskId]: res.value } }))
  },

  collapse: (taskId) =>
    set((s) => {
      const details = { ...s.details }
      delete details[taskId]
      return { details }
    }),

  control: async (taskId, command, itemId) => {
    const api = bridge()
    const task = get().tasks.find((item) => item.id === taskId)
    if (!api || !task) return
    set({ lastError: null })
    const res = await api.control({
      taskId,
      command,
      stateVersion: task.stateVersion,
      clientCommandId: crypto.randomUUID(),
      ...(itemId ? { itemId } : {})
    })
    if (!res.ok) set({ lastError: res.error.message })
    await get().refresh()
  },

  listen: () => {
    listeners++
    if (listeners === 1) {
      unbind =
        bridge()?.onChanged((event: AgentTaskChanged) => {
          const before = get().tasks.find((task) => task.id === event.taskId)
          if (before && before.state !== event.state) {
            set({
              announcement: `Tác vụ dịch ${before.workTitle}: ${TASK_STATE_LABELS[event.state]}.`
            })
          }
          void get().refresh()
        }) ?? null
    }
    return () => {
      listeners--
      if (listeners === 0) {
        unbind?.()
        unbind = null
      }
    }
  },

  reset: () => set({ tasks: [], details: {}, load: 'idle', lastError: null, announcement: '' })
}))

registerStoreReset(() => useTaskStore.getState().reset())
