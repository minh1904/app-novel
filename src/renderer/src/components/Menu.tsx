import type { JSX, ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cx } from './cx'

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
      <BaseMenu.Positioner sideOffset={6} align={align}>
        <BaseMenu.Popup className="min-w-[184px] rounded-control border border-line-strong bg-popover p-1 text-ui-sm text-ink shadow-popover outline-none">
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
      className={cx(
        'flex h-7 cursor-default items-center gap-2 rounded-item px-2 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-hover',
        tone === 'destructive' && 'text-error',
        className
      )}
      {...props}
    />
  )
}

export function MenuSeparator(): JSX.Element {
  return <BaseMenu.Separator className="mx-1 my-1 h-px bg-line" />
}

const itemClass =
  'flex h-7 cursor-default items-center gap-2 rounded-item px-2 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-hover'

/** A menu inside a menu: `MenuSubmenuTrigger` is the row that opens it, `MenuSubmenuPopup` is what opens. */
export function MenuSubmenu(props: BaseMenu.SubmenuRoot.Props): JSX.Element {
  return <BaseMenu.SubmenuRoot {...props} />
}

export function MenuSubmenuTrigger({
  className,
  ...props
}: Omit<BaseMenu.SubmenuTrigger.Props, 'className'> & { className?: string }): JSX.Element {
  return <BaseMenu.SubmenuTrigger className={cx(itemClass, className)} {...props} />
}

export function MenuSubmenuPopup({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={4} alignOffset={-5} align="start">
        <BaseMenu.Popup className="min-w-[164px] rounded-control border border-line-strong bg-popover p-1 text-ui-sm text-ink shadow-popover outline-none">
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
    <BaseMenu.RadioItem className={cx(itemClass, 'pr-3', className)} {...props}>
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <BaseMenu.RadioItemIndicator>
          <CheckIcon size={13} />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  )
}
