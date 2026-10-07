import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode
} from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { ArchiveIcon } from '@solar-icons/react/linear/archive'
import { ArrowRightIcon } from '@solar-icons/react/linear/arrow-right'
import { ClockCircleIcon } from '@solar-icons/react/linear/clock-circle'
import { DocumentAddIcon } from '@solar-icons/react/linear/document-add'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { FilterIcon } from '@solar-icons/react/linear/filter'
import { GalleryAddIcon } from '@solar-icons/react/linear/gallery-add'
import { FolderOpenIcon } from '@solar-icons/react/linear/folder-open'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { UploadMinimalisticIcon } from '@solar-icons/react/linear/upload-minimalistic'
import { PauseIcon } from '@solar-icons/react/linear/pause'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { PlayIcon } from '@solar-icons/react/linear/play'
import { SortVerticalIcon } from '@solar-icons/react/linear/sort-vertical'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import { TranslationIcon } from '@solar-icons/react/linear/translation'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { Dialog } from '../../components/Dialog'
import { MenuItem, MenuPopup, MenuRoot, MenuSeparator, MenuTrigger } from '../../components/Menu'
import { SearchField } from '../../components/SearchField'
import { Select } from '../../components/Select'
import { TextField } from '../../components/TextField'
import { formatFullDate, formatUpdated, formatUpdatedParts } from './format'
import { LanguageMark } from './LanguageMark'
import type { LibrarySection } from './LibrarySidebar'
import { matchesQuery } from './search'
import { WorkCover } from './WorkCover'
import {
  byUpdated,
  isRecent,
  languages,
  RECENT_DAYS,
  statusLabels,
  type Work,
  type WorkStatus
} from './works'

type StatusFilter = 'any' | WorkStatus
type Sort = 'updated' | 'title'

const statusOptions: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'any', label: 'Mọi trạng thái' },
  { value: 'in-progress', label: statusLabels['in-progress'] },
  { value: 'paused', label: statusLabels.paused },
  { value: 'not-started', label: statusLabels['not-started'] }
]

const sortOptions: ReadonlyArray<{ value: Sort; label: string }> = [
  { value: 'updated', label: 'Cập nhật gần đây' },
  { value: 'title', label: 'Tên A–Z' }
]

const sectionCopy: Record<LibrarySection, { title: string; subtitle: string; empty: string }> = {
  all: {
    title: 'Thư viện tác phẩm',
    subtitle: 'Quản lý những tác phẩm bạn đang dịch.',
    empty: 'Mọi tác phẩm đều đang nằm trong Lưu trữ.'
  },
  recent: {
    title: 'Gần đây',
    subtitle: 'Tác phẩm bạn sửa trong ' + RECENT_DAYS + ' ngày qua.',
    empty: 'Không có tác phẩm nào được sửa trong ' + RECENT_DAYS + ' ngày qua.'
  },
  archived: {
    title: 'Lưu trữ',
    subtitle: 'Tác phẩm đã cất khỏi thư viện. Đưa trở lại lúc nào cũng được.',
    empty: 'Chưa có tác phẩm nào được lưu trữ.'
  }
}

const sectionFilter: Record<LibrarySection, (work: Work) => boolean> = {
  all: (work) => !work.archived,
  recent: (work) => isRecent(work),
  archived: (work) => work.archived
}

const collator = new Intl.Collator('vi')

export interface LibraryActions {
  onCreateWork(): void
  onOpenExisting(): void
  onOpenWork(work: Work): void
  onContinueWork(work: Work): void
  onSelectSection(section: LibrarySection): void
  onRenameWork(work: Work, title: string): void
  onSetPaused(work: Work, paused: boolean): void
  onSetArchived(work: Work, archived: boolean): void
  /** Opens the system dialog and writes a backup of the work. */
  onBackup(work: Work): void
  /** `null` removes the cover. */
  onSetCover(work: Work, file: File | null): void
}

export interface LibraryScreenProps extends LibraryActions {
  section: LibrarySection
  works: Work[]
  /** Messages shown above the library, e.g. work files that could not be opened. */
  notices?: ReactNode
}

export function LibraryScreen(props: LibraryScreenProps): JSX.Element {
  if (props.works.length === 0) {
    return (
      <EmptyLibrary
        notices={props.notices}
        onCreateWork={props.onCreateWork}
        onOpenExisting={props.onOpenExisting}
      />
    )
  }
  return <PopulatedLibrary {...props} />
}

