import { Fragment, useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { AppShell } from './app/AppShell'
import { useTheme } from './app/useTheme'
import { Button } from './components/Button'
import { CreateWorkScreen } from './features/library/CreateWorkScreen'
import { LibraryNotices } from './features/library/LibraryNotices'
import { LibraryScreen } from './features/library/LibraryScreen'
import { LibrarySidebar, type LibrarySection } from './features/library/LibrarySidebar'
import { useLibrary } from './features/library/useLibrary'
import { byUpdated, type Work } from './features/library/works'
import { ChapterScreen } from './features/chapter/ChapterScreen'
import { LeaveGuardContext, useLeaveGuardRegistry } from './features/editor/leaveGuard'
import { WorkDetailScreen } from './features/work/WorkDetailScreen'

type View =
  | { name: 'library'; section: LibrarySection }
  | { name: 'create' }
  | { name: 'work'; workId: string }
  | { name: 'chapter'; workId: string; chapterId: string }

const RECENT_LIMIT = 4

export function App(): JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState<View>({ name: 'library', section: 'all' })
  const { registry, dialog: leaveDialog } = useLeaveGuardRegistry()
  /** Every move to another screen passes here, so unsaved typing is never dropped silently. */
  const go = (next: View): void => {
    void registry.confirmLeave().then((proceed) => {
      if (proceed) setView(next)
    })
  }
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  const library = useLibrary()
  const { works } = library

  useEffect(() => {
    let active = true
    void window.mira.getAppInfo().then((info) => {
      if (active) setAppVersion(info.version)
    })
    return () => {
      active = false
    }
  }, [])

  const recentWorks = useMemo(
    () =>
      works
        .filter((work) => !work.archived)
        .sort(byUpdated)
        .slice(0, RECENT_LIMIT),
    [works]
  )

  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), [])
  const showSection = (section: LibrarySection): void => {
    go({ name: 'library', section })
    // The detail screen already hands changes to the library; this also catches anything missed.
    void library.reload()
  }
  const openWork = (work: Work): void => go({ name: 'work', workId: work.id })
  const openChapterView = (workId: string, chapterId: string): void =>
    go({ name: 'chapter', workId, chapterId })
  /** Records the chapter as the one being worked on, then shows it; without one, shows the work. */
  const continueWork = (work: Work): void => {
    const chapter = work.lastChapter
    if (!chapter) {
      openWork(work)
      return
    }
    void window.mira.chapters.open(work.id, chapter.id).then((result) => {
      if (result.ok) {
        library.applyWork(result.value.work)
        openChapterView(work.id, chapter.id)
      } else {
        library.reportNotice('Không mở được chương ' + chapter.number + ': ' + result.error.message)
      }
    })
  }
  const createWork = (): void => go({ name: 'create' })

  const libraryActions = {
    onCreateWork: createWork,
    onOpenExisting: () => void library.restore(),
    onBackup: (work: Work) => void library.backup(work),
    onOpenWork: openWork,
    onContinueWork: continueWork,
    onSelectSection: showSection,
    onRenameWork: (work: Work, title: string) => void library.update(work, { title }),
    onSetPaused: (work: Work, paused: boolean) =>
      void library.update(work, { status: paused ? 'paused' : 'in-progress' }),
    onSetArchived: (work: Work, archived: boolean) => void library.update(work, { archived }),
    onSetCover: (work: Work, file: File | null) => void library.setCover(work, file)
  }

  const crumbLink = (label: string, onClick: () => void): JSX.Element => (
    <button
      type="button"
      className="-my-1 max-w-[40%] shrink-0 cursor-pointer truncate rounded-[6px] py-1 text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40"
      onClick={onClick}
    >
      {label}
    </button>
  )

  /** "Thư viện › ancestors… › current": ancestors are links, the last item is the page heading. */
  const crumb = (
    label: string,
    ancestors: Array<{ label: string; onClick(): void }> = []
  ): JSX.Element => (
    <nav aria-label="Vị trí hiện tại" className="flex min-w-0 items-center gap-2">
      {[{ label: 'Thư viện', onClick: () => showSection('all') }, ...ancestors].map((item) => (
        <Fragment key={item.label}>
          {crumbLink(item.label, item.onClick)}
          <AltArrowRightIcon size={12} className="shrink-0 text-ink-muted" />
        </Fragment>
      ))}
      <h1 className="truncate font-semibold">{label}</h1>
    </nav>
  )

  let title: JSX.Element
  let content: JSX.Element

  switch (view.name) {
    case 'library':
      title = <h1 className="font-semibold">Thư viện</h1>
      if (library.load === 'loading') {
        content = (
          <p role="status" className="px-6 pt-8 text-[13px] text-ink-muted">
            Đang mở thư viện…
          </p>
        )
      } else if (library.load === 'failed') {
        content = (
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
            <h2 className="text-[20px] font-semibold tracking-[-0.04em]">Không mở được thư viện</h2>
            <p role="alert" className="text-[13px] leading-[1.6] text-ink-muted">
              {library.loadError}
            </p>
            <div>
              <Button variant="secondary" onClick={() => void library.reload()}>
                Thử lại
              </Button>
            </div>
          </div>
        )
      } else {
        content = (
          <LibraryScreen
            section={view.section}
            works={works}
            notices={
              <LibraryNotices
                problems={library.problems}
                notice={library.notice}
                onDismissNotice={library.dismissNotice}
                success={library.success}
                onDismissSuccess={library.dismissSuccess}
                onOpenWork={(workId) => {
                  library.dismissSuccess()
                  go({ name: 'work', workId })
                }}
              />
            }
            {...libraryActions}
          />
        )
      }
      break
    case 'create':
      title = crumb('Tạo tác phẩm')
      content = (
        <CreateWorkScreen
          onSubmit={library.create}
          onCreated={() => showSection('all')}
          onCancel={() => showSection('all')}
        />
      )
      break
    case 'work': {
      const work = works.find((item) => item.id === view.workId)
      title = crumb(work?.title ?? 'Tác phẩm')
      content = (
        <WorkDetailScreen
          key={view.workId}
          workId={view.workId}
          onBackToLibrary={() => showSection('all')}
          onOpenChapter={openChapterView}
          onWorkChanged={library.applyWork}
        />
      )
      break
    }
    case 'chapter': {
      const work = works.find((item) => item.id === view.workId)
      const last = work?.lastChapter?.id === view.chapterId ? work.lastChapter : undefined
      const backToWork = (): void => go({ name: 'work', workId: view.workId })
      title = crumb(last ? 'Chương ' + last.number : 'Chương', [
        { label: work?.title ?? 'Tác phẩm', onClick: backToWork }
      ])
      content = (
        <ChapterScreen
          key={view.chapterId}
          workId={view.workId}
          chapterId={view.chapterId}
          onBackToWork={backToWork}
          onWorkChanged={library.applyWork}
          focused={!sidebarOpen}
          onToggleFocus={toggleSidebar}
        />
      )
      break
    }
  }

  return (
    <LeaveGuardContext.Provider value={registry}>
      <AppShell
        sidebar={
          <LibrarySidebar
            activeSection={view.name === 'library' ? view.section : undefined}
            onSelectSection={showSection}
            recentWorks={recentWorks}
            hasWorks={works.length > 0}
            onOpenWork={openWork}
            onCreateWork={createWork}
          />
        }
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        theme={theme}
        onToggleTheme={toggleTheme}
        appVersion={appVersion}
        title={title}
      >
        {content}
      </AppShell>
      {leaveDialog}
    </LeaveGuardContext.Provider>
  )
}
