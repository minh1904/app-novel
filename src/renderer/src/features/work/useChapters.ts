import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { WorkSummary } from '../../../../shared/contracts/library'
import type { IpcError, Result } from '../../../../shared/contracts/result'

export type ChaptersLoad = 'loading' | 'ready' | 'failed'

export interface ChaptersController {
  load: ChaptersLoad
  chapters: ChapterItem[]
  loadError: string | null
  /** Last failed action, shown until dismissed. */
  notice: string | null
  dismissNotice(): void
  reload(): Promise<void>
  create(title?: string): Promise<Result<ChapterItem>>
  rename(chapterId: string, title: string): Promise<Result<ChapterItem>>
  /** `to` is the 1-based position the chapter should end up at. */
  move(chapterId: string, to: number): Promise<Result<ChapterItem[]>>
  remove(chapterId: string): Promise<Result<ChapterItem[]>>
  /** Records the chapter as the one being worked on and resolves to the updated work. */
  open(chapterId: string): Promise<Result<WorkSummary>>
}

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

/**
 * The chapters of one work. Every change returns the new work summary through `onWork`, so the
 * header and library update from the same reply that updates the list.
 */
export function useChapters(
  workId: string,
  onWork: (summary: WorkSummary) => void
): ChaptersController {
  const [load, setLoad] = useState<ChaptersLoad>('loading')
  const [chapters, setChapters] = useState<ChapterItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const latest = useRef(0)
  const onWorkRef = useRef(onWork)
  useEffect(() => {
    onWorkRef.current = onWork
  })

  const apply = useCallback((result: Result<{ chapters: ChapterItem[] }>): void => {
    if (result.ok) {
      setChapters(result.value.chapters)
      setLoad('ready')
      setLoadError(null)
    } else {
      setLoad('failed')
      setLoadError(describeChapterError(result.error))
    }
  }, [])

  const reload = useCallback(async (): Promise<void> => {
    const ticket = ++latest.current
    const result = await window.mira.chapters.list(workId)
    if (ticket === latest.current) apply(result)
  }, [workId, apply])

  useEffect(() => {
    const ticket = ++latest.current
    void window.mira.chapters.list(workId).then((result) => {
      if (ticket === latest.current) apply(result)
    })
  }, [workId, apply])

  /** Runs a change; on failure shows why and leaves the list as it is. */
  const run = useCallback(
    async <T>(
      failure: string,
      call: () => Promise<Result<T>>,
      apply: (value: T) => void
    ): Promise<Result<T>> => {
      const result = await call()
      if (result.ok) {
        apply(result.value)
      } else {
        setNotice(failure + ': ' + describeChapterError(result.error))
      }
      return result
    },
    []
  )

  const create = useCallback(
    async (title?: string): Promise<Result<ChapterItem>> => {
      const result = await run(
        'Không thêm được chương',
        () => window.mira.chapters.create(workId, title),
        ({ work, chapter }) => {
          // Cancel older reloads: their answer may predate this chapter.
          latest.current++
          setChapters((current) => [...current, chapter])
          onWorkRef.current(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapter } : result
    },
    [workId, run]
  )

  const rename = useCallback(
    async (chapterId: string, title: string): Promise<Result<ChapterItem>> => {
      const result = await run(
        'Không đổi được tên chương',
        () => window.mira.chapters.rename(workId, chapterId, title),
        ({ work, chapter }) => {
          latest.current++
          setChapters((current) => current.map((item) => (item.id === chapter.id ? chapter : item)))
          onWorkRef.current(work)
        }
      )
      return result.ok ? { ok: true, value: result.value.chapter } : result
    },
    [workId, run]
  )

  const replaceAll = useCallback(
    ({ work, chapters: next }: { work: WorkSummary; chapters: ChapterItem[] }) => {
      latest.current++
      setChapters(next)
      onWorkRef.current(work)
    },
    []
  )

  const move = useCallback(
    async (chapterId: string, to: number): Promise<Result<ChapterItem[]>> => {
      const result = await run(
        'Không chuyển được chương',
        () => window.mira.chapters.move(workId, chapterId, to),
        replaceAll
      )
      return result.ok ? { ok: true, value: result.value.chapters } : result
    },
    [workId, run, replaceAll]
  )

  const remove = useCallback(
    async (chapterId: string): Promise<Result<ChapterItem[]>> => {
      const result = await run(
        'Không xóa được chương',
        () => window.mira.chapters.delete(workId, chapterId),
        replaceAll
      )
      return result.ok ? { ok: true, value: result.value.chapters } : result
    },
    [workId, run, replaceAll]
  )

  const open = useCallback(
    async (chapterId: string): Promise<Result<WorkSummary>> => {
      const result = await run(
        'Không mở được chương',
        () => window.mira.chapters.open(workId, chapterId),
        ({ work }) => onWorkRef.current(work)
      )
      return result.ok ? { ok: true, value: result.value.work } : result
    },
    [workId, run]
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    load,
    chapters,
    loadError,
    notice,
    dismissNotice,
    reload,
    create,
    rename,
    move,
    remove,
    open
  }
}