function PopulatedLibrary({
  section,
  works,
  notices,
  ...actions
}: LibraryScreenProps): JSX.Element {
  const [status, setStatus] = useState<StatusFilter>('any')
  const [sort, setSort] = useState<Sort>('updated')
  const [query, setQuery] = useState('')
  const [renaming, setRenaming] = useState<Work | null>(null)
  const deferredQuery = useDeferredValue(query)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const lastWorkedOn = useMemo(
    () =>
      works
        .filter((work) => !work.archived && work.status === 'in-progress' && work.lastChapter)
        .sort(byUpdated)[0],
    [works]
  )

  const visible = useMemo(() => {
    return works
      .filter(sectionFilter[section])
      .filter((work) => status === 'any' || work.status === status)
      .filter(
        (work) =>
          matchesQuery(work.title, deferredQuery) ||
          (work.originalTitle !== undefined && matchesQuery(work.originalTitle, deferredQuery))
      )
      .sort((a, b) => (sort === 'title' ? collator.compare(a.title, b.title) : byUpdated(a, b)))
  }, [works, section, status, sort, deferredQuery])

  const copy = sectionCopy[section]
  const filtered = deferredQuery.trim() !== '' || status !== 'any'

  /**
   * One 42px bar holds everything above the list — heading, search, filters, the two buttons — so
   * the list itself keeps the rest of the height and twice as many works fit without scrolling.
   */
  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex min-h-(--header-height) shrink-0 flex-wrap items-center gap-2 border-b border-line bg-canvas px-2.5 py-1">
        <h2 className="shrink-0 text-ui-sm font-semibold">
          {copy.title}{' '}
          <span className="font-normal text-ink-muted">
            · {visible.length.toLocaleString('vi')} tác phẩm
          </span>
        </h2>
        <SearchField
          ref={searchRef}
          size="sm"
          label="Tìm tác phẩm"
          placeholder="Tìm tác phẩm…"
          shortcut="Ctrl F"
          className="ml-1 min-w-[150px] flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.stopPropagation()
              setQuery('')
            }
          }}
        />
        <Select<StatusFilter>
          size="sm"
          label="Lọc theo trạng thái"
          value={status}
          options={statusOptions}
          onChange={setStatus}
          icon={<FilterIcon size={13} />}
        />
        <Select<Sort>
          size="sm"
          label="Sắp xếp"
          value={sort}
          options={sortOptions}
          onChange={setSort}
          icon={<SortVerticalIcon size={13} />}
        />
        <Button variant="outline" onClick={actions.onOpenExisting}>
          <FolderOpenIcon size={14} />
          Mở tác phẩm có sẵn
        </Button>
        <Button onClick={actions.onCreateWork}>
          <AddIcon size={14} />
          Tạo tác phẩm
        </Button>
      </div>

      <div
        className={cx(
          'grid min-h-0 flex-1 grid-cols-1',
          lastWorkedOn && '@min-[1000px]:grid-cols-[minmax(0,1fr)_280px]'
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
          {notices && <div className="flex flex-col gap-2 px-2.5 pt-2.5">{notices}</div>}

          {lastWorkedOn && (
            <div className="px-2.5 pt-2.5 @min-[1000px]:hidden">
              <ContinuePanel
                work={lastWorkedOn}
                layout="banner"
                onContinue={actions.onContinueWork}
                onShowRecent={() => actions.onSelectSection('recent')}
              />
            </div>
          )}

          {visible.length > 0 ? (
            <WorkTable works={visible} actions={actions} onRename={setRenaming} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-ui-sm text-ink-muted">
                {filtered ? 'Không có tác phẩm nào khớp bộ lọc hiện tại.' : copy.empty}
              </p>
              {filtered && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setStatus('any')
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          )}
        </div>

        {lastWorkedOn && (
          <aside
            className="hidden min-h-0 flex-col gap-4 overflow-y-auto border-l border-line p-3 @min-[1000px]:flex"
            aria-label="Tiếp tục dịch"
          >
            <ContinuePanel
              work={lastWorkedOn}
              layout="side"
              onContinue={actions.onContinueWork}
              onShowRecent={() => actions.onSelectSection('recent')}
            />
          </aside>
        )}
      </div>

      <RenameDialog
        work={renaming}
        onClose={() => setRenaming(null)}
        onRename={actions.onRenameWork}
      />
    </div>
  )
}

function PanelHeading({
  id,
  icon,
  children,
  action
}: {
  id: string
  icon: JSX.Element
  children: string
  action?: JSX.Element
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 id={id} className="flex items-center gap-2 text-ui-sm font-semibold">
        <span className="text-ink-muted">{icon}</span>
        {children}
      </h3>
      {action}
    </div>
  )
}

function ContinuePanel({
  work,
  layout,
  onContinue,
  onShowRecent
}: {
  work: Work
  layout: 'side' | 'banner'
  onContinue(work: Work): void
  onShowRecent(): void
}): JSX.Element | null {
  const chapter = work.lastChapter
  if (!chapter) return null
  const headingId = 'continue-heading-' + layout

  const heading = (
    <PanelHeading
      id={headingId}
      icon={<ClockCircleIcon size={16} />}
      action={
        <Button
          variant="ghost-muted"
          size="icon"
          aria-label="Xem tác phẩm gần đây"
          title="Xem tác phẩm gần đây"
          onClick={onShowRecent}
        >
          <AltArrowRightIcon size={15} />
        </Button>
      }
    >
      Tiếp tục gần đây
    </PanelHeading>
  )

  const details = (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="line-clamp-2 text-ui-sm leading-tight font-semibold tracking-heading">
        {work.title}
      </p>
      <p className="text-ui-xs text-ink-muted">
        Chương {chapter.number} · {chapter.title}
      </p>
      {chapter.excerpt && (
        <p className="mt-1 line-clamp-2 border-l-2 border-line-strong pl-2.5 text-ui-xs leading-normal">
          {chapter.excerpt}
        </p>
      )}
      <p className="mt-1 text-ui-xs text-ink-muted">
        Sửa{' '}
        <time dateTime={work.updatedAt.toISOString()} title={formatFullDate(work.updatedAt)}>
          {formatUpdated(work.updatedAt).toLocaleLowerCase('vi')}
        </time>
      </p>
    </div>
  )

  const button = (
    <Button className="w-full" onClick={() => onContinue(work)}>
      <PlayIcon size={14} />
      Tiếp tục dịch
    </Button>
  )

  if (layout === 'banner') {
    return (
      <section
        aria-labelledby={headingId}
        className="flex flex-col gap-3 rounded-panel border border-line bg-sidebar p-4"
      >
        {heading}
        <div className="flex items-center gap-4">
          <WorkCover work={work} size="md" />
          <div className="min-w-0 flex-1">{details}</div>
          <div className="w-[168px] shrink-0">{button}</div>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-panel border border-line bg-sidebar p-4"
    >
      {heading}
      <div className="flex gap-3.5">
        <WorkCover work={work} size="lg" />
        {details}
      </div>
      {button}
    </section>
  )
}

const columns =
  'grid grid-cols-[minmax(0,1fr)_72px_96px_84px_auto] items-center gap-3 @max-[700px]:grid-cols-[minmax(0,1fr)_96px_84px_auto] @max-[560px]:grid-cols-[minmax(0,1fr)_96px_auto]'
const hideBelow700 = '@max-[700px]:hidden'
const hideBelow560 = '@max-[560px]:hidden'

function WorkTable({
  works,
  actions,
  onRename
}: {
  works: Work[]
  actions: LibraryActions
  onRename(work: Work): void
}): JSX.Element {
  return (
    <div className="@container">
      <div
        className={cx(
          columns,
          'sticky top-0 z-(--z-raised) h-7 border-b border-line bg-canvas px-2.5 text-ui-xs text-ink-muted'
        )}
        aria-hidden="true"
      >
        <span>Tác phẩm</span>
        <span className={cx('text-right', hideBelow700)}>Chương</span>
        <span>Tiến độ</span>
        <span className={hideBelow560}>Cập nhật</span>
        <span className="w-[92px] text-right">Thao tác</span>
      </div>
      <ul aria-label="Danh sách tác phẩm">
        {works.map((work) => (
          <WorkRow key={work.id} work={work} actions={actions} onRename={() => onRename(work)} />
        ))}
      </ul>
    </div>
  )
}

const statusTone: Record<WorkStatus, string> = {
  'in-progress': 'bg-info/12 text-info',
  paused: 'bg-warning/14 text-warning',
  'not-started': 'bg-control text-ink'
}

function WorkRow({
  work,
  actions,
  onRename
}: {
  work: Work
  actions: LibraryActions
  onRename(): void
}): JSX.Element {
  const updated = formatUpdatedParts(work.updatedAt)
  const titleId = 'work-title-' + work.id
  const coverInput = useRef<HTMLInputElement>(null)

  return (
    <li
      aria-labelledby={titleId}
      className={cx(
        columns,
        'border-b border-line px-2.5 py-1.5 transition-colors hover:bg-sidebar focus-within:bg-sidebar'
      )}
    >
      {/* Author, genre and description drop out: at this density only the name and the pair of
          languages fit, and the rest is one click away on the work screen. */}
      <div className="flex min-w-0 items-center gap-2.5">
        <WorkCover work={work} size="xs" />
        <div className="flex min-w-0 flex-col">
          <span id={titleId} className="truncate text-ui-sm font-semibold">
            {work.title}
          </span>
          <span className="truncate text-ui-xs text-ink-muted">
            <span title={languages[work.sourceLanguage].name + ' → Tiếng Việt'}>
              {languages[work.sourceLanguage].short} → Việt
            </span>
            {work.author && ' · ' + work.author}
            {work.originalTitle && (
              <>
                {' · '}
                <span lang={work.sourceLanguage}>{work.originalTitle}</span>
              </>
            )}
          </span>
        </div>
      </div>
      <span className={cx('text-right text-ui-xs whitespace-nowrap text-ink-muted', hideBelow700)}>
        {work.chapterCount} chương
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className={cx(
            'inline-flex h-[22px] items-center rounded-full px-2 text-ui-xs font-semibold whitespace-nowrap',
            statusTone[work.status]
          )}
          title={work.lastChapter ? 'Chương ' + work.lastChapter.number : undefined}
        >
          {statusLabels[work.status]}
        </span>
      </div>
      <time
        className={cx('flex flex-col text-ui-xs text-ink-muted', hideBelow560)}
        dateTime={work.updatedAt.toISOString()}
        title={formatFullDate(work.updatedAt)}
      >
        <span>{updated.day}</span>
        <span className="text-ink-muted/70">{updated.time}</span>
      </time>
      <div className="flex w-[92px] items-center justify-end gap-1">
        <Button variant="outline" size="sm" onClick={() => actions.onOpenWork(work)}>
          Mở
        </Button>
        <WorkMenu
          work={work}
          actions={actions}
          onRename={onRename}
          onPickCover={() => coverInput.current?.click()}
        />
      </div>
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={'Ảnh bìa mới cho ' + work.title}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) actions.onSetCover(work, file)
        }}
      />
    </li>
  )
}

