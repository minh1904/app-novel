import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LinkRecord } from '../../../../shared/contracts/links'
import { buildRows, normalizeRowText, type RowsView } from '../../../../shared/contracts/rows'
import type { TextRecord } from '../../../../shared/contracts/text'
import { describe } from '../library/describeError'

/**
 * The rows of the sentence mode over what the store holds: the source, the translation, and the
 * links. Writes are one at a time, each with the revision the last one returned, so pressing
 * Enter down a column never conflicts with itself; what the user has typed stays in the cell
 * until the store has taken it.
 */

export interface RowProblem {
  kind: 'error' | 'conflict'
  message: string
}

export interface SentenceRows {
  view: RowsView
  /** The translation revision the screen currently holds. */
  targetRev: number
  loading: boolean
  loadError: string | null
  drafts: ReadonlyMap<string, string>
  problems: ReadonlyMap<string, RowProblem>
  saving: ReadonlySet<string>
  /** Something said about the last pairing or review, for the screen to announce. */
  notice: string | null
  setDraft(sourceId: string, text: string): void
  /** Writes the draft of a row if it differs from what the row has; true when nothing is wrong. */
  commit(sourceId: string): Promise<boolean>
  /** Writes every draft that differs; true when none of them failed. */
  commitAll(): Promise<boolean>
  review(sourceId: string): Promise<boolean>
  autoPair(): Promise<void>
  /** Reads the translation and the links again, dropping the drafts. */
  reload(): Promise<void>
  hasDrafts(): boolean
  /** The rows as they are right now, including what the last write returned. */
  getView(): RowsView
}

export function useSentenceRows(
  workId: string,
  chapterId: string,
  source: TextRecord,
  initialTarget: TextRecord,
  onTargetChanged: (target: TextRecord) => void
): SentenceRows {
  const [target, setTarget] = useState(initialTarget)
  const [links, setLinks] = useState<LinkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ReadonlyMap<string, string>>(new Map())
  const [problems, setProblems] = useState<ReadonlyMap<string, RowProblem>>(new Map())
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const targetRef = useRef(initialTarget)
  const linksRef = useRef<LinkRecord[]>([])
  const takeLinks = useCallback((next: LinkRecord[]): void => {
    linksRef.current = next
    setLinks(next)
  }, [])
  const draftsRef = useRef(drafts)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const changed = useRef(onTargetChanged)
  useEffect(() => {
    changed.current = onTargetChanged
  })

  const view = useMemo(() => buildRows(source, target, links), [source, target, links])
  const getView = useCallback(
    (): RowsView => buildRows(source, targetRef.current, linksRef.current),
    [source]
  )

  const setDraftMap = useCallback((next: Map<string, string>) => {
    draftsRef.current = next
    setDrafts(next)
  }, [])

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    const [text, linkResult] = await Promise.all([
      window.mira.text.get(workId, chapterId, 'target'),
      window.mira.rows.links(workId, chapterId)
    ])
    const failure = !text.ok ? text.error : !linkResult.ok ? linkResult.error : null
    if (failure || !text.ok || !linkResult.ok) {
      setLoadError(failure ? describe(failure) : null)
    } else {
      setLoadError(null)
      targetRef.current = text.value
      setTarget(text.value)
      takeLinks(linkResult.value.links)
      setDraftMap(new Map())
      setProblems(new Map())
      changed.current(text.value)
    }
    setLoading(false)
  }, [workId, chapterId, setDraftMap, takeLinks])

  // The translation and the links are read fresh when the mode opens, whatever the screen held.
  useEffect(() => {
    void reload()
  }, [reload])

  const setProblem = (sourceId: string, problem: RowProblem | null): void => {
    setProblems((current) => {
      const next = new Map(current)
      if (problem) next.set(sourceId, problem)
      else next.delete(sourceId)
      return next
    })
  }

  const setBusy = (sourceId: string, busy: boolean): void => {
    setSaving((current) => {
      const next = new Set(current)
      if (busy) next.add(sourceId)
      else next.delete(sourceId)
      return next
    })
  }

  const setDraft = useCallback(
    (sourceId: string, text: string): void => {
      const next = new Map(draftsRef.current)
      next.set(sourceId, text)
      setDraftMap(next)
    },
    [setDraftMap]
  )

  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const run = chain.current.then(job, job)
    chain.current = run.catch(() => undefined)
    return run
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: enqueue and the setters are stable in effect: they only touch refs and state setters.
  const commit = useCallback(
    (sourceId: string): Promise<boolean> =>
      enqueue(async () => {
        const draft = draftsRef.current.get(sourceId)
        const row = getView().rows.find((item) => item.sourceId === sourceId)
        if (draft === undefined || !row) return true
        const text = normalizeRowText(draft)
        if (text === row.targetText) {
          const next = new Map(draftsRef.current)
          next.delete(sourceId)
          setDraftMap(next)
          return true
        }
        setBusy(sourceId, true)
        const result = await window.mira.rows.save(
          workId,
          chapterId,
          sourceId,
          text,
          targetRef.current.rev
        )
        setBusy(sourceId, false)
        if (!result.ok) {
          setProblem(sourceId, {
            kind: result.error.code === 'conflict' ? 'conflict' : 'error',
            message: describe(result.error)
          })
          return false
        }
        targetRef.current = result.value.target
        setTarget(result.value.target)
        takeLinks(result.value.links)
        setProblem(sourceId, null)
        const next = new Map(draftsRef.current)
        next.delete(sourceId)
        setDraftMap(next)
        changed.current(result.value.target)
        return true
      }),
    [workId, chapterId, setDraftMap]
  )

  const commitAll = useCallback(async (): Promise<boolean> => {
    let ok = true
    for (const sourceId of [...draftsRef.current.keys()]) {
      if (!(await commit(sourceId))) ok = false
    }
    return ok
  }, [commit])

  // biome-ignore lint/correctness/useExhaustiveDependencies: enqueue and the setters only touch refs and state setters, as in save above
  const review = useCallback(
    (sourceId: string): Promise<boolean> =>
      enqueue(async () => {
        const result = await window.mira.rows.review(workId, chapterId, sourceId)
        if (!result.ok) {
          setProblem(sourceId, { kind: 'error', message: describe(result.error) })
          return false
        }
        takeLinks(result.value.links)
        setProblem(sourceId, null)
        return true
      }),
    [workId, chapterId]
  )

  const autoPair = useCallback(async (): Promise<void> => {
    const result = await window.mira.rows.autoPair(workId, chapterId)
    if (!result.ok) {
      setNotice('Không ghép được: ' + describe(result.error))
      return
    }
    takeLinks(result.value.links)
    setNotice(
      result.value.paired === 0
        ? 'Không có cặp nào để ghép.'
        : 'Đã ghép ' +
            result.value.paired.toLocaleString('vi') +
            ' cặp theo thứ tự. Các hàng đó cần được kiểm tra.'
    )
  }, [workId, chapterId, takeLinks])

  return {
    view,
    targetRev: target.rev,
    loading,
    loadError,
    drafts,
    problems,
    saving,
    notice,
    setDraft,
    commit,
    commitAll,
    review,
    autoPair,
    reload,
    hasDrafts: () => draftsRef.current.size > 0,
    getView
  }
}
