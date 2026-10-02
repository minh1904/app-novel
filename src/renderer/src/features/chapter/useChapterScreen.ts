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
  /** The translation, the same way: revision 0 and empty until something is saved. */
  target: TextRecord | null
  error: string | null
  reload(): Promise<void>
  /**
   * Changes whenever the source was replaced from outside the editor (import, replacement), which
   * is when the editor must be opened again on the new text.
   */
  epoch: number
  /**
   * Changes whenever the translation was rewritten from outside the editor (AI translating the
   * chapter), which is when the translation editor must be opened again on the new text.
   */
  targetEpoch: number
  /** Takes in a source that was just replaced, and refreshes the work so the library follows. */
  applySource(record: TextRecord): Promise<void>
  /** Takes in a translation rewritten from outside the editor, and reopens the editor on it. */
  applyTarget(record: TextRecord): Promise<void>
  /** The editor saved (or reloaded): the figures follow it, and the editor stays as it is. */
  noteSaved(record: TextRecord): Promise<void>
  /** The translation editor saved (or reloaded): the chapter and the work follow it. */
  noteTargetSaved(record: TextRecord): Promise<void>
}

interface Loaded {
  work: Work
  chapter: ChapterItem
  source: TextRecord
  target: TextRecord
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
  const [epoch, setEpoch] = useState(0)
  const [targetEpoch, setTargetEpoch] = useState(0)
  const latest = useRef(0)
  const changed = useRef(onWorkChanged)
  useEffect(() => {
    changed.current = onWorkChanged
  })

  const fetchAll = useCallback(async (): Promise<
    { ok: true; value: Loaded } | { ok: false; message: string }
  > => {
    const [work, chapters, source, target] = await Promise.all([
      window.mira.works.get(workId),
      window.mira.chapters.list(workId),
      window.mira.text.get(workId, chapterId, 'source'),
      window.mira.text.get(workId, chapterId, 'target')
    ])
    if (!work.ok) return { ok: false, message: describe(work.error) }
    if (!chapters.ok) return { ok: false, message: describeChapterError(chapters.error) }
    if (!source.ok) return { ok: false, message: describeChapterError(source.error) }
    if (!target.ok) return { ok: false, message: describeChapterError(target.error) }
    const chapter = chapters.value.chapters.find((item) => item.id === chapterId)
    if (!chapter) return { ok: false, message: 'Không tìm thấy chương này; có thể nó đã bị xóa.' }
    return {
      ok: true,
      value: { work: toWork(work.value), chapter, source: source.value, target: target.value }
    }
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

  const takeSource = useCallback(
    async (record: TextRecord, replaced: boolean): Promise<void> => {
      if (replaced) setEpoch((value) => value + 1)
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
  const applySource = useCallback((record: TextRecord) => takeSource(record, true), [takeSource])
  const noteSaved = useCallback((record: TextRecord) => takeSource(record, false), [takeSource])
  const takeTarget = useCallback(
    async (record: TextRecord, replaced: boolean): Promise<void> => {
      if (replaced) setTargetEpoch((value) => value + 1)
      setData((current) =>
        current
          ? {
              ...current,
              target: record,
              chapter: { ...current.chapter, hasTarget: record.content !== '' }
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
  const noteTargetSaved = useCallback(
    (record: TextRecord) => takeTarget(record, false),
    [takeTarget]
  )
  const applyTarget = useCallback((record: TextRecord) => takeTarget(record, true), [takeTarget])

  return {
    load,
    work: data?.work ?? null,
    chapter: data?.chapter ?? null,
    source: data?.source ?? null,
    target: data?.target ?? null,
    error,
    reload,
    epoch,
    targetEpoch,
    applySource,
    applyTarget,
    noteSaved,
    noteTargetSaved
  }
}
