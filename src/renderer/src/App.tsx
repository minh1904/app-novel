import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { AppShell } from './app/AppShell'
import { PendingScreen } from './app/PendingScreen'
import { useTheme } from './app/useTheme'
import { Button } from './components/Button'
import { DesignSystemPreview } from './features/design-system/DesignSystemPreview'
import { LibraryScreen } from './features/library/LibraryScreen'
import { LibrarySidebar, type LibrarySection } from './features/library/LibrarySidebar'
import {
  byUpdated,
  sampleActivities,
  sampleWorks,
  type Activity,
  type ActivityKind,
  type Work
} from './features/library/works'

type View =
  | { name: 'library'; section: LibrarySection }
  | { name: 'create' }
  | { name: 'open-existing' }
  | { name: 'work'; workId: string; intent: 'open' | 'continue' }
  | { name: 'design-system' }

const RECENT_LIMIT = 4

export function App(): JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState<View>({ name: 'library', section: 'all' })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  // Until storage exists the library lives in memory, seeded with sample data.
  const [works, setWorks] = useState<Work[]>(sampleWorks)
  const [activities, setActivities] = useState<Activity[]>(sampleActivities)

  useEffect(() => {
    let active = true
    void window.miyati.getAppInfo().then((info) => {
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
  const showSection = (section: LibrarySection): void => setView({ name: 'library', section })
  const openWork = (work: Work): void => setView({ name: 'work', workId: work.id, intent: 'open' })
  const continueWork = (work: Work): void =>
    setView({ name: 'work', workId: work.id, intent: 'continue' })
  const createWork = (): void => setView({ name: 'create' })

  function updateWork(id: string, change: Partial<Work>, activity?: ActivityKind): void {
    const now = new Date()
    setWorks((current) =>
      current.map((work) => (work.id === id ? { ...work, ...change, updatedAt: now } : work))
    )
    if (activity) {
      setActivities((current) => [
        ...current,
        { id: crypto.randomUUID(), kind: activity, workId: id, at: now }
      ])
    }
  }

  const libraryActions = {
    onCreateWork: createWork,
    onOpenExisting: () => setView({ name: 'open-existing' }),
    onOpenWork: openWork,
    onContinueWork: continueWork,
    onSelectSection: showSection,
    onRenameWork: (work: Work, title: string) => updateWork(work.id, { title }),
    onSetPaused: (work: Work, paused: boolean) =>
      updateWork(
        work.id,
        { status: paused ? 'paused' : 'in-progress' },
        paused ? 'paused' : 'resumed'
      ),
    onSetArchived: (work: Work, archived: boolean) =>
      updateWork(work.id, { archived }, archived ? 'archived' : undefined)
  }

  const crumb = (label: string): JSX.Element => (
    <>
      <button
        type="button"
        className="cursor-pointer rounded-[6px] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40"
        onClick={() => showSection('all')}
      >
        Thư viện
      </button>
      <AltArrowRightIcon size={12} className="shrink-0 text-ink-muted" />
      <h1 className="truncate font-semibold">{label}</h1>
    </>
  )

  let title: JSX.Element
  let content: JSX.Element

  switch (view.name) {
    case 'library':
      title = <h1 className="font-semibold">Thư viện</h1>
      content = (
        <LibraryScreen
          section={view.section}
          works={works}
          activities={activities}
          {...libraryActions}
        />
      )
      break
    case 'create':
      title = crumb('Tạo tác phẩm')
      content = (
        <PendingScreen
          heading="Màn tạo tác phẩm chưa được xây"
          detail="Bước tiếp theo trong luồng đầu tiên: nhập tên tác phẩm và chọn ngôn ngữ gốc."
          onBack={() => showSection('all')}
        />
      )
      break
    case 'open-existing':
      title = crumb('Mở tác phẩm có sẵn')
      content = (
        <PendingScreen
          heading="Chưa chốt hành vi của “Mở tác phẩm có sẵn”"
          detail="Có thể là mở dữ liệu đã có trên máy, nhập bản backup, hoặc cả hai. Xem mục câu hỏi mở trong first-run-flow.md."
          onBack={() => showSection('all')}
        />
      )
      break
    case 'work': {
      const work = works.find((item) => item.id === view.workId)
      title = crumb(work?.title ?? 'Tác phẩm')
      content = (
        <PendingScreen
          heading={
            view.intent === 'continue' && work?.lastChapter
              ? 'Editor cho chương ' + work.lastChapter.number + ' chưa được xây'
              : 'Màn tổng quan tác phẩm chưa được xây'
          }
          detail={
            view.intent === 'continue'
              ? '“Tiếp tục dịch” sẽ mở thẳng chương làm gần nhất trong editor, đúng chế độ đã dùng.'
              : '“Mở tác phẩm” sẽ dẫn tới danh sách chương, từ điển và thông tin của tác phẩm.'
          }
          onBack={() => showSection('all')}
        />
      )
      break
    }
    case 'design-system':
      title = <h1 className="font-semibold">Design system</h1>
      content = <DesignSystemPreview theme={theme} />
      break
  }

  const devTools = import.meta.env.DEV ? (
    <div className="flex flex-col gap-0.5 rounded-control border border-dashed border-line-strong p-1.5">
      <span className="px-1.5 pb-1 text-[10px] text-ink-muted">Chỉ hiện khi phát triển</span>
      <Button
        variant="ghost-muted"
        size="sm"
        className="justify-start"
        aria-pressed={view.name === 'design-system'}
        onClick={() => setView({ name: 'design-system' })}
      >
        Design system
      </Button>
      <Button
        variant="ghost-muted"
        size="sm"
        className="justify-start"
        onClick={() => {
          const empty = works.length > 0
          setWorks(empty ? [] : sampleWorks)
          setActivities(empty ? [] : sampleActivities)
          showSection('all')
        }}
      >
        {works.length > 0 ? 'Xem thư viện trống' : 'Nạp lại dữ liệu mẫu'}
      </Button>
    </div>
  ) : undefined

  return (
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
      devTools={devTools}
    >
      {content}
    </AppShell>
  )
}
