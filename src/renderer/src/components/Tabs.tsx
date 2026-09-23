import type { JSX } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

export function TabsRoot(props: BaseTabs.Root.Props): JSX.Element {
  return <BaseTabs.Root {...props} />
}

export function TabsList({ className, ...props }: BaseTabs.List.Props): JSX.Element {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={['inline-flex items-center gap-[3px] rounded-tab bg-control p-[3px]', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

export function TabsTab({ className, ...props }: BaseTabs.Tab.Props): JSX.Element {
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={[
        'h-[27px] cursor-pointer rounded-[8px] border-0 bg-transparent px-3 text-[11px] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-active:bg-selected data-active:text-ink',
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
