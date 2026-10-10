import type { JSX, ReactNode } from 'react'
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import { cn } from '../../lib/cn'
import { menuItemClass, menuSurfaceClass } from './DropdownMenu'

// Items inherit data-highlighted focus styling from menuItemClass
const positionerClass = 'z-(--mira-z-dropdown)'

export function ContextMenuRoot(props: BaseContextMenu.Root.Props): JSX.Element {
  return <BaseContextMenu.Root {...props} />
}

export function ContextMenuTrigger(props: BaseContextMenu.Trigger.Props): JSX.Element {
  return <BaseContextMenu.Trigger {...props} />
}

export function ContextMenuPopup({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className={positionerClass}>
        <BaseContextMenu.Popup className={cn(menuSurfaceClass, 'min-w-48')}>
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  )
}

export function ContextMenuItem({
  className,
  tone = 'default',
  ...props
}: Omit<BaseContextMenu.Item.Props, 'className'> & {
  className?: string
  tone?: 'default' | 'danger'
}): JSX.Element {
  return (
    <BaseContextMenu.Item
      className={cn(menuItemClass, tone === 'danger' && 'text-error', className)}
      {...props}
    />
  )
}

export function ContextMenuSeparator(): JSX.Element {
  return <BaseContextMenu.Separator className="-mx-2xs my-2xs h-px bg-(--mira-border)" />
}
