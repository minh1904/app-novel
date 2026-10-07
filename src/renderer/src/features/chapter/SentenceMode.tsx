import {
  memo,
  useCallback,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type Ref
} from 'react'
import type { Row, RowState } from '../../../../shared/contracts/rows'
import type { TextRecord } from '../../../../shared/contracts/text'
import { Button } from '../../components/Button'
import { clampPage, pageOfPosition, pageCount, slicePage } from '../work/chapterList'
import { ChapterPager } from '../work/ChapterPager'
import { SentenceFilterToolbarMock, SentenceSuggestionPanelMock } from './SentenceModeMocks'
import { useSentenceRows, type RowProblem } from './useSentenceRows'

export const ROWS_PER_PAGE = 50

const STATE_LABEL: Record<RowState, string> = {
  untranslated: 'Chưa dịch',
  ai: 'AI đã dịch',
  reviewed: 'Đã soát',
  check: 'Cần kiểm tra'
}

const STATE_DOT: Record<RowState, string> = {
  untranslated: 'bg-ink-muted',
  ai: 'bg-info',
  reviewed: 'bg-success',
  check: 'bg-warning'
}

export interface SentenceModeHandle {
  /** Writes every cell that was changed; true when none of them failed. */
  commitAll(): Promise<boolean>
  hasDrafts(): boolean
  /** Throws away what was typed and reads the translation and links again. */
  discard(): Promise<void>
}

export interface SentenceModeProps {
  workId: string
  chapterId: string
  source: TextRecord
  target: TextRecord
  /** BCP 47 tag of the source, for the font. */
  sourceLang: string
  /** The translation changed (a row was written, or it was reloaded). */
  onTargetChanged(target: TextRecord): void
  handleRef?: Ref<SentenceModeHandle>
}

/**
 * The chapter row by row: each source sentence with the translation of that sentence beside it, how
 * far each row has got, and the way to the next row that needs someone. The translation stays one
 * text; a row is written into it and read back out of it through the links.
 */
export function SentenceMode({
  workId,
  chapterId,
  source,
  target,
  sourceLang,
  onTargetChanged,
  handleRef
}: SentenceModeProps): JSX.Element {
  const rows = useSentenceRows(workId, chapterId, source, target, onTargetChanged)
  // The row callbacks read the hook through a ref, so they stay the same function and the rows
  // that did not change are not drawn again on every key.
  const latest = useRef(rows)
  useEffect(() => {
    latest.current = rows
  })
  const [page, setPage] = useState(1)
  const [focus, setFocus] = useState<{ index: number; token: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const active = useRef(-1)
  const total = rows.view.rows.length

  useImperativeHandle(
    handleRef,
    () => ({
      commitAll: rows.commitAll,
      hasDrafts: rows.hasDrafts,
      discard: rows.reload
    }),
    [rows.commitAll, rows.hasDrafts, rows.reload]
  )

  const focusRow = useCallback((index: number): void => {
    setPage(pageOfPosition(index + 1, ROWS_PER_PAGE))
    setFocus({ index, token: Date.now() })
  }, [])

  /** The first row after `from` that nobody has confirmed, going round to the start. */
  const jumpFrom = useCallback(
    (from: number): void => {
      const list = latest.current.getView().rows
      for (let step = 1; step <= list.length; step++) {
        const index = (from + step + list.length) % list.length
        if (list[index].state !== 'reviewed') {
          setMessage(null)
          focusRow(index)
          return
        }
      }
      setMessage('Mọi hàng đã soát, không còn hàng nào cần xử lý.')
    },
    [focusRow]
  )

  const onEnter = useCallback(
    async (row: Row): Promise<void> => {
      if (await latest.current.commit(row.sourceId)) {
        if (row.index + 1 < latest.current.getView().rows.length) focusRow(row.index + 1)
      }
    },
    [focusRow]
  )

  const onConfirm = useCallback(
    async (row: Row): Promise<void> => {
      if (!(await latest.current.commit(row.sourceId))) return
      const now = latest.current.getView().rows[row.index]
      if (now.targetIds.length > 0 && now.state !== 'reviewed') {
        if (!(await latest.current.review(row.sourceId))) return
      }
      jumpFrom(row.index)
    },
    [jumpFrom]
  )

  const onActive = useCallback((index: number): void => {
    active.current = index
  }, [])

  const current = clampPage(page, total, ROWS_PER_PAGE)
  const visible = slicePage(rows.view.rows, current, ROWS_PER_PAGE)
  const { counts, unlinkedTargets } = rows.view
  const conflict = [...rows.problems.values()].find((problem) => problem.kind === 'conflict')
  const canPair = unlinkedTargets.length > 0 && counts.untranslated > 0

  if (rows.loading) {
    return (
      <p role="status" className="px-1 pt-2 text-ui-sm text-ink-muted">
        Đang đọc các hàng…
      </p>
    )
  }
  if (rows.loadError) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        <p role="alert" className="text-ui-sm text-ink-muted">
          {rows.loadError}
        </p>
        <div>
          <Button variant="secondary" onClick={() => void rows.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          role="status"
          aria-label="Số hàng theo trạng thái"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ui-xs text-ink-muted"
        >
          {(['untranslated', 'ai', 'check', 'reviewed'] as RowState[]).map((state) => (
            <span key={state} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={'size-1.5 rounded-full ' + STATE_DOT[state]} />
              {STATE_LABEL[state]} {counts[state].toLocaleString('vi')}
            </span>
          ))}
        </p>
        <Button variant="secondary" onClick={() => jumpFrom(active.current)}>
          Hàng cần xử lý kế tiếp
        </Button>
      </div>

      <SentenceFilterToolbarMock />

      {canPair && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-control px-3 py-2 text-ui-xs leading-normal">
          <span>
            Có {unlinkedTargets.length.toLocaleString('vi')} câu dịch chưa ghép với hàng nào (viết ở
            mode Toàn văn). Ghép theo thứ tự chỉ là ước đoán, các hàng đó sẽ cần kiểm tra.
          </span>
          <Button variant="outline" onClick={() => void rows.autoPair()}>
            Ghép theo thứ tự
          </Button>
        </div>
      )}
      {(message ?? rows.notice) && (
        <p role="status" className="text-ui-xs text-ink-muted">
          {message ?? rows.notice}
        </p>
      )}
      {conflict && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border border-warning/40 bg-warning/10 px-3 py-2.5 text-ui-xs leading-normal"
        >
          <strong className="font-semibold">Chưa ghi được hàng này.</strong>
          <span>{conflict.message}</span>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() =>
                void navigator.clipboard.writeText([...rows.drafts.values()].join('\n'))
              }
            >
              Sao chép chữ tôi đang gõ
            </Button>
            <Button variant="outline" onClick={() => void rows.reload()}>
              Tải lại
            </Button>
          </div>
        </div>
      )}

      <ol className="min-h-0 flex-1 list-none overflow-y-auto rounded-panel border border-line">
        {visible.map((row) => (
          <SentenceRow
            key={row.sourceId}
            row={row}
            sourceLang={sourceLang}
            draft={rows.drafts.get(row.sourceId)}
            problem={rows.problems.get(row.sourceId)}
            saving={rows.saving.has(row.sourceId)}
            focusToken={focus?.index === row.index ? focus.token : null}
            onDraft={rows.setDraft}
            onCommit={rows.commit}
            onEnter={onEnter}
            onConfirm={onConfirm}
            onActive={onActive}
          />
        ))}
      </ol>

      <SentenceSuggestionPanelMock />

      <ChapterPager
        page={current}
        pageSize={ROWS_PER_PAGE}
        total={total}
        onPage={setPage}
        unit="hàng"
      />
      <span className="sr-only">{pageCount(total, ROWS_PER_PAGE)} trang</span>
    </div>
  )
}

