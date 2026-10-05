import { create } from 'zustand'
import type { ChapterItem } from '../../../shared/contracts/chapters'
import type { WorkSummary } from '../../../shared/contracts/library'
import type { IpcError, Result } from '../../../shared/contracts/result'
import { registerStoreReset } from './resetStores'
import { useLibraryStore } from './libraryStore'

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

export const useChapterStore = create<ChapterState>((set, get) => {
  const runAction = async <T>(
    failure: string,
    call: () => Promise<Result<T>>,
    apply: (value: T) => void
  ): Promise<Result<T>> => {
    const result = await call()
    if (result.ok) {
      apply(result.value)
    } else {
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
      set({ workId, load: 'loading', chapters: [], loadError: null, notice: null })
      await get().reload()
    },

    reload: async () => {
      const { workId } = get()
      if (!workId) return

      const ticket = ++latestLoadTicket
      const result = await window.mira.chapters.list(workId)
      if (ticket !== latestLoadTicket) return

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
      set({ ...initialValues })
    }
  }
})

registerStoreReset(() => {
  useChapterStore.getState().reset()
})
