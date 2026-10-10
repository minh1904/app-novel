import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkPatch, WorkSummary } from '../../../../../shared/contracts/library'
import type { Result } from '../../../../../shared/contracts/result'
import { CoverImageError, fileToCoverDataUrl } from '../../library/public'
import { describe } from '../../library/public'
import { toWork, type Work } from '../../library/public'

export type WorkDetailLoad = 'loading' | 'ready' | 'failed'

export interface WorkDetailController {
  load: WorkDetailLoad
  work: Work | null
  /** Why the work could not be opened, in words a user can act on. */
  loadError: string | null
  /** Last failed action, shown until dismissed. */
  notice: string | null
  dismissNotice(): void
  reportNotice(message: string): void
  reload(): Promise<void>
  /** Takes in a work returned by a chapter change so the header needs no second round trip. */
  applyWork(summary: WorkSummary): void
  /** Resolves to the saved work, or the error so the edit form can show field messages. */
  update(patch: WorkPatch): Promise<Result<Work>>
  setPaused(paused: boolean): Promise<void>
  setArchived(archived: boolean): Promise<void>
  /** Replaces the cover with `file`, or removes it when `file` is null. */
  setCover(file: File | null): Promise<void>
}

/**
 * The work shown in the header of the detail screen. It lives apart from the library list because
 * it is loaded per screen; `onChanged` lets the library take in every change made here.
 */
export function useWorkDetail(
  workId: string,
  onChanged?: (summary: WorkSummary) => void
): WorkDetailController {
  const [load, setLoad] = useState<WorkDetailLoad>('loading')
  const [work, setWork] = useState<Work | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Only the newest load may write state, so a slow reply never overwrites a fresher one.
  const latest = useRef(0)
  const changed = useRef(onChanged)
  useEffect(() => {
    changed.current = onChanged
  })

  const take = useCallback((summary: WorkSummary): Work => {
    const next = toWork(summary)
    setWork(next)
    setLoad('ready')
    setLoadError(null)
    changed.current?.(summary)
    return next
  }, [])

  const apply = useCallback(
    (result: Result<WorkSummary>): void => {
      if (result.ok) {
        take(result.value)
      } else {
        setLoad('failed')
        setLoadError(describe(result.error))
      }
    },
    [take]
  )

  const reload = useCallback(async (): Promise<void> => {
    const ticket = ++latest.current
    const result = await window.mira.works.get(workId)
    if (ticket === latest.current) apply(result)
  }, [workId, apply])

  useEffect(() => {
    const ticket = ++latest.current
    void window.mira.works.get(workId).then((result) => {
      if (ticket === latest.current) apply(result)
    })
  }, [workId, apply])

  const update = useCallback(
    async (patch: WorkPatch): Promise<Result<Work>> => {
      const result = await window.mira.works.update(workId, patch)
      if (!result.ok) return result
      return { ok: true, value: take(result.value) }
    },
    [workId, take]
  )

  const act = useCallback(
    async (patch: WorkPatch, failure: string): Promise<void> => {
      const result = await update(patch)
      if (!result.ok) setNotice(failure + ': ' + describe(result.error))
    },
    [update]
  )

  const setPaused = useCallback(
    (paused: boolean) =>
      act({ status: paused ? 'paused' : 'in-progress' }, 'Không đổi được trạng thái'),
    [act]
  )

  const setArchived = useCallback(
    (archived: boolean) => act({ archived }, 'Không đổi được trạng thái lưu trữ'),
    [act]
  )

  const setCover = useCallback(
    async (file: File | null): Promise<void> => {
      let cover: string | null = null
      if (file) {
        try {
          cover = await fileToCoverDataUrl(file)
        } catch (error) {
          setNotice(
            'Không đổi được ảnh bìa: ' +
              (error instanceof CoverImageError ? error.message : 'Không xử lý được ảnh này.')
          )
          return
        }
      }
      await act({ cover }, 'Không đổi được ảnh bìa')
    },
    [act]
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    load,
    work,
    loadError,
    notice,
    dismissNotice,
    reportNotice: setNotice,
    reload,
    applyWork: take,
    update,
    setPaused,
    setArchived,
    setCover
  }
}
