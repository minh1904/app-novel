import type { JSX, ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cn } from '../../lib/cn'

/** The floating surface every menu and select list sits on. */
export const menuSurfaceClass =
  'rounded-md border border-default bg-surface p-2xs text-body-sm text-default shadow-sm outline-none transition-[opacity,scale] duration-(--mira-duration-base) ease-enter data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0'

/** One row of a menu or a select list: 32px, the selection is a soft overlay. */
export const menuItemClass =
  'flex h-8 cursor-default items-center gap-xs rounded-sm px-xs outline-none select-none data-disabled:text-disabled data-highlighted:bg-hover'

/** Menus open from whatever layer shows them, dialogs included, so they sit on the dropdown rung. */
const positionerClass = 'z-(--mira-z-dropdown)'

export function MenuRoot(props: BaseMenu.Root.Props): JSX.Element {
  return <BaseMenu.Root {...props} />
}

export function MenuTrigger(props: BaseMenu.Trigger.Props): JSX.Element {
  return <BaseMenu.Trigger {...props} />
}

export function MenuPopup({
  children,
  align = 'end'
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
}): JSX.Element {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={positionerClass} sideOffset={6} align={align}>
        <BaseMenu.Popup className={cn(menuSurfaceClass, 'min-w-48')}>{children}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export function MenuItem({
  className,
  tone = 'default',
  ...props
}: Omit<BaseMenu.Item.Props, 'className'> & {
  className?: string
  tone?: 'default' | 'danger'
}): JSX.Element {
  return (
    <BaseMenu.Item
      className={cn(menuItemClass, tone === 'danger' && 'text-error', className)}
      {...props}
    />
  )
}

/** A small heading over a group of rows. */
export function MenuLabel({ children }: { children: ReactNode }): JSX.Element {
  return <div className="px-xs pt-xs pb-2xs text-label-xs text-muted">{children}</div>
}

export function MenuSeparator(): JSX.Element {
  return <BaseMenu.Separator className="-mx-2xs my-2xs h-px bg-(--mira-border)" />
}

/** A menu inside a menu: `MenuSubmenuTrigger` is the row that opens it, `MenuSubmenuPopup` is what opens. */
export function MenuSubmenu(props: BaseMenu.SubmenuRoot.Props): JSX.Element {
  return <BaseMenu.SubmenuRoot {...props} />
}

export function MenuSubmenuTrigger({
  className,
  ...props
}: Omit<BaseMenu.SubmenuTrigger.Props, 'className'> & { className?: string }): JSX.Element {
  return <BaseMenu.SubmenuTrigger className={cn(menuItemClass, className)} {...props} />
}

export function MenuSubmenuPopup({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        className={positionerClass}
        sideOffset={4}
        alignOffset={-5}
        align="start"
      >
        <BaseMenu.Popup className={cn(menuSurfaceClass, 'min-w-40')}>{children}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export function MenuRadioGroup(props: BaseMenu.RadioGroup.Props): JSX.Element {
  return <BaseMenu.RadioGroup {...props} />
}

/** A choice among several, marked with a check. The check is the only thing that says which is chosen. */
export function MenuRadioItem({
  className,
  children,
  ...props
}: Omit<BaseMenu.RadioItem.Props, 'className'> & { className?: string }): JSX.Element {
  return (
    <BaseMenu.RadioItem className={cn(menuItemClass, 'pr-sm', className)} {...props}>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <BaseMenu.RadioItemIndicator>
          <CheckIcon size={14} />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  )
}