function WorkMenu({
  work,
  actions,
  onRename,
  onPickCover
}: {
  work: Work
  actions: LibraryActions
  onRename(): void
  onPickCover(): void
}): JSX.Element {
  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={'Thao tác khác cho ' + work.title}
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-control text-ink-muted outline-none hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-ink"
      >
        <MenuDotsIcon size={16} />
      </MenuTrigger>
      <MenuPopup>
        {work.lastChapter && !work.archived && (
          <MenuItem onClick={() => actions.onContinueWork(work)}>
            <TranslationIcon size={14} />
            Tiếp tục dịch chương {work.lastChapter.number}
          </MenuItem>
        )}
        <MenuItem onClick={onRename}>
          <PenNewSquareIcon size={14} />
          Đổi tên…
        </MenuItem>
        <MenuItem onClick={onPickCover}>
          <GalleryAddIcon size={14} />
          {work.coverVersion === undefined ? 'Thêm ảnh bìa…' : 'Đổi ảnh bìa…'}
        </MenuItem>
        {work.coverVersion !== undefined && (
          <MenuItem onClick={() => actions.onSetCover(work, null)}>
            <TrashBinMinimalisticIcon size={14} />
            Gỡ ảnh bìa
          </MenuItem>
        )}
        {work.status === 'in-progress' && (
          <MenuItem onClick={() => actions.onSetPaused(work, true)}>
            <PauseIcon size={14} />
            Tạm dừng dịch
          </MenuItem>
        )}
        {work.status === 'paused' && (
          <MenuItem onClick={() => actions.onSetPaused(work, false)}>
            <PlayIcon size={14} />
            Dịch tiếp
          </MenuItem>
        )}
        <MenuItem onClick={() => actions.onBackup(work)}>
          <UploadMinimalisticIcon size={14} />
          Sao lưu…
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => actions.onSetArchived(work, !work.archived)}>
          <ArchiveIcon size={14} />
          {work.archived ? 'Đưa khỏi lưu trữ' : 'Lưu trữ'}
        </MenuItem>
      </MenuPopup>
    </MenuRoot>
  )
}

