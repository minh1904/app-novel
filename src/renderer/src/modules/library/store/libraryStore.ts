import { create } from 'zustand'
import type {
  CreateWorkInput,
  WorkList,
  WorkPatch,
  WorkProblem,
  WorkSummary
} from '../../../../../shared/contracts/library'
import type { Result } from '../../../../../shared/contracts/result'
import { backupWork, savedMessage } from './backup'
import { describe, describeBackupError } from '../catalog/describeError'
import { CoverImageError, fileToCoverDataUrl } from '../catalog/coverImage'
import { toWork, type Work } from '../catalog/works'
import { registerStoreReset } from '../../../lib/testing/resetStores'

export type LibraryLoad = 'loading' | 'ready' | 'failed'

export interface LibraryState {
  load: LibraryLoad
  works: Work[]
  problems: WorkProblem[]
  loadError: string | null
  notice: string | null
  success: { message: string; workId?: string } | null

  // Các hành động (Actions)
  reload(): Promise<void>
  dismissNotice(): void
  dismissSuccess(): void
  create(input: CreateWorkInput): Promise<Result<Work>>
  update(work: Work, patch: WorkPatch): Promise<void>
  setCover(work: Work, file: File | null): Promise<void>
  applyWork(summary: WorkSummary): void
  backup(work: Work): Promise<void>
  restore(): Promise<void>
  reportNotice(message: string): void
  reset(): void
}

const initialValues = {
  load: 'loading' as LibraryLoad,
  works: [] as Work[],
  problems: [] as WorkProblem[],
  loadError: null as string | null,
  notice: null as string | null,
  success: null as { message: string; workId?: string } | null
}

let latestLoadTicket = 0

export const useLibraryStore = create<LibraryState>((set, get) => {
  function applyResult(result: Result<WorkList>): void {
    set(
      result.ok
        ? {
            load: 'ready',
            works: result.value.works.map(toWork),
            problems: result.value.problems,
            loadError: null
          }
        : {
            load: 'failed',
            loadError: describe(result.error)
          }
    )
  }

  return {
    ...initialValues,

    reload: async () => {
      const ticket = ++latestLoadTicket
      const result = await window.mira.works.list()
      if (ticket === latestLoadTicket) {
        applyResult(result)
      }
    },

    dismissNotice: () => {
      set({ notice: null })
    },

    dismissSuccess: () => {
      set({ success: null })
    },

    create: async (input: CreateWorkInput) => {
      const result = await window.mira.works.create(input)
      if (!result.ok) return result
      await get().reload()
      return { ok: true, value: toWork(result.value) }
    },

    update: async (work: Work, patch: WorkPatch) => {
      const result = await window.mira.works.update(work.id, patch)
      if (!result.ok) {
        set({
          notice: 'Không cập nhật được “' + work.title + '”: ' + describe(result.error)
        })
      }
      await get().reload()
    },

    setCover: async (work: Work, file: File | null) => {
      const fail = (reason: string): void => {
        set({
          notice: 'Không đổi được ảnh bìa của “' + work.title + '”: ' + reason
        })
      }

      let cover: string | null = null
      if (file) {
        try {
          cover = await fileToCoverDataUrl(file)
        } catch (error) {
          fail(error instanceof CoverImageError ? error.message : 'Không xử lý được ảnh này.')
          return
        }
      }
      const result = await window.mira.works.setCover(work.id, cover)
      if (!result.ok) {
        fail(describe(result.error))
      }
      await get().reload()
    },

    applyWork: (summary: WorkSummary) => {
      const next = toWork(summary)
      set((current) => ({
        works: current.works.some((work) => work.id === next.id)
          ? current.works.map((work) => (work.id === next.id ? next : work))
          : [...current.works, next]
      }))
    },

    backup: async (work: Work) => {
      const outcome = await backupWork(work.id)
      if (outcome.kind === 'saved') {
        set({
          notice: null,
          success: { message: savedMessage(outcome.path) }
        })
      } else if (outcome.kind === 'failed') {
        set({
          notice: 'Không sao lưu được “' + work.title + '”: ' + outcome.message
        })
      }
    },

    restore: async () => {
      const result = await window.mira.backup.restore()
      if (result.ok) {
        await get().reload()
        set({
          notice: null,
          success: {
            message: 'Đã khôi phục “' + result.value.title + '” thành tác phẩm mới.',
            workId: result.value.id
          }
        })
      } else if (result.error.code !== 'cancelled') {
        set({
          notice: 'Không khôi phục được: ' + describeBackupError(result.error)
        })
      }
    },

    reportNotice: (message: string) => {
      set({ notice: message })
    },

    reset: () => {
      latestLoadTicket = 0
      set({ ...initialValues })
    }
  }
})

registerStoreReset(() => {
  useLibraryStore.getState().reset()
})
