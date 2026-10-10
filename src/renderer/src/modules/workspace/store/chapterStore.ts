import { create } from 'zustand'
import type { ChapterItem } from '../../../../../shared/contracts/chapters'
import type { WorkSummary } from '../../../../../shared/contracts/library'
import type { IpcError, Result } from '../../../../../shared/contracts/result'
import { registerStoreReset } from '../../../lib/testing/resetStores'
import { useLibraryStore } from '../../library/public'

export type ChaptersLoad = 'loading' | 'ready' | 'failed'

export function describeChapterError(error: IpcError): string {
  switch (error.code) {
    case 'not_found':
      return 'Không tìm thấy chương hoặc tác phẩm; có thể danh sách đã đổi hoặc tệp đã bị xóa.'
    case 'corrupt':
      return 'Dữ liệu bị hỏng. ' + error.message
    case 'io':
      return 'Không đọc hoặc ghi được tệp. ' + error.message
    default:
      return error.message
  }
}

export interface ChapterState {
  workId: string | null
  load: ChaptersLoad
  chapters: ChapterItem[]
  loadError: string | null
  notice: string | null

  // Actions
  initWork(workId: string): Promise<void>
  reload(): Promise<void>
  dismissNotice(): void
  create(title?: string): Promise<Result<ChapterItem>>
  rename(chapterId: string, title: string): Promise<Result<ChapterItem>>
  move(chapterId: string, to: number): Promise<Result<ChapterItem[]>>
  remove(chapterId: string): Promise<Result<ChapterItem[]>>
  open(chapterId: string): Promise<Result<WorkSummary>>
  reset(): void
}

const initialValues = {
  workId: null as string | null,
  load: 'loading' as ChaptersLoad,
  chapters: [] as ChapterItem[],
  loadError: null as string | null,
  notice: null as string | null
}

let latestLoadTicket = 0
type ChapterSnapshot = Pick<ChapterState, 'load' | 'chapters' | 'loadError' | 'notice'>
const otherWorkChapters = new Map<string, ChapterSnapshot>()

function snapshot(state: ChapterState): ChapterSnapshot {
  return {
    load: state.load,
    chapters: state.chapters,
    loadError: state.loadError,
    notice: state.notice
  }
}

export const useChapterStore = create<ChapterState>((set, get) => {
  const runAction = async <T>(
    workId: string,
    failure: string,
    call: () => Promise<Result<T>>,
    apply: (value: T) => void
  ): Promise<Result<T>> => {
    const result = await call()
    if (result.ok) {
      if (get().workId === workId) apply(result.value)
      else {
        const cached = otherWorkChapters.get(workId)
        if (cached) otherWorkChapters.set(workId, { ...cached, load: 'loading' })
      }
    } else if (get().workId === workId) {
      set({ notice: failure + ': ' + describeChapterError(result.error) })
    }
    return result
  }

  return {
    ...initialValues,

    initWork: async (workId: string) => {
      const current = get()
      if (current.workId === workId && current.load === 'ready') {
        return
      }
      if (current.workId && current.workId !== workId)
        otherWorkChapters.set(current.workId, snapshot(current))
      const cached = otherWorkChapters.get(workId)
      otherWorkChapters.delete(workId)
      set({
        workId,
        ...(cached ?? {
          load: 'loading',
          chapters: [],
          loadError: null,
          notice: null
        })
      })
      if (cached?.load === 'ready') return
      await get().reload()
    },

    reload: async () => {
      const { workId } = get()
      if (!workId) return

      const ticket = ++latestLoadTicket
      const result = await window.mira.chapters.list(workId)
      if (ticket !== latestLoadTicket || get().workId !== workId) return

      if (result.ok) {
        set({
          chapters: result.value.chapters,
          load: 'ready',
          loadError: null
        })
      } else {
        set({
          load: 'failed',
          loadError: describeChapterError(result.error)
        })
      }
    },

    dismissNotice: () => {
      set({ notice: null })
    },

    create: async (title?: string) => {
      const { workId } = get()
      if (!workId) {
        return { ok: false, error: { code: 'not_found', message: 'No active work' } }
      }

      const result = await runAction(
        workId,
        'Không thêm được chương',
        () => window.mira.chapters.create(workId, title),
        ({ work, chapter }) => {
          latestLoadTicket++
          set((state) => ({ chapters: [...state.chapters, chapter] }))
          useLibraryStore.getState().applyWork(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapter } : result
    },

    rename: async (chapterId: string, title: string) => {
      const { workId } = get()
      if (!workId) {
        return { ok: false, error: { code: 'not_found', message: 'No active work' } }
      }

      const result = await runAction(
        workId,
        'Không đổi được tên chương',
        () => window.mira.chapters.rename(workId, chapterId, title),
        ({ work, chapter }) => {
          latestLoadTicket++
          set((state) => ({
            chapters: state.chapters.map((item) => (item.id === chapter.id ? chapter : item))
          }))
          useLibraryStore.getState().applyWork(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapter } : result
    },

    move: async (chapterId: string, to: number) => {
      const { workId } = get()
      if (!workId) {
        return { ok: false, error: { code: 'not_found', message: 'No active work' } }
      }

      const result = await runAction(
        workId,
        'Không chuyển được chương',
        () => window.mira.chapters.move(workId, chapterId, to),
        ({ work, chapters }) => {
          latestLoadTicket++
          set({ chapters })
          useLibraryStore.getState().applyWork(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapters } : result
    },

    remove: async (chapterId: string) => {
      const { workId } = get()
      if (!workId) {
        return { ok: false, error: { code: 'not_found', message: 'No active work' } }
      }

      const result = await runAction(
        workId,
        'Không xóa được chương',
        () => window.mira.chapters.delete(workId, chapterId),
        ({ work, chapters }) => {
          latestLoadTicket++
          set({ chapters })
          useLibraryStore.getState().applyWork(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapters } : result
    },

    open: async (chapterId: string) => {
      const { workId } = get()
      if (!workId) {
        return { ok: false, error: { code: 'not_found', message: 'No active work' } }
      }

      const result = await runAction(
        workId,
        'Không mở được chương',
        () => window.mira.chapters.open(workId, chapterId),
        ({ work }) => {
          useLibraryStore.getState().applyWork(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.work } : result
    },

    reset: () => {
      latestLoadTicket = 0
      otherWorkChapters.clear()
      set({ ...initialValues })
    }
  }
})

registerStoreReset(() => {
  useChapterStore.getState().reset()
})
