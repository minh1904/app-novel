import type { JSX } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

/*
 * Tab chuyển đổi với hai kiểu dáng:
 *   line  dãy nhãn phía trên đường kẻ mảnh, tab đang mở có đường gạch chân (phân chia khu vực trên màn hình)
 *   pill  thanh rãnh nền mờ với tab đang mở nổi lên trên bề mặt (chuyển đổi chế độ xem trong thanh công cụ)
 */
export type TabsVariant = 'line' | 'pill'

export function TabsRoot(props: BaseTabs.Root.Props): JSX.Element {
  return <BaseTabs.Root {...props} />
}

export function TabsList({
  className,
  variant = 'line',
  ...props
}: Omit<BaseTabs.List.Props, 'className'> & {
  className?: string
  variant?: TabsVariant
}): JSX.Element {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex items-center',
        variant === 'line'
          ? // Đường kẻ mảnh được vẽ bên trong danh sách (::before, dưới các tab) thay vì làm viền mà
            // các tab đè lên bằng lề âm (negative margin), tránh việc thanh tab cuộn bị cuộn dọc.
            'relative gap-md before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-line'
          : 'h-8 gap-3xs rounded-sm bg-muted p-3xs',
        className
      )}
      {...props}
    />
  )
}

export function TabsTab({
  className,
  variant = 'line',
  ...props
}: Omit<BaseTabs.Tab.Props, 'className'> & {
  className?: string
  variant?: TabsVariant
}): JSX.Element {
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        'inline-flex items-center gap-2xs text-subtle transition-colors duration-(--mira-duration-fast) hover:text-default data-active:text-default',
        variant === 'line'
          ? 'relative h-8 text-label-sm after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-active:after:bg-(--mira-text)'
          : 'h-full rounded-xs px-sm text-label-xs data-active:bg-surface data-active:shadow-xs',
        focusRing,
        className
      )}
      {...props}
    />
  )
}

export function TabsPanel(props: BaseTabs.Panel.Props): JSX.Element {
  return <BaseTabs.Panel {...props} />
}
