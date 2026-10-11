import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { MoonIcon, SettingsIcon, SunIcon } from '@renderer/components/ui/reicon'

import { CompactButton } from '../components/ui/CompactButton'
import { cn } from '../lib/cn'
import { ICON } from '../components/ui/icon'
import { Tip } from '../components/ui/Tooltip'
import { TopBarSlotContext, TopBarTitleSlotContext } from '../components/ui/topBarSlot'
import type { Theme } from './useTheme'

export interface AppShellProps {
  /** Thanh bên ứng dụng (AppNav) nằm dưới tiêu đề cửa sổ; null ở màn hình chương. */
  nav: ReactNode | null
  /** Cột danh sách cạnh vùng làm việc (như danh sách chương); null nếu màn hình không có. */
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
 * Phần mép phải của thanh tiêu đề dành cho các nút điều khiển cửa sổ của hệ điều hành.
 * Biến `titlebar-area-*` xác định phần không gian còn lại cho ứng dụng, với khoảng đệm tối thiểu 10px.
 */
const BAR_END_PADDING =
  'max(10px, calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw)))'

const BAR_ICON = ICON.sm

/**
 * Khung cửa sổ ứng dụng: thanh tiêu đề chung ở trên cùng, phía dưới gồm thanh điều hướng ứng dụng và cột nội dung trang.
 * Cột trang gồm thanh công cụ trên cùng, cột danh sách tùy chọn và vùng làm việc chính.
 * Cài đặt và đổi theme đặt ở chân thanh bên hoặc cuối thanh công cụ trang. Ctrl+B dùng để đóng/mở thanh bên.
 */
export function AppShell({
  nav,
  sidebar,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onOpenSettings,
  settingsOpen = false,
  children
}: AppShellProps): JSX.Element {
  // Phần tử để gắn các nút điều khiển của màn hình hiện tại (xem `TopBarActions`). Sử dụng state để cập nhật lại khi phần tử tồn tại.
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null)

  // Trình xử lý phím tắt toàn cục; nếu các phần tử bên trong (như ô soạn thảo) đã xử lý và gọi preventDefault(), sự kiện sẽ được bỏ qua.
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
      <div
        data-slot="app-titlebar"
        className="window-drag flex min-w-0 items-center border-b border-default pl-sm"
        style={{ paddingRight: BAR_END_PADDING }}
      >
        <span className="text-label-md font-semibold tracking-heading">Mira</span>
      </div>

      <div data-slot="app-workspace" className="flex min-h-0 min-w-0">
        {nav}
        <div className="grid min-w-0 flex-1 grid-rows-[var(--mira-header-height)_minmax(0,1fr)]">
          <header
            data-slot="page-topbar"
            className="flex min-w-0 items-center gap-xs border-b border-default pr-sm pl-md"
          >
            <div ref={setTitleSlot} className="flex min-w-0 items-center gap-xs" />
            <div className="flex-1" />
            <div ref={setSlot} className="flex shrink-0 items-center gap-xs empty:hidden" />
            {nav === null && (
              // Phân cách các nút của màn hình hiện tại với các nút chung của ứng dụng; chỉ hiển thị khi có nút tùy chỉnh.
              <span
                className="hidden h-4 w-px shrink-0 bg-line [:not(:empty)+&]:block"
                aria-hidden="true"
              />
            )}
            {nav === null && (
              <div className="flex shrink-0 items-center gap-2xs">
                <Tip label={themeLabel}>
                  <CompactButton
                    aria-label={themeLabel}
                    onClick={onToggleTheme}
                    icon={
                      theme === 'dark' ? <SunIcon size={BAR_ICON} /> : <MoonIcon size={BAR_ICON} />
                    }
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
            )}
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
              <TopBarTitleSlotContext.Provider value={titleSlot}>
                <TopBarSlotContext.Provider value={slot}>
                  <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
                </TopBarSlotContext.Provider>
              </TopBarTitleSlotContext.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
