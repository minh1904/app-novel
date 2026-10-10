import type { JSX, ReactNode } from 'react'
import { Book2Icon } from '@solar-icons/react/linear/book-2'
import { ChatRoundLineIcon } from '@solar-icons/react/linear/chat-round-line'
import { ChecklistMinimalisticIcon } from '@solar-icons/react/linear/checklist-minimalistic'
import { CompassIcon } from '@solar-icons/react/linear/compass'
import { FeedIcon } from '@solar-icons/react/linear/feed'
import { Home2Icon } from '@solar-icons/react/linear/home-2'
import { LibraryIcon } from '@solar-icons/react/linear/library'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { MoonIcon } from '@solar-icons/react/linear/moon'
import { Pen2Icon } from '@solar-icons/react/linear/pen-2'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { SidebarMinimalisticIcon } from '@solar-icons/react/linear/sidebar-minimalistic'
import { SunIcon } from '@solar-icons/react/linear/sun'
import { CompactButton } from '../components/ui/CompactButton'
import { ICON } from '../components/ui/icon'
import { Kbd } from '../components/ui/Input'
import { NavItem } from '../components/ui/NavItem'
import { Tip } from '../components/ui/Tooltip'
import { cn } from '../lib/cn'
import type { AppPage, Theme } from '../stores/uiStore'

interface NavEntry {
  page: AppPage
  label: string
  icon: ReactNode
}

const icon = (Icon: typeof Home2Icon): ReactNode => <Icon size={ICON.sm} aria-hidden="true" />

/** Daily work first, then what every work shares (app-level-features.md, phương án A). */
const MAIN: NavEntry[] = [
  { page: 'home', label: 'Trang chủ', icon: icon(Home2Icon) },
  { page: 'library', label: 'Thư viện', icon: icon(LibraryIcon) },
  { page: 'jobs', label: 'Tác vụ', icon: icon(ChecklistMinimalisticIcon) },
  { page: 'updates', label: 'Cập nhật', icon: icon(FeedIcon) },
  { page: 'sources', label: 'Nguồn', icon: icon(CompassIcon) }
]
const RESOURCES: NavEntry[] = [
  { page: 'shared', label: 'Kho dùng chung', icon: icon(Book2Icon) },
  { page: 'style', label: 'Prompt & văn phong', icon: icon(Pen2Icon) },
  { page: 'assistant', label: 'Trợ lý AI', icon: icon(ChatRoundLineIcon) }
]

export interface AppNavProps {
  /** The page on screen; inside a work that is the library, where works are opened from. */
  page: AppPage | null
  collapsed: boolean
  onNavigate(page: AppPage): void
  onToggleCollapsed(): void
  onOpenPalette(): void
  /** Works in the library, shown beside its row; null while it loads. */
  libraryCount: number | null
  theme: Theme
  onToggleTheme(): void
  onOpenSettings(): void
  settingsOpen: boolean
  /** A connection problem shown on Settings; null while healthy or still loading. */
  connectionNotice: string | null
}

/**
 * The app sidebar below the window title bar: pages outside any one work, 224px with labels or folded
 * to a 48px rail of icons with tooltips. Settings and the theme sit at the bottom.
 */
