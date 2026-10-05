import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { MoonIcon } from '@solar-icons/react/linear/moon'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { SidebarMinimalisticIcon } from '@solar-icons/react/linear/sidebar-minimalistic'
import { SunIcon } from '@solar-icons/react/linear/sun'
import logoUrl from '../assets/logo.png'
import { Button } from '../components/Button'
import { cx } from '../components/cx'
import { TopBarSlotContext } from './topBarSlot'
import type { Theme } from './useTheme'

export interface AppShellProps {
  sidebar: ReactNode
  sidebarOpen: boolean
  onToggleSidebar(): void
  theme: Theme
  onToggleTheme(): void
  appVersion: string
  title: ReactNode
  workTabs?: ReadonlyArray<{ workId: string; title: string }>
  selectedWorkId?: string | null
  onSelectWorkTab?(workId: string): void
  onCloseWorkTab?(workId: string): void
  onOpenLibrary?(): void
  /** Mở màn cài đặt. Nút ở mọi màn, nên đường vào không phụ thuộc đang đứng ở đâu. */
  onOpenSettings(): void
  /** Đang ở màn cài đặt: nút sáng lên và không mở lại chính nó. */
  settingsOpen?: boolean
  children: ReactNode
}

/**
 * The right end of the bar belongs to the OS: it draws the minimise, maximise and close buttons
 * there (window controls overlay). `titlebar-area-*` is the part left for the page, so everything
 * past it is the buttons' width. Outside the overlay (a browser, a test) the variables do not
 * exist, the fallbacks make the sum zero, and the 10px minimum keeps the usual padding.
 */
const BAR_END_PADDING =
  'max(10px, calc(100% - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100%)))'

export function AppShell({
  sidebar,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  appVersion,
  title,
  workTabs = [],
  selectedWorkId = null,
  onSelectWorkTab,
  onCloseWorkTab,
  onOpenLibrary,
  onOpenSettings,
  settingsOpen = false,
  children
}: AppShellProps): JSX.Element {
  // The element the current screen's own controls are drawn into (see `TopBarActions`). A state,
  // not a ref, so the screens re-render with the element once it exists.
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  // A more specific handler closer to the key's target — the translation pane's own "bold" binding,
  // for one — gets first look and calls preventDefault() when it claims the key; this global one
  // backs off rather than also firing, the same way a browser lets an inner handler win.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) return
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key.toLowerCase() === 'b') {
          event.preventDefault()
          onToggleSidebar()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onToggleSidebar])

  useEffect(() => {
    function onTabKey(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        !event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key !== 'Tab' ||
        workTabs.length === 0 ||
        !onSelectWorkTab
      )
        return
      event.preventDefault()
      const index = workTabs.findIndex((tab) => tab.workId === selectedWorkId)
      const step = event.shiftKey ? -1 : 1
      const next = (index + step + workTabs.length) % workTabs.length
      onSelectWorkTab(workTabs[next]!.workId)
    }
    window.addEventListener('keydown', onTabKey)
    return () => window.removeEventListener('keydown', onTabKey)
  }, [workTabs, selectedWorkId, onSelectWorkTab])

  const sidebarLabel = sidebarOpen ? 'Ẩn thanh bên' : 'Hiện thanh bên'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* One bar for the whole window, over the sidebar too: it is the title bar, the app header and
          the place for each screen's own icons, so nothing sits in a second strip underneath. */}
      <header
        className="window-drag flex h-(--header-height) shrink-0 items-center gap-2 border-b border-line bg-chrome pl-2"
        style={{ paddingRight: BAR_END_PADDING }}
      >
        <Button
          variant="ghost-muted"
          size="icon"
          aria-label={sidebarLabel}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          title={sidebarLabel + ' (Ctrl+B)'}
          onClick={onToggleSidebar}
        >
          <SidebarMinimalisticIcon size={16} />
        </Button>
        <span className="flex items-center gap-1.5">
          <img src={logoUrl} alt="" className="size-4 shrink-0" draggable={false} />
          <span className="text-ui-sm font-semibold">Mira</span>
        </span>
        <span className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />
        {workTabs.length > 0 && (
          <nav
            aria-label="Truyện đang mở"
            className="work-tab-strip flex min-w-0 max-w-[min(60vw,760px)] flex-1 items-end gap-0.5 self-stretch overflow-x-auto whitespace-nowrap"
          >
            {workTabs.map((tab) => (
              <div
                key={tab.workId}
                className={cx(
                  'group flex h-8.5 max-w-50 shrink-0 items-center rounded-t-tab border text-ui-sm',
                  selectedWorkId === tab.workId
                    ? 'border-line border-b-canvas bg-canvas text-ink'
                    : 'border-transparent text-ink-muted hover:bg-hover hover:text-ink'
                )}
              >
                <button
                  type="button"
                  aria-current={selectedWorkId === tab.workId ? 'page' : undefined}
                  title={tab.title}
                  onClick={() => onSelectWorkTab?.(tab.workId)}
                  className="min-w-0 flex-1 truncate px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {tab.title}
                </button>
                <button
                  type="button"
                  aria-label={'Đóng tab ' + tab.title}
                  title={'Đóng ' + tab.title}
                  onClick={() => onCloseWorkTab?.(tab.workId)}
                  className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-item text-ink-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ))}
          </nav>
        )}
        {workTabs.length > 0 && (
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Mở Thư viện"
            title="Mở Thư viện"
            onClick={onOpenLibrary}
          >
            +
          </Button>
        )}
        <div
          className={cx(
            'min-w-0 items-center gap-2 text-ui-xs',
            workTabs.length ? 'hidden xl:flex xl:flex-1' : 'flex flex-1'
          )}
        >
          {title}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div ref={setSlot} className="flex items-center gap-1 empty:hidden" />
          <Button
            variant={settingsOpen ? 'secondary' : 'ghost-muted'}
            size="icon"
            aria-label="Cài đặt"
            aria-current={settingsOpen ? 'page' : undefined}
            title="Cài đặt"
            onClick={onOpenSettings}
          >
            <SettingsIcon size={16} />
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label={theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
            title={theme === 'dark' ? 'Nền sáng' : 'Nền tối'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </Button>
        </div>
      </header>

      <div
        className={cx(
          'grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]',
          sidebarOpen ? 'grid-cols-[248px_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]'
        )}
      >
        {sidebarOpen && (
          <aside
            id="app-sidebar"
            className="flex min-h-0 flex-col border-r border-line bg-sidebar"
            aria-label="Điều hướng chính"
          >
            <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
            <div className="flex flex-col gap-2 px-3 pt-3 pb-3">
              <span className="border-t border-line px-2.5 pt-3 text-ui-xs text-ink-muted">
                {appVersion ? 'Mira ' + appVersion : 'Mira'}
              </span>
            </div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-col bg-canvas">
          <TopBarSlotContext.Provider value={slot}>
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </TopBarSlotContext.Provider>
        </div>
      </div>
    </div>
  )
}
