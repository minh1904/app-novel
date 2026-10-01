import { useEffect, type JSX, type ReactNode } from 'react'
import { MoonIcon } from '@solar-icons/react/linear/moon'
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
  children
}: AppShellProps): JSX.Element {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        onToggleSidebar()
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
          <div className="flex h-[44px] shrink-0 items-center px-4">
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
        <header className="flex h-[44px] shrink-0 items-center gap-2 border-b border-line bg-chrome px-2.5">
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
