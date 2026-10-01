import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChapterItem } from '../../../../shared/chapters'
import type { WorkSummary } from '../../../../shared/library'
import type { TextRecord } from '../../../../shared/text'
import { describe } from '../library/describeError'
import { toWork, type Work } from '../library/works'
import { describeChapterError } from '../work/useChapters'

export type ChapterScreenLoad = 'loading' | 'ready' | 'failed'

export interface ChapterScreenController {
  load: ChapterScreenLoad
  work: Work | null
  chapter: ChapterItem | null
  /** The source text with its segments; revision 0 and empty when never imported. */
  source: TextRecord | null
  error: string | null
  reload(): Promise<void>
  /** Takes in a source that was just saved, and refreshes the work so the library follows. */
  applySource(record: TextRecord): Promise<void>
}

interface Loaded {
  work: Work
  chapter: ChapterItem
  source: TextRecord
}

/** Everything the chapter screen shows: the work (for its language), the chapter and its source. */
export function useChapterScreen(
  workId: string,
  chapterId: string,
  onWorkChanged: (summary: WorkSummary) => void
): ChapterScreenController {
  const [load, setLoad] = useState<ChapterScreenLoad>('loading')
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)
  const changed = useRef(onWorkChanged)
  useEffect(() => {
    changed.current = onWorkChanged
  })

  const fetchAll = useCallback(async (): Promise<
    { ok: true; value: Loaded } | { ok: false; message: string }
  > => {
    const [work, chapters, source] = await Promise.all([
      window.mira.works.get(workId),
      window.mira.chapters.list(workId),
      window.mira.text.get(workId, chapterId, 'source')
    ])
    if (!work.ok) return { ok: false, message: describe(work.error) }
    if (!chapters.ok) return { ok: false, message: describeChapterError(chapters.error) }
    if (!source.ok) return { ok: false, message: describeChapterError(source.error) }
    const chapter = chapters.value.chapters.find((item) => item.id === chapterId)
    if (!chapter) return { ok: false, message: 'Không tìm thấy chương này; có thể nó đã bị xóa.' }
    return { ok: true, value: { work: toWork(work.value), chapter, source: source.value } }
  }, [workId, chapterId])

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchAll>>): void => {
    if (result.ok) {
      setData(result.value)
      setLoad('ready')
      setError(null)
    } else {
      setLoad('failed')
      setError(result.message)
    }
  }, [])

  const reload = useCallback(async (): Promise<void> => {
    const ticket = ++latest.current
    const result = await fetchAll()
    if (ticket === latest.current) apply(result)
  }, [fetchAll, apply])

  useEffect(() => {
    const ticket = ++latest.current
    void fetchAll().then((result) => {
      if (ticket === latest.current) apply(result)
    })
  }, [fetchAll, apply])

  const applySource = useCallback(
    async (record: TextRecord): Promise<void> => {
      setData((current) =>
        current
          ? {
              ...current,
              source: record,
              chapter: { ...current.chapter, hasSource: record.content !== '' }
            }
          : current
      )
      const work = await window.mira.works.get(workId)
      if (work.ok) {
        changed.current(work.value)
        setData((current) => (current ? { ...current, work: toWork(work.value) } : current))
      }
    },
    [workId]
  )

  return {
    load,
    work: data?.work ?? null,
    chapter: data?.chapter ?? null,
    source: data?.source ?? null,
    error,
    reload,
    applySource
  }
}