interface SentenceRowProps {
  row: Row
  sourceLang: string
  draft: string | undefined
  problem: RowProblem | undefined
  saving: boolean
  focusToken: number | null
  onDraft(sourceId: string, text: string): void
  onCommit(sourceId: string): Promise<boolean>
  onEnter(row: Row): Promise<void>
  onConfirm(row: Row): Promise<void>
  onActive(index: number): void
}

const SentenceRow = memo(function SentenceRow({
  row,
  sourceLang,
  draft,
  problem,
  saving,
  focusToken,
  onDraft,
  onCommit,
  onEnter,
  onConfirm,
  onActive
}: SentenceRowProps): JSX.Element {
  const field = useRef<HTMLTextAreaElement>(null)
  const value = draft ?? row.targetText
  const number = row.index + 1

  // The cell grows with its text, so nothing is hidden behind a scroll bar. The height is worked
  // out again when the width settles or changes (a window resize, the sidebar, a font arriving),
  // because the same text takes more lines in a narrower cell.
  useLayoutEffect(() => {
    const element = field.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = element.scrollHeight + 'px'
  }, [value])

  useEffect(() => {
    const element = field.current
    if (!element) return
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      element.style.height = 'auto'
      element.style.height = element.scrollHeight + 'px'
    })
    observer.observe(element)
    // Fonts load after the first layout and change how the text wraps.
    void document.fonts?.ready.then(() => {
      element.style.height = 'auto'
      element.style.height = element.scrollHeight + 'px'
    })
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (focusToken !== null) field.current?.focus()
  }, [focusToken])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // Enter that confirms a composition (Telex, Pinyin) belongs to the input method, not to us.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) void onConfirm(row)
    else void onEnter(row)
  }

  const statusId = 'row-state-' + row.sourceId
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-line px-3 py-3 last:border-b-0">
      <span className="pt-0.5 text-right text-ui-xs text-ink-muted">{number}</span>
      <p
        lang={sourceLang}
        className="selectable text-ui-sm leading-normal break-words whitespace-pre-wrap"
      >
        {row.sourceText}
      </p>
      <div className="flex min-w-0 flex-col gap-1.5">
        <textarea
          ref={field}
          rows={1}
          lang="vi"
          value={value}
          aria-label={'Bản dịch hàng ' + number}
          aria-describedby={statusId}
          spellCheck={false}
          className="w-full resize-none overflow-hidden rounded-control border border-line-strong bg-transparent px-2.5 py-1.5 text-ui-sm leading-normal outline-none focus:ring-2 focus:ring-focus/40"
          onFocus={() => onActive(row.index)}
          onChange={(event) => onDraft(row.sourceId, event.target.value)}
          onBlur={() => void onCommit(row.sourceId)}
          onKeyDown={onKeyDown}
        />
        <p
          id={statusId}
          role="status"
          className="flex items-center gap-1.5 text-ui-xs text-ink-muted"
        >
          <span aria-hidden="true" className={'size-1.5 rounded-full ' + STATE_DOT[row.state]} />
          {saving ? 'Đang ghi…' : STATE_LABEL[row.state]}
          {draft !== undefined && !saving && ' · chưa ghi'}
        </p>
        {problem && problem.kind === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-ui-xs text-error">
            <span>{problem.message}</span>
            <Button variant="outline" onClick={() => void onCommit(row.sourceId)}>
              Thử lại
            </Button>
          </div>
        )}
      </div>
    </li>
  )
})