function RenameDialog({
  work,
  onClose,
  onRename
}: {
  work: Work | null
  onClose(): void
  onRename(work: Work, title: string): void
}): JSX.Element {
  return (
    <Dialog
      open={work !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Đổi tên tác phẩm"
      description="Tên mới hiện ở thư viện và khi xuất bản dịch. Nội dung chương không đổi."
    >
      {/* Keyed so the field starts from the current title each time the dialog opens. */}
      {work && <RenameForm key={work.id} work={work} onClose={onClose} onRename={onRename} />}
    </Dialog>
  )
}

function RenameForm({
  work,
  onClose,
  onRename
}: {
  work: Work
  onClose(): void
  onRename(work: Work, title: string): void
}): JSX.Element {
  const [title, setTitle] = useState(work.title)
  const trimmed = title.trim()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!trimmed) return
        onRename(work, trimmed)
        onClose()
      }}
    >
      <TextField
        label="Tên tác phẩm"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={!trimmed || trimmed === work.title}>
          Lưu tên
        </Button>
      </div>
    </form>
  )
}

const steps = [
  {
    icon: <DocumentAddIcon size={18} />,
    title: 'Tạo tác phẩm',
    detail: 'Đặt tên và chọn ngôn ngữ gốc: Anh, Trung giản thể, Trung phồn thể hoặc Nhật.'
  },
  {
    icon: <DocumentTextIcon size={18} />,
    title: 'Thêm chương gốc',
    detail: 'Dán văn bản, hoặc nhập tệp TXT hay Markdown.'
  },
  {
    icon: <TranslationIcon size={18} />,
    title: 'Bắt đầu dịch',
    detail: 'Viết ở Toàn văn hoặc đi từng câu; đổi chế độ lúc nào cũng được.'
  }
]

