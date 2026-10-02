import { useEffect, type JSX, type ReactNode } from 'react'
import { MoonIcon } from '@solar-icons/react/linear/moon'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { SidebarMinimalisticIcon } from '@solar-icons/react/linear/sidebar-minimalistic'
import { SunIcon } from '@solar-icons/react/linear/sun'
import { Button } from '../components/Button'
import { cx } from '../components/cx'
import type { Theme } from './useTheme'

export interface AppShellProps {
  sidebar: ReactNode
  sidebarOpen: boolean
  onToggleSidebar(): void
  theme: Theme
  onToggleTheme(): void
  appVersion: string
  title: ReactNode
  actions?: ReactNode
  /** Mở màn cài đặt. Nút ở mọi màn, nên đường vào không phụ thuộc đang đứng ở đâu. */
  onOpenSettings(): void
  /** Đang ở màn cài đặt: nút sáng lên và không mở lại chính nó. */
  settingsOpen?: boolean
  children: ReactNode
}

export function AppShell({
  sidebar,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  appVersion,
  title,
  actions,
  onOpenSettings,
  settingsOpen = false,
  children
}: AppShellProps): JSX.Element {
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

  const sidebarLabel = sidebarOpen ? 'Ẩn thanh bên' : 'Hiện thanh bên'

  return (
    <div
      className={cx(
        'grid h-screen overflow-hidden',
        sidebarOpen ? 'grid-cols-[248px_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]'
      )}
    >
      {sidebarOpen && (
        <aside
          id="app-sidebar"
          className="flex min-h-0 flex-col border-r border-line bg-sidebar"
          aria-label="Điều hướng chính"
        >
          <div className="flex h-[42px] shrink-0 items-center px-2.5">
            <span className="text-[15px] font-semibold tracking-[-0.05em]">Mira</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
          <div className="flex flex-col gap-2 px-3 pt-3 pb-3">
            <span className="border-t border-line px-2.5 pt-3 text-[12px] text-ink-muted">
              {appVersion ? 'Mira ' + appVersion : 'Mira'}
            </span>
          </div>
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-col bg-canvas">
        <header className="flex h-[42px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
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
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">{title}</div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
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
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
