import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent
} from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { ImportIcon } from '@solar-icons/react/linear/import'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { Input, SearchInput } from '../../components/ui/Input'
import { backupWork, savedMessage } from './backup'
import { ChapterPager } from './ChapterPager'
import { DeleteChapterDialog, MoveChapterDialog } from './ChapterDialogs'
import { CHAPTER_GRID, ChapterRow, type ChapterRowActions } from './ChapterRow'
import {
  DEFAULT_PAGE_SIZE,
  chapterState,
  clampPage,
  filterChapters,
  pageOfPosition,
  parseQuery,
  slicePage,
  type PageSize
} from './chapterList'
import { ImportTxtMockDialog } from './ImportTxtMockDialog'
import { MOCK_FEATURES, SOON_LABEL } from './mockFeatures'
import { useChapters } from './useChapters'
import type { WorkAreaProps } from './workArea'

const HIGHLIGHT_MS = 2500

interface Highlight {
  id: string
  /** Also move keyboard focus to the chapter's name (after a move or a rename). */
  focus: boolean
}

/** The Chapters area: add, rename, reorder and delete chapters, find one, and open it. */
export function ChaptersArea({
  workId,
  onWork,
  onOpenChapter,
  addChapterSignal
}: WorkAreaProps): JSX.Element {
  const chapters = useChapters(workId, onWork)
  const { chapters: all } = chapters

  const [query, setQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE)
  const [adding, setAdding] = useState(false)
  const [addKey, setAddKey] = useState(0)
  const [seenSignal, setSeenSignal] = useState(addChapterSignal)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const listRef = useRef<HTMLUListElement>(null)

  // The header's "Thêm chương" asks this area to open the add row (derived during render, no effect).
  if (addChapterSignal !== seenSignal) {
    setSeenSignal(addChapterSignal)
    setAdding(true)
    setAddKey((key) => key + 1)
  }

  const parsed = parseQuery(query)
  // Typing stays responsive on thousands of chapters: the filter follows a beat behind the input.
  const filterText = useDeferredValue(parsed.kind === 'filter' ? parsed.text : '')
  const filtered = useMemo(() => filterChapters(all, filterText), [all, filterText])
  const translated = useMemo(
    () => all.filter((chapter) => chapterState(chapter) === 'translated').length,
    [all]
  )
  const currentPage = clampPage(page, filtered.length, pageSize)
  const visible = useMemo(
    () => slicePage(filtered, currentPage, pageSize),
    [filtered, currentPage, pageSize]
  )

  // Scroll the highlighted chapter into view, move focus to it when asked, then let the mark fade.
  useEffect(() => {
    if (!highlight) return
    const row = listRef.current?.querySelector<HTMLElement>(
      '[data-chapter-id="' + highlight.id + '"]'
    )
    row?.scrollIntoView({ block: 'nearest' })
    if (highlight.focus) row?.querySelector<HTMLElement>('[data-title-button]')?.focus()
    const timer = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [highlight, visible])

  const byId = (id: string | null): ChapterItem | null =>
    id === null ? null : (all.find((chapter) => chapter.id === id) ?? null)

  const showPositionOf = (number: number, id: string, focus: boolean): void => {
    // The new place may be hidden by the filter, so clear it, then open the page that holds it.
    setQuery('')
    setSearchError(null)
    setPage(pageOfPosition(number, pageSize))
    setHighlight({ id, focus })
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `showPositionOf` only reads `pageSize`; the other inputs are stable hook callbacks.
  const actions: ChapterRowActions = useMemo(
    () => ({
      open: (chapter) => {
        void chapters.open(chapter.id).then((result) => {
          if (result.ok) onOpenChapter(chapter.id)
        })
      },
      startRename: (chapter) => setEditingId(chapter.id),
      commitRename: (chapter, title) => {
        setEditingId(null)
        setHighlight({ id: chapter.id, focus: true })
        if (title.trim() !== chapter.title) void chapters.rename(chapter.id, title)
      },
      cancelRename: () => setEditingId(null),
      moveTo: (chapter, to) => {
        void chapters.move(chapter.id, to).then((result) => {
          if (!result.ok) return
          showPositionOf(to, chapter.id, true)
          setAnnouncement('Đã chuyển chương tới vị trí ' + to + '.')
        })
      },
      askMoveTo: (chapter) => setMovingId(chapter.id),
      askDelete: (chapter) => setDeletingId(chapter.id)
    }),
    [chapters.open, chapters.rename, chapters.move, onOpenChapter, pageSize]
  )

  async function addChapter(title: string): Promise<boolean> {
    const result = await chapters.create(title.trim() === '' ? undefined : title)
    if (!result.ok) return false
    showPositionOf(result.value.number, result.value.id, false)
    setAnnouncement('Đã thêm ' + (result.value.title || 'Chương ' + result.value.number) + '.')
    return true
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape' && query !== '') {
      event.preventDefault()
      setQuery('')
      setSearchError(null)
      setPage(1)
      return
    }
    if (event.key !== 'Enter' || parsed.kind !== 'jump') return
    event.preventDefault()
    if (parsed.number < 1 || parsed.number > all.length) {
      setSearchError('Chỉ có ' + all.length + ' chương; nhập số từ 1 đến ' + all.length + '.')
      return
    }
    setSearchError(null)
    const target = all[parsed.number - 1]
    setPage(pageOfPosition(parsed.number, pageSize))
    setHighlight({ id: target.id, focus: true })
  }

  const importButton = (
    <Button variant="light" onClick={() => setImportOpen(true)}>
      <ImportIcon size={14} />
      {MOCK_FEATURES.importTxt.label}
      <span className="ml-0.5 rounded-sm bg-selected px-1.5 py-px text-body-xs text-default">
        {SOON_LABEL}
      </span>
    </Button>
  )

  const addRow = adding && (
    <AddChapterRow key={addKey} onAdd={addChapter} onClose={() => setAdding(false)} />
  )

  return (
    <section aria-labelledby="chapters-heading" className="@container flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="mr-auto flex items-center gap-3">
          <h2 id="chapters-heading" className="text-body-md font-semibold tracking-heading">
            Chương <span className="font-normal text-subtle">({all.length})</span>
          </h2>
          {all.length > 0 && <TranslatedProgress done={translated} total={all.length} />}
        </div>
        {all.length > 0 && (
          <div className="flex min-w-[220px] flex-1 basis-[280px] flex-col gap-1 @min-[760px]:max-w-[360px]">
            <SearchInput
              label="Tìm chương hoặc nhập số để nhảy tới"
              placeholder="Tìm chương hoặc nhập số…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSearchError(null)
                setPage(1)
              }}
              onKeyDown={onSearchKeyDown}
              aria-describedby={searchError ? 'chapter-search-error' : undefined}
            />
            {searchError && (
              <p id="chapter-search-error" role="alert" className="text-body-xs text-error">
                {searchError}
              </p>
            )}
          </div>
        )}
        {/* With no chapters the empty state below carries both actions. */}
        {all.length > 0 && (
          <>
            {importButton}
            <Button
              variant="solid"
              onClick={() => {
                setAdding(true)
                setAddKey((key) => key + 1)
              }}
            >
              <AddIcon size={14} />
              Thêm chương
            </Button>
          </>
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {chapters.notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-sm border border-error/40 bg-error/8 px-3.5 py-2.5 text-body-xs"
        >
          <span>{chapters.notice}</span>
          <Button variant="ghost" onClick={chapters.dismissNotice}>
            Đóng
          </Button>
        </div>
      )}

      {chapters.load === 'loading' && (
        <p role="status" className="py-6 text-body-sm text-subtle">
          Đang tải danh sách chương…
        </p>
      )}

      {chapters.load === 'failed' && (
        <div className="flex flex-col items-start gap-3 py-6">
          <p role="alert" className="text-body-sm">
            Không tải được danh sách chương. {chapters.loadError}
          </p>
          <Button variant="light" onClick={() => void chapters.reload()}>
            Thử lại
          </Button>
        </div>
      )}

      {chapters.load === 'ready' && all.length === 0 && (
        <>
          {addRow}
          {!adding && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-strong px-6 py-12 text-center">
              <DocumentTextIcon size={24} className="text-subtle" />
              <p className="text-body-sm font-semibold">Chưa có chương nào</p>
              <p className="max-w-[420px] text-body-xs leading-normal text-subtle">
                Thêm chương đầu tiên để bắt đầu. Văn bản gốc và bản dịch của mỗi chương sẽ nằm ở
                đây.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="solid"
                  onClick={() => {
                    setAdding(true)
                    setAddKey((key) => key + 1)
                  }}
                >
                  <AddIcon size={14} />
                  Thêm chương
                </Button>
                {importButton}
              </div>
            </div>
          )}
        </>
      )}

      {chapters.load === 'ready' && all.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-default">
            <div
              className={cn(
                CHAPTER_GRID,
                'gap-x-2 border-b border-default bg-subtle px-1 py-2 text-body-xs font-medium text-subtle'
              )}
              aria-hidden="true"
            >
              <span className="pl-2">Số</span>
              <span className="px-2">Tên chương</span>
              <span className="hidden @min-[560px]:block">Trạng thái</span>
              <span className="hidden @min-[560px]:block">Sửa lần cuối</span>
              <span />
            </div>
            {addRow}
            {visible.length === 0 ? (
              <div className="flex flex-col items-start gap-3 px-4 py-8">
                <p role="status" className="text-body-sm">
                  Không có chương nào khớp “{filterText}”.
                </p>
                <Button
                  variant="light"
                  onClick={() => {
                    setQuery('')
                    setPage(1)
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              <ul ref={listRef} aria-label="Danh sách chương">
                {visible.map((chapter) => (
                  <ChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    total={all.length}
                    editing={editingId === chapter.id}
                    highlighted={highlight?.id === chapter.id}
                    actions={actions}
                  />
                ))}
              </ul>
            )}
          </div>

          <ChapterPager
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}

      <MoveChapterDialog
        chapter={byId(movingId)}
        total={all.length}
        onClose={() => setMovingId(null)}
        onMove={(chapter, to) => actions.moveTo(chapter, to)}
      />
      <DeleteChapterDialog
        chapter={byId(deletingId)}
        onClose={() => setDeletingId(null)}
        onDelete={(chapter) => {
          setAnnouncement('Đã xóa chương ' + chapter.number + '.')
          void chapters.remove(chapter.id)
        }}
        onBackup={async () => {
          const outcome = await backupWork(workId)
          if (outcome.kind === 'saved') return savedMessage(outcome.path)
          if (outcome.kind === 'failed') return 'Không sao lưu được: ' + outcome.message
          return null
        }}
      />
      <ImportTxtMockDialog open={importOpen} onOpenChange={setImportOpen} />
    </section>
  )
}

/** One-line input at the top of the list. Enter adds and stays open for the next; Escape closes. */
function AddChapterRow({
  onAdd,
  onClose
}: {
  onAdd(title: string): Promise<boolean>
  onClose(): void
}): JSX.Element {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    if (busy) return
    setBusy(true)
    const added = await onAdd(title)
    setBusy(false)
    if (added) setTitle('')
  }

  return (
    <form
      className="sticky top-0 z-(--mira-z-sticky) flex items-center gap-2 border-b border-default bg-surface px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Input
        autoFocus
        aria-label="Tên chương mới (để trống thì đặt là Chương số)"
        placeholder="Tên chương mới — Enter để thêm, Esc để đóng"
        value={title}
        maxLength={200}
        className="min-w-0 flex-1"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
      />
      <Button variant="solid" type="submit" disabled={busy}>
        Thêm
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Xong
      </Button>
    </form>
  )
}

/** How many chapters have a translation, as a count and a thin bar; the count says it for screen readers. */
function TranslatedProgress({ done, total }: { done: number; total: number }): JSX.Element {
  return (
    <span className="flex items-center gap-2 text-body-xs text-subtle tabular-nums">
      <span aria-hidden="true" className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-success"
          style={{ width: (done / total) * 100 + '%' }}
        />
      </span>
      {done}/{total} đã dịch
    </span>
  )
}