function EmptyLibrary({
  notices,
  onCreateWork,
  onOpenExisting
}: {
  notices?: ReactNode
  onCreateWork(): void
  onOpenExisting(): void
}): JSX.Element {
  return (
    <div className="@container mx-auto flex min-h-full max-w-[1440px] flex-col gap-5 px-6 pt-7 pb-12">
      {notices}
      <div className="grid flex-1 grid-cols-1 gap-6 @min-[1000px]:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex flex-col items-center justify-center rounded-panel border border-line px-8 py-16 text-center">
          <div className="mb-9 flex items-center gap-2" aria-hidden="true">
            {(['en', 'zh-Hans', 'zh-Hant', 'ja'] as const).map((language) => (
              <LanguageMark key={language} language={language} size="lg" />
            ))}
            <ArrowRightIcon size={20} className="mx-2 text-ink-muted" />
            <span
              lang="vi"
              className="inline-flex size-16 items-center justify-center rounded-panel bg-primary text-ui-title font-medium tracking-heading text-primary-foreground"
            >
              Vi
            </span>
          </div>
          <h2 className="mb-3 text-ui-title leading-tight font-semibold tracking-heading">
            Bắt đầu tác phẩm đầu tiên
          </h2>
          <p className="mb-7 max-w-[48ch] text-ui-sm leading-normal text-ink-muted">
            Tạo chỗ để giữ các chương, bản gốc và bản dịch của một tác phẩm trên máy này.
          </p>
          <Button size="xl" onClick={onCreateWork}>
            <AddIcon size={16} />
            Tạo tác phẩm
          </Button>
          <Button variant="ghost" size="lg" className="mt-2" onClick={onOpenExisting}>
            <FolderOpenIcon size={16} />
            Mở tác phẩm có sẵn
          </Button>
        </section>

        <aside
          aria-labelledby="getting-started-heading"
          className="flex flex-col gap-4 rounded-panel border border-line bg-sidebar p-4"
        >
          <div className="flex flex-col gap-1">
            <h3 id="getting-started-heading" className="text-ui-sm font-semibold">
              Bắt đầu trong 3 bước
            </h3>
            <p className="text-ui-xs leading-normal text-ink-muted">
              Chỉ cần tên và ngôn ngữ gốc để tạo tác phẩm; chương có thể thêm sau.
            </p>
          </div>
          <ol className="flex flex-col gap-2.5">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-control border border-line bg-canvas p-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-control text-ui-xs font-semibold">
                  {index + 1}
                </span>
                <span className="mt-0.5 text-ink-muted">{step.icon}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-ui-sm font-semibold">{step.title}</span>
                  <span className="text-ui-xs leading-normal text-ink-muted">{step.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}
