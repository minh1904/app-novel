import { useEffect, type JSX } from 'react'
import { AppShell } from './app/AppShell'
import { WorkTabActiveContext } from './app/topBarSlot'
import { Button, LinkButton } from './components/ui/Button'
import { EmptyState } from './components/ui/EmptyState'
import { CreateWorkScreen } from './features/library/CreateWorkScreen'
import { useLibrary } from './features/library/useLibrary'
import { ChapterNavSidebar } from './features/chapter/ChapterNavSidebar'
import { ChapterScreen } from './features/chapter/ChapterScreen'
import {
  LeaveGuardContext,
  LeaveGuardScopeContext,
  useLeaveGuardRegistry
} from './features/editor/leaveGuard'
import { SettingsModal } from './features/settings/SettingsModal'
import { SETTINGS_PAGES } from './features/settings/settingsPages'
import { Toaster } from './components/ui/Toast'
import { Onboarding } from './features/onboarding/Onboarding'
import { WorkDetailScreen } from './features/work/WorkDetailScreen'
import { useUiStore, type View } from './stores/uiStore'
import { useAiChatStore } from './stores/aiChatStore'
import { useConnectionStore } from './stores/connectionStore'

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
  const settingsOpen = useUiStore((state) => state.settings !== null)

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
    useUiStore.getState().openSettings()
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

  // Settings › Model decides which model new chats and translations start with; read it once at start.
  useEffect(() => {
    void useConnectionStore.getState().loadPreferences()
  }, [])

  // "Theo hệ thống" follows a Windows light/dark switch while the app runs.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = (): void => useUiStore.getState().syncSystemTheme()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])

  useEffect(() => {
    let active = true
    void window.mira.getAppInfo().then((info) => {
      if (active) useUiStore.getState().setAppVersion(info.version)
    })
    return () => {
      active = false
    }
  }, [])

  const showLibrary = (): void => {
    go({ name: 'library' })
    // The detail screen already hands changes to the library; this also catches anything missed.
    void library.reload()
  }
  const openChapterView = (workId: string, chapterId: string): void =>
    go({ name: 'chapter', workId, chapterId })

  let content: JSX.Element = <div />
  // Only the chapter screen has a second column (its chapter list).
  let sidebar: JSX.Element | null = null

  switch (view.name) {
    case 'library':
      if (library.load === 'loading') {
        content = (
          <p role="status" className="px-6 pt-8 text-body-sm text-subtle">
            Đang mở thư viện…
          </p>
        )
      } else if (library.load === 'failed') {
        content = (
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-6 pt-12">
            <h2 className="text-body-lg font-semibold tracking-heading">Không mở được thư viện</h2>
            <p role="alert" className="text-body-sm leading-normal text-subtle">
              {library.loadError}
            </p>
            <div>
              <Button variant="light" onClick={() => void library.reload()}>
                Thử lại
              </Button>
            </div>
          </div>
        )
      } else {
        // The library screen is being rebuilt (docs/modules/design-system/README.md); until then the
        // view only says so. The data behind it (useLibrary) stays.
        content = (
          <EmptyState title="Thư viện đang được dựng lại">
            Giao diện thư viện tạm gỡ để dựng lại theo hệ thiết kế mới.
          </EmptyState>
        )
      }
      break
    case 'create':
      content = (
        <CreateWorkScreen
          onSubmit={library.create}
          onCreated={showLibrary}
          onCancel={showLibrary}
        />
      )
      break
    case 'work': {
      content = (
        <WorkDetailScreen
          key={view.workId}
          workId={view.workId}
          onBackToLibrary={showLibrary}
          onOpenChapter={openChapterView}
          onWorkChanged={library.applyWork}
        />
      )
      break
    }
    case 'chapter': {
      const work = works.find((item) => item.id === view.workId)
      const backToWork = (): void => go({ name: 'work', workId: view.workId })
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
                onBackToLibrary={showLibrary}
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
        onOpenSettings={openSettings}
        settingsOpen={settingsOpen}
      >
        {workspaceNotice && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-default px-4 py-2 text-body-xs text-subtle"
          >
            <span>{workspaceNotice}</span>
            <LinkButton
              color="neutral"
              onClick={() => useUiStore.getState().setWorkspaceNotice(null)}
            >
              Đóng
            </LinkButton>
          </div>
        )}
        {!workspaceReady && library.load === 'ready' ? (
          <p role="status" className="p-6 text-body-sm text-subtle">
            Đang khôi phục phiên làm việc…
          </p>
        ) : view.name === 'library' || view.name === 'create' ? (
          content
        ) : null}
        {tabPanes}
      </AppShell>
      {leaveDialog}
      <SettingsModal pages={SETTINGS_PAGES} />
      <Onboarding />
      <Toaster />
    </LeaveGuardContext.Provider>
  )
}
