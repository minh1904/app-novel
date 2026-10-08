import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { MoonIcon } from '@solar-icons/react/linear/moon'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { SunIcon } from '@solar-icons/react/linear/sun'
import { CompactButton } from '../components/ui/CompactButton'
import { cn } from '../lib/cn'
import { ICON } from '../components/ui/icon'
import { Tip } from '../components/ui/Tooltip'
import { TopBarSlotContext } from './topBarSlot'
import type { Theme } from './useTheme'

export interface AppShellProps {
  /** A list column beside the work area (the chapter list); null where the screen has none. */
  sidebar: ReactNode | null
  sidebarOpen: boolean
  onToggleSidebar(): void
  theme: Theme
  onToggleTheme(): void
  /** Mở màn cài đặt. Nút ở mọi màn, nên đường vào không phụ thuộc đang đứng ở đâu. */
  onOpenSettings(): void
  /** Đang ở màn cài đặt: nút sáng lên và không mở lại chính nó. */
  settingsOpen?: boolean
  children: ReactNode
}

/**
 * The right end of the bar belongs to the OS when the page draws the title bar itself (window controls
 * overlay): `titlebar-area-*` is the part left for the page, so everything past it is the buttons'
 * width. With the native title bar (the current setting) the variables do not exist, the fallbacks
 * make the sum zero, and the 10px minimum keeps the usual padding.
 */
const BAR_END_PADDING =
  'max(10px, calc(100% - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100%)))'

const BAR_ICON = ICON.sm

/**
 * The window: one bar across the top, then the optional list column and the work area. There is no
 * navigation rail (docs/modules/workspace/sidebar-research.md). The bar holds the screen's own buttons,
 * then theme and settings; the list column still opens and closes with Ctrl+B.
 */
export function AppShell({
  sidebar,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
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

  const showSidebar = sidebar !== null && sidebarOpen
  const themeLabel = theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'

  return (
    <div className="grid h-screen grid-rows-[var(--mira-header-height)_minmax(0,1fr)] overflow-hidden bg-surface">
      <header
        className="window-drag flex min-w-0 items-center gap-xs border-b border-default pl-xs"
        style={{ paddingRight: BAR_END_PADDING }}
      >
        <div className="flex-1" />
        <div ref={setSlot} className="flex shrink-0 items-center gap-2xs empty:hidden" />
        {/* Separates the screen's own buttons from the app's; shown only when the screen has some. */}
        <span
          className="hidden h-4 w-px shrink-0 bg-line [:not(:empty)+&]:block"
          aria-hidden="true"
        />
        <div className="flex shrink-0 items-center gap-2xs">
          <Tip label={themeLabel}>
            <CompactButton
              aria-label={themeLabel}
              onClick={onToggleTheme}
              icon={theme === 'dark' ? <SunIcon size={BAR_ICON} /> : <MoonIcon size={BAR_ICON} />}
            />
          </Tip>
          <Tip label="Cài đặt">
            <CompactButton
              aria-label="Cài đặt"
              aria-pressed={settingsOpen}
              onClick={onOpenSettings}
              icon={<SettingsIcon size={BAR_ICON} />}
            />
          </Tip>
        </div>
      </header>

      <div
        className={cn(
          'grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)]',
          showSidebar
            ? 'grid-cols-[var(--mira-sidebar-width)_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)]'
        )}
      >
        {showSidebar && (
          <aside
            id="app-sidebar"
            className="flex min-h-0 flex-col border-r border-default bg-surface"
            aria-label="Danh sách"
          >
            {sidebar}
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-col">
          <TopBarSlotContext.Provider value={slot}>
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </TopBarSlotContext.Provider>
        </div>
      </div>
    </div>
  )
}
