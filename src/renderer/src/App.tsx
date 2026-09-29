import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { AppShell } from './app/AppShell'
import { PendingScreen } from './app/PendingScreen'
import { useTheme } from './app/useTheme'
import { Button } from './components/Button'
import { CreateWorkScreen } from './features/library/CreateWorkScreen'
import { LibraryNotices } from './features/library/LibraryNotices'
import { LibraryScreen } from './features/library/LibraryScreen'
import { LibrarySidebar, type LibrarySection } from './features/library/LibrarySidebar'
import { useLibrary } from './features/library/useLibrary'
import { byUpdated, type Work } from './features/library/works'

type View =
  | { name: 'library'; section: LibrarySection }
  | { name: 'create' }
  | { name: 'open-existing' }
  | { name: 'work'; workId: string; intent: 'open' | 'continue' }

const RECENT_LIMIT = 4

export function App(): JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState<View>({ name: 'library', section: 'all' })
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
  const showSection = (section: LibrarySection): void => setView({ name: 'library', section })
  const openWork = (work: Work): void => setView({ name: 'work', workId: work.id, intent: 'open' })
  const continueWork = (work: Work): void =>
    setView({ name: 'work', workId: work.id, intent: 'continue' })
  const createWork = (): void => setView({ name: 'create' })

  const libraryActions = {
    onCreateWork: createWork,
    onOpenExisting: () => setView({ name: 'open-existing' }),
    onOpenWork: openWork,
    onContinueWork: continueWork,
    onSelectSection: showSection,
    onRenameWork: (work: Work, title: string) => void library.update(work, { title }),
    onSetPaused: (work: Work, paused: boolean) =>
      void library.update(work, { status: paused ? 'paused' : 'in-progress' }),
    onSetArchived: (work: Work, archived: boolean) => void library.update(work, { archived }),
    onSetCover: (work: Work, file: File | null) => void library.setCover(work, file)
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
    case 'open-existing':
      title = crumb('Mở tác phẩm có sẵn')
      content = (
        <PendingScreen
          heading="Chưa chốt hành vi của “Mở tác phẩm có sẵn”"
          detail="Đề xuất: khôi phục một tác phẩm từ tệp sao lưu .mira. Chức năng này được xây cùng phần sao lưu và khôi phục."
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
  }

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
    >
      {content}
    </AppShell>
  )
}
