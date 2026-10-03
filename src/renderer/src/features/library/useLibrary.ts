import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CreateWorkInput,
  WorkList,
  WorkPatch,
  WorkProblem,
  WorkSummary
} from '../../../../shared/contracts/library'
import type { Result } from '../../../../shared/contracts/result'
import { backupWork, savedMessage } from '../work/backup'
import { describe, describeBackupError } from './describeError'
import { CoverImageError, fileToCoverDataUrl } from './coverImage'
import { toWork, type Work } from './works'

export type LibraryLoad = 'loading' | 'ready' | 'failed'

export interface LibraryState {
  load: LibraryLoad
  works: Work[]
  /** Work files on disk that could not be opened; the rest of the library still works. */
  problems: WorkProblem[]
  /** Set when the initial load fails. */
  loadError: string | null
  /** Last failed action, shown until dismissed. */
  notice: string | null
  /** Last thing that worked and is worth confirming (a backup, a restore). */
  success: { message: string; workId?: string } | null
}

export interface LibraryController extends LibraryState {
  reload(): Promise<void>
  dismissNotice(): void
  /** Resolves to the created work, or the error so a form can show field messages. */
  create(input: CreateWorkInput): Promise<Result<Work>>
  update(work: Work, patch: WorkPatch): Promise<void>
  /** Replaces the cover with `file`, or removes it when `file` is null. */
  setCover(work: Work, file: File | null): Promise<void>
  /** Puts a work that changed elsewhere (the detail screen) into the list without a round trip. */
  applyWork(summary: WorkSummary): void
  /** Backs the work up through the system dialog; cancelling says nothing. */
  backup(work: Work): Promise<void>
  /** Adds a backup chosen in the system dialog as a new work. */
  restore(): Promise<void>
  dismissSuccess(): void
  /** Shows a failure that happened outside the library's own actions. */
  reportNotice(message: string): void
}

const initial: LibraryState = {
  load: 'loading',
  works: [],
  problems: [],
  loadError: null,
  notice: null,
  success: null
}

export function useLibrary(): LibraryController {
  const [state, setState] = useState<LibraryState>(initial)
  // Only the newest load may write state, so a slow reply never overwrites a fresher one.
  const latest = useRef(0)

  const apply = useCallback((result: Result<WorkList>): void => {
    setState((current) =>
      result.ok
        ? {
            ...current,
            load: 'ready',
            works: result.value.works.map(toWork),
            problems: result.value.problems,
            loadError: null
          }
        : { ...current, load: 'failed', loadError: describe(result.error) }
    )
  }, [])

  const reload = useCallback(async (): Promise<void> => {
    const ticket = ++latest.current
    const result = await window.mira.works.list()
    if (ticket === latest.current) apply(result)
  }, [apply])

  useEffect(() => {
    const ticket = ++latest.current
    void window.mira.works.list().then((result) => {
      if (ticket === latest.current) apply(result)
    })
  }, [apply])

  const create = useCallback(
    async (input: CreateWorkInput): Promise<Result<Work>> => {
      const result = await window.mira.works.create(input)
      if (!result.ok) return result
      await reload()
      return { ok: true, value: toWork(result.value) }
    },
    [reload]
  )

  const update = useCallback(
    async (work: Work, patch: WorkPatch): Promise<void> => {
      const result = await window.mira.works.update(work.id, patch)
      if (!result.ok) {
        setState((current) => ({
          ...current,
          notice: 'Không cập nhật được “' + work.title + '”: ' + describe(result.error)
        }))
      }
      // Reload either way: on failure it restores what is really on disk.
      await reload()
    },
    [reload]
  )

  const setCover = useCallback(
    async (work: Work, file: File | null): Promise<void> => {
      const fail = (reason: string): void =>
        setState((current) => ({
          ...current,
          notice: 'Không đổi được ảnh bìa của “' + work.title + '”: ' + reason
        }))

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
      if (!result.ok) fail(describe(result.error))
      await reload()
    },
    [reload]
  )

  const dismissNotice = useCallback(() => setState((current) => ({ ...current, notice: null })), [])

  const backup = useCallback(async (work: Work): Promise<void> => {
    const outcome = await backupWork(work.id)
    if (outcome.kind === 'saved') {
      setState((current) => ({
        ...current,
        notice: null,
        success: { message: savedMessage(outcome.path) }
      }))
    } else if (outcome.kind === 'failed') {
      setState((current) => ({
        ...current,
        notice: 'Không sao lưu được “' + work.title + '”: ' + outcome.message
      }))
    }
  }, [])

  const restore = useCallback(async (): Promise<void> => {
    const result = await window.mira.backup.restore()
    if (result.ok) {
      await reload()
      setState((current) => ({
        ...current,
        notice: null,
        success: {
          message: 'Đã khôi phục “' + result.value.title + '” thành tác phẩm mới.',
          workId: result.value.id
        }
      }))
    } else if (result.error.code !== 'cancelled') {
      setState((current) => ({
        ...current,
        notice: 'Không khôi phục được: ' + describeBackupError(result.error)
      }))
    }
  }, [reload])

  const dismissSuccess = useCallback(
    () => setState((current) => ({ ...current, success: null })),
    []
  )

  const applyWork = useCallback((summary: WorkSummary): void => {
    const next = toWork(summary)
    setState((current) => ({
      ...current,
      works: current.works.some((work) => work.id === next.id)
        ? current.works.map((work) => (work.id === next.id ? next : work))
        : [...current.works, next]
    }))
  }, [])

  const reportNotice = useCallback(
    (message: string): void => setState((current) => ({ ...current, notice: message })),
    []
  )

  return {
    ...state,
    reload,
    dismissNotice,
    create,
    update,
    setCover,
    applyWork,
    reportNotice,
    backup,
    restore,
    dismissSuccess
  }
}

export { describe }
