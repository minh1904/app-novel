import { Fragment, useEffect, useMemo, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { AppShell } from './app/AppShell'
import { WorkTabActiveContext } from './app/topBarSlot'
import { Button } from './components/Button'
import { CreateWorkScreen } from './features/library/CreateWorkScreen'
import { LibraryNotices } from './features/library/LibraryNotices'
import { LibraryScreen } from './features/library/LibraryScreen'
import { LibrarySidebar, type LibrarySection } from './features/library/LibrarySidebar'
import { useLibrary } from './features/library/useLibrary'
import { byUpdated, type Work } from './features/library/works'
import { ChapterNavSidebar } from './features/chapter/ChapterNavSidebar'
import { ChapterScreen } from './features/chapter/ChapterScreen'
import {
  LeaveGuardContext,
  LeaveGuardScopeContext,
  useLeaveGuardRegistry
} from './features/editor/leaveGuard'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { WorkDetailScreen } from './features/work/WorkDetailScreen'
import { useUiStore, type View } from './stores/uiStore'
import { useAiChatStore } from './stores/aiChatStore'

const RECENT_LIMIT = 4

export function App(): JSX.Element {
  const { registry, dialog: leaveDialog } = useLeaveGuardRegistry()

  const view = useUiStore((state) => state.view)
  const tabs = useUiStore((state) => state.tabs)
  const workspaceReady = useUiStore((state) => state.workspaceReady)
  const workspaceNotice = useUiStore((state) => state.workspaceNotice)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const appVersion = useUiStore((state) => state.appVersion)

  useEffect(() => {
    useUiStore.getState().setLeaveGuardRegistry(registry)
  }, [registry])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!registry.isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [registry])

  // A stream continues while the chapter panel is hidden or another chapter is being viewed.
  useEffect(() => useAiChatStore.getState().startListening(), [])

  const go = (next: View): void => {
    void useUiStore.getState().navigate(next)
  }
  const openSettings = (): void => {
    void useUiStore.getState().openSettings()
  }
  const closeSettings = (): void => {
    void useUiStore.getState().closeSettings()
  }

  const library = useLibrary()
  const { works } = library

  useEffect(() => {
    if (library.load !== 'ready' || workspaceReady) return
    let current = true
    if (!window.mira?.workspace) {
      useUiStore.getState().restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [])
      return
    }
    void window.mira.workspace
      .load()
      .then((result) => {
        if (!current) return
        if (result.ok)
          useUiStore.getState().restoreWorkspace(result.value.state, result.value.notices)
        else
          useUiStore
            .getState()
            .restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [
              'Không khôi phục được phiên tab: ' + result.error.message
            ])
      })
      .catch(() => {
        if (current)
          useUiStore
            .getState()
            .restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [
              'Không khôi phục được phiên tab.'
            ])
      })
    return () => {
      current = false
    }
  }, [library.load, workspaceReady])

  useEffect(() => {
    let active = true
    void window.mira.getAppInfo().then((info) => {
      if (active) useUiStore.getState().setAppVersion(info.version)
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

  const showSection = (section: LibrarySection): void => {
    go({ name: 'library', section })
    // The detail screen already hands changes to the library; this also catches anything missed.
    void library.reload()
  }
  const openWorkId = (workId: string): void => {
    const state = useUiStore.getState()
    if (state.tabs.some((tab) => tab.workId === workId)) state.activateTab(workId)
    else go({ name: 'work', workId })
  }
  const openWork = (work: Work): void => openWorkId(work.id)
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
      className="-my-1 max-w-[40%] shrink-0 cursor-pointer truncate rounded-control py-1 text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40"
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

  let title: JSX.Element = <h1 className="font-semibold">Thư viện</h1>
  let content: JSX.Element = <div />
  let sidebar: JSX.Element | null = (
    <LibrarySidebar
      activeSection={view.name === 'library' ? view.section : undefined}
      onSelectSection={showSection}
      recentWorks={recentWorks}
      hasWorks={works.length > 0}
      onOpenWork={openWork}
      onCreateWork={createWork}
    />
  )

  switch (view.name) {
    case 'library':
      title = <h1 className="font-semibold">Thư viện</h1>
      if (library.load === 'loading') {
        content = (
          <p role="status" className="px-6 pt-8 text-ui-sm text-ink-muted">
            Đang mở thư viện…
          </p>
        )
      } else if (library.load === 'failed') {
        content = (
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
            <h2 className="text-ui-lg font-semibold tracking-heading">Không mở được thư viện</h2>
            <p role="alert" className="text-ui-sm leading-normal text-ink-muted">
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
                  openWorkId(workId)
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
          onOpenSettings={openSettings}
          focused={!sidebarOpen}
          onToggleFocus={toggleSidebar}
        />
      )
      sidebar = (
        <ChapterNavSidebar
          key={view.workId}
          workId={view.workId}
          workTitle={work?.title ?? 'Tác phẩm'}
          activeChapterId={view.chapterId}
          onOpenChapter={(chapterId) => openChapterView(view.workId, chapterId)}
          onBackToWork={backToWork}
          onWorkChanged={library.applyWork}
        />
      )
      break
    }
    case 'settings': {
      title = <span className="font-semibold">Cài đặt</span>
      content = <SettingsScreen onBack={closeSettings} />
      sidebar = null
      break
    }
  }

  const visibleWorkId = view.name === 'work' || view.name === 'chapter' ? view.workId : null
  const tabPanes = tabs.map((tab) => {
    const active = tab.workId === visibleWorkId
    if (!active && tab.location.name === 'chapter' && !registry.isDirty(tab.workId)) return null
    const backToWork = (): void => go({ name: 'work', workId: tab.workId })
    return (
      <div
        key={tab.workId}
        hidden={!active}
        inert={!active}
        className="h-full min-h-0"
        aria-hidden={!active}
      >
        <WorkTabActiveContext.Provider value={active}>
          <LeaveGuardScopeContext.Provider value={tab.workId}>
            {tab.location.name === 'work' ? (
              <WorkDetailScreen
                workId={tab.workId}
                areaId={tab.areaId}
                onAreaChange={(areaId) => useUiStore.getState().setWorkArea(tab.workId, areaId)}
                onBackToLibrary={() => showSection('all')}
                onOpenChapter={openChapterView}
                onWorkChanged={library.applyWork}
              />
            ) : (
              <ChapterScreen
                key={tab.location.chapterId}
                workId={tab.workId}
                chapterId={tab.location.chapterId}
                onBackToWork={backToWork}
                onWorkChanged={library.applyWork}
                onOpenSettings={openSettings}
                focused={!sidebarOpen}
                onToggleFocus={toggleSidebar}
              />
            )}
          </LeaveGuardScopeContext.Provider>
        </WorkTabActiveContext.Provider>
      </div>
    )
  })

  return (
    <LeaveGuardContext.Provider value={registry}>
      <AppShell
        sidebar={sidebar}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        theme={theme}
        onToggleTheme={toggleTheme}
        appVersion={appVersion}
        title={title}
        workTabs={tabs.map((tab) => ({
          workId: tab.workId,
          title: works.find((work) => work.id === tab.workId)?.title ?? 'Tác phẩm'
        }))}
        selectedWorkId={visibleWorkId}
        onSelectWorkTab={(workId) => useUiStore.getState().activateTab(workId)}
        onCloseWorkTab={(workId) => {
          void useUiStore.getState().closeTab(workId)
        }}
        onOpenLibrary={() => showSection('all')}
        onOpenSettings={openSettings}
        settingsOpen={view.name === 'settings'}
      >
        {workspaceNotice && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-ui-xs text-ink-muted"
          >
            <span>{workspaceNotice}</span>
            <button type="button" onClick={() => useUiStore.getState().setWorkspaceNotice(null)}>
              Đóng
            </button>
          </div>
        )}
        {!workspaceReady && library.load === 'ready' ? (
          <p role="status" className="p-6 text-ui-sm text-ink-muted">
            Đang khôi phục phiên làm việc…
          </p>
        ) : view.name === 'library' || view.name === 'create' || view.name === 'settings' ? (
          content
        ) : null}
        {tabPanes}
      </AppShell>
      {leaveDialog}
    </LeaveGuardContext.Provider>
  )
}