export function AppNav({
  page,
  collapsed,
  onNavigate,
  onToggleCollapsed,
  onOpenPalette,
  libraryCount,
  theme,
  onToggleTheme,
  onOpenSettings,
  settingsOpen,
  connectionNotice
}: AppNavProps): JSX.Element {
  const themeLabel = theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'
  const toggleLabel = collapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu thanh bên (Ctrl+B)'

  function row(entry: NavEntry): JSX.Element {
    const trailing =
      entry.page === 'library' && libraryCount !== null && !collapsed ? (
        <span className="text-label-xs text-muted tabular-nums">{libraryCount}</span>
      ) : null
    return (
      <Item
        key={entry.page}
        collapsed={collapsed}
        label={entry.label}
        active={page === entry.page}
        onClick={() => onNavigate(entry.page)}
        leading={entry.icon}
        trailing={trailing}
      />
    )
  }

  return (
    <aside
      aria-label="Điều hướng"
      className={cn(
        'flex min-h-0 shrink-0 flex-col border-r border-default bg-subtle',
        collapsed ? 'w-12' : 'w-[224px]'
      )}
    >
      <div
        className={cn(
          'flex h-(--mira-header-height) shrink-0 items-center',
          collapsed ? 'justify-center' : 'justify-end pr-xs'
        )}
      >
        <Tip label={toggleLabel} side={collapsed ? 'right' : 'bottom'}>
          <CompactButton
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            onClick={onToggleCollapsed}
            icon={<SidebarMinimalisticIcon size={ICON.sm} />}
          />
        </Tip>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-2xs overflow-y-auto p-xs pt-0">
        <Item
          collapsed={collapsed}
          label="Tìm"
          onClick={onOpenPalette}
          leading={<MinimalisticMagnifierIcon size={ICON.sm} aria-hidden="true" />}
          trailing={collapsed ? null : <Kbd>Ctrl K</Kbd>}
          className={collapsed ? undefined : 'mb-xs border border-input bg-surface'}
        >
          {collapsed ? undefined : 'Tìm…'}
        </Item>
        {MAIN.map(row)}
        {collapsed ? (
          <span aria-hidden="true" className="mx-auto my-xs h-px w-6 shrink-0 bg-line" />
        ) : (
          <p className="m-0 px-xs pt-md pb-2xs text-label-xs text-muted">Tài nguyên</p>
        )}
        {RESOURCES.map(row)}
      </nav>

      <div
        className={cn(
          'flex shrink-0 border-t border-default p-xs',
          collapsed ? 'flex-col items-stretch gap-2xs' : 'items-center gap-2xs'
        )}
      >
        <Item
          collapsed={collapsed}
          label="Cài đặt"
          ariaLabel={connectionNotice ? `Cài đặt — ${connectionNotice}` : undefined}
          active={settingsOpen}
          onClick={onOpenSettings}
          leading={<SettingsIcon size={ICON.sm} aria-hidden="true" />}
          trailing={
            connectionNotice ? (
              <span
                title={connectionNotice}
                className={cn(
                  'size-2 shrink-0 rounded-full bg-warning',
                  collapsed && 'absolute top-1 right-1'
                )}
                aria-hidden="true"
              />
            ) : null
          }
          className={collapsed ? 'relative' : 'flex-1'}
        />
        <Tip label={themeLabel} side={collapsed ? 'right' : 'top'}>
          <CompactButton
            aria-label={themeLabel}
            onClick={onToggleTheme}
            className={collapsed ? 'mx-auto' : undefined}
            icon={theme === 'dark' ? <SunIcon size={ICON.sm} /> : <MoonIcon size={ICON.sm} />}
          />
        </Tip>
      </div>
    </aside>
  )
}

/** One row: icon and label, or only the icon with its label as a tooltip on the rail. */
function Item({
  collapsed,
  label,
  ariaLabel,
  active = false,
  onClick,
  leading,
  trailing,
  className,
  children
}: {
  collapsed: boolean
  label: string
  ariaLabel?: string
  active?: boolean
  onClick(): void
  leading: ReactNode
  trailing?: ReactNode
  className?: string
  children?: ReactNode
}): JSX.Element {
  const item = (
    <NavItem
      active={active}
      onClick={onClick}
      aria-label={ariaLabel ?? (collapsed ? label : undefined)}
      leading={leading}
      trailing={trailing}
      className={className}
    >
      {collapsed ? null : (children ?? label)}
    </NavItem>
  )
  return collapsed ? (
    <Tip label={label} side="right">
      {item}
    </Tip>
  ) : (
    item
  )
}
