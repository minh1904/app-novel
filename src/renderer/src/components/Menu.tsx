import type { JSX, ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cx } from './cx'

/**
 * Hermes Desktop's menu surface (apps/desktop/src/components/ui/menu.ts): a nearly opaque raised fill that
 * blurs what is behind it, a soft shadow, 4px padding, 12px rows. Select reuses both classes.
 */
export const menuSurfaceClass =
  'rounded-control border border-line-strong bg-popover p-1 text-ui-xs text-ink shadow-popover backdrop-blur-md outline-none'

export const menuItemClass =
  'flex h-6 cursor-default items-center gap-2 rounded-item px-2 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-active'

/** Popups float over dialogs too, so they sit on the modal-popover rung. */
const positionerClass = 'z-(--z-modal-popover)'

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
        <BaseMenu.Popup className={cx(menuSurfaceClass, 'min-w-[184px]')}>
          {children}
        </BaseMenu.Popup>
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
  tone?: 'default' | 'destructive'
}): JSX.Element {
  return (
    <BaseMenu.Item
      className={cx(menuItemClass, tone === 'destructive' && 'text-error', className)}
      {...props}
    />
  )
}

export function MenuSeparator(): JSX.Element {
  return <BaseMenu.Separator className="-mx-1 my-1 h-px bg-line" />
}

/** A menu inside a menu: `MenuSubmenuTrigger` is the row that opens it, `MenuSubmenuPopup` is what opens. */
export function MenuSubmenu(props: BaseMenu.SubmenuRoot.Props): JSX.Element {
  return <BaseMenu.SubmenuRoot {...props} />
}

export function MenuSubmenuTrigger({
  className,
  ...props
}: Omit<BaseMenu.SubmenuTrigger.Props, 'className'> & { className?: string }): JSX.Element {
  return <BaseMenu.SubmenuTrigger className={cx(menuItemClass, className)} {...props} />
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
        <BaseMenu.Popup className={cx(menuSurfaceClass, 'min-w-[164px]')}>
          {children}
        </BaseMenu.Popup>
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
    <BaseMenu.RadioItem className={cx(menuItemClass, 'pr-3', className)} {...props}>
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <BaseMenu.RadioItemIndicator>
          <CheckIcon size={13} />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  )
}
