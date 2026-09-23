import type { JSX, ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
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
        <BaseMenu.Popup className="min-w-[184px] rounded-control border border-line bg-popover p-1 text-xs text-ink shadow-[0_8px_28px_rgb(0_0_0/0.14)] outline-none">
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
        'flex h-[30px] cursor-default items-center gap-2 rounded-[7px] px-2 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-selected',
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
