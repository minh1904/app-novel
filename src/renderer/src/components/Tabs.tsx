import { Tabs as BaseTabs } from '@base-ui/react/tabs'

function List({ className, ...props }: BaseTabs.List.Props) {
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

function Tab({ className, ...props }: BaseTabs.Tab.Props) {
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

export const Tabs = {
  Root: BaseTabs.Root,
  List,
  Tab,
  Panel: BaseTabs.Panel
}
