import type { JSX } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

/*
 * Tabs in two styles:
 *   line  a row of labels over a hairline, the open one underlined (sections of a screen)
 *   pill  a muted track with the open tab lifted onto the surface (a few views of one list, in a bar)
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
          ? // The hairline is drawn inside the list (::before, under the tabs) rather than as a border the
            // tabs overlap with a negative margin: that 1px overhang made a scrolling tab bar scroll
            // vertically too.
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
