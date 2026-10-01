import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'ghost-muted'
  | 'destructive'
  | 'link'

export type ButtonSize = 'xxs' | 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon' | 'icon-lg'

const base =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-control border font-medium whitespace-nowrap select-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/40 data-disabled:pointer-events-none data-disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground hover:brightness-90',
  outline: 'border-line-strong bg-transparent text-ink hover:bg-selected',
  secondary: 'border-transparent bg-control text-ink hover:bg-selected',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-selected',
  'ghost-muted':
    'border-transparent bg-transparent text-ink-muted hover:bg-selected hover:text-ink',
  destructive: 'border-error/35 bg-error/15 text-error hover:bg-error/25',
  link: 'border-transparent bg-transparent px-0 text-ink underline underline-offset-3'
}

const sizes: Record<ButtonSize, string> = {
  xxs: 'h-[18px] px-1.5 text-[10px]',
  xs: 'h-[22px] px-2 text-[11px]',
  sm: 'h-6 px-2 text-[11px]',
  default: 'h-7 px-2.5 text-xs',
  lg: 'h-[34px] px-3.5 text-[13px]',
  xl: 'h-10 px-4 text-[13px]',
  icon: 'size-7 p-0',
  'icon-lg': 'size-[34px] p-0'
}

export interface ButtonProps extends Omit<BaseButton.Props, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

export function Button({
  variant = 'default',
  size = 'default',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps): JSX.Element {
  return (
    <BaseButton
      data-slot="button"
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')}
      type={type}
      {...props}
    >
      {children}
    </BaseButton>
  )
}
