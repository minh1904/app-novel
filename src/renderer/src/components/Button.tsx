import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { cx } from './cx'
import { focusRing } from './focusRing'

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'ghost-muted'
  | 'destructive'
  | 'link'
  | 'text'

export type ButtonSize = 'xxs' | 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon' | 'icon-lg'

// Hermes Desktop's button (apps/desktop/src/components/ui/button.tsx): flat, 12px medium text, square
// text buttons and 4px icon buttons, a 100ms state change.
const base = cx(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap select-none outline-none transition-all duration-(--duration-fast) data-disabled:pointer-events-none data-disabled:cursor-default data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  focusRing
)

const variants: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  outline: 'bg-transparent text-ink shadow-outline hover:bg-control-hover',
  secondary: 'bg-control text-ink hover:bg-control-hover',
  ghost: 'bg-transparent text-ink hover:bg-control-hover',
  'ghost-muted': 'bg-transparent text-ink-muted hover:bg-control-hover hover:text-ink',
  destructive: 'bg-error text-white hover:bg-error/90 dark:bg-error/60 dark:hover:bg-error/70',
  link: 'bg-transparent px-0 text-primary decoration-current/20 underline-offset-4 hover:underline',
  text: 'bg-transparent px-0 text-ink-muted underline-offset-4 hover:text-ink hover:underline'
}

const sizes: Record<ButtonSize, string> = {
  xxs: 'h-[18px] rounded-control px-1.5 text-ui-2xs',
  xs: 'h-5 gap-1 rounded-control px-2 text-ui-2xs',
  sm: 'h-6 rounded-control px-2.5 text-ui-xs',
  default: 'h-(--control-height) rounded-control px-3 text-ui-xs',
  lg: 'h-9 rounded-control px-5 text-ui-md',
  xl: 'h-10 rounded-control px-5 text-ui-md',
  icon: 'size-6 rounded-icon p-0',
  'icon-lg': 'size-8 rounded-icon p-0'
}

export interface ButtonProps extends Omit<BaseButton.Props, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  /** Shows a spinner over the label and keeps the button's size, so the row around it does not move. */
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'default',
  size = 'default',
  className,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps): JSX.Element {
  return (
    <BaseButton
      data-slot="button"
      // `relative` only while loading (the spinner sits over the label): always on, it would beat an
      // `absolute` a caller passes in, since the two utilities have the same weight.
      className={cx(base, loading && 'relative', variants[variant], sizes[size], className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-[inherit]">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <RefreshIcon size={14} className="animate-spin" />
          </span>
        </>
      ) : (
        children
      )}
    </BaseButton>
  )
}
