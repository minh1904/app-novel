import type { JSX } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { focusRing } from './focusRing'

export function TabsRoot(props: BaseTabs.Root.Props): JSX.Element {
  return <BaseTabs.Root {...props} />
}

/** `sm` fits a 36px toolbar; `default` is the standalone size used on the work screens. */
export type TabsSize = 'sm' | 'default'

const listSizes: Record<TabsSize, string> = {
  sm: 'gap-0.5 p-0.5',
  default: 'gap-1 border-b border-line'
}

const tabSizes: Record<TabsSize, string> = {
  sm: 'h-5 rounded-badge px-2.5 text-ui-2xs font-medium',
  default: 'h-8 border-b-2 border-transparent px-3 text-ui-xs font-medium data-active:border-focus'
}

export function TabsList({
  className,
  size = 'default',
  ...props
}: BaseTabs.List.Props & { size?: TabsSize }): JSX.Element {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={[
        'inline-flex items-center',
        size === 'sm' ? 'rounded-tab bg-tertiary' : '',
        listSizes[size],
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

export function TabsTab({
  className,
  size = 'default',
  ...props
}: BaseTabs.Tab.Props & { size?: TabsSize }): JSX.Element {
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={[
        'cursor-pointer bg-transparent text-ink-muted outline-none transition-colors duration-(--duration-fast) hover:text-ink data-active:text-ink',
        focusRing,
        size === 'sm' ? 'border-0 data-active:bg-canvas data-active:shadow-popover' : '',
        tabSizes[size],
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

export function TabsPanel(props: BaseTabs.Panel.Props): JSX.Element {
  return <BaseTabs.Panel {...props} />
}
