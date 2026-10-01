import type { JSX } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

export function TabsRoot(props: BaseTabs.Root.Props): JSX.Element {
  return <BaseTabs.Root {...props} />
}

/** `sm` fits a 36px toolbar; `default` is the standalone size used on the work screens. */
export type TabsSize = 'sm' | 'default'

const listSizes: Record<TabsSize, string> = {
  sm: 'gap-[2px] p-[2px]',
  default: 'gap-[3px] p-[3px]'
}

const tabSizes: Record<TabsSize, string> = {
  sm: 'h-[22px] rounded-[7px] px-2.5',
  default: 'h-[27px] rounded-[8px] px-3'
}

export function TabsList({
  className,
  size = 'default',
  ...props
}: BaseTabs.List.Props & { size?: TabsSize }): JSX.Element {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={['inline-flex items-center rounded-tab bg-control', listSizes[size], className]
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
        'cursor-pointer border-0 bg-transparent text-[12px] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-active:bg-selected data-active:text-ink',
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
