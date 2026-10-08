import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'
import { BUTTON_ICON, buttonVariants, linkButtonVariants } from './variants'

export interface ButtonProps extends Omit<BaseButton.Props, 'className' | 'color'> {
  /** neutral (default) | danger, for deleting. */
  color?: 'neutral' | 'danger'
  /** solid is the screen's primary action; outline (default) every other one. */
  variant?: 'solid' | 'outline' | 'light' | 'ghost'
  /** lg 40px (at most one per screen) · md 32px (default) · sm 24px (rows, toolbars). */
  size?: 'lg' | 'md' | 'sm'
  className?: string
  /** An icon before the label. */
  leftIcon?: ReactNode
  /** An icon after the label. */
  rightIcon?: ReactNode
  /** An icon-only (square) button; it needs an aria-label. A 24px or smaller one is a CompactButton. */
  icon?: ReactNode
  /** Swaps the left icon for a spinner, locks the button and keeps its width. */
  loading?: boolean
  children?: ReactNode
}

/** A button of the design system (IZONE LMS model on Mira's tokens). */
export function Button({
  color,
  variant,
  size = 'md',
  className,
  leftIcon,
  rightIcon,
  icon,
  loading = false,
  disabled,
  focusableWhenDisabled,
  type = 'button',
  children,
  ...props
}: ButtonProps): JSX.Element {
  const iconOnly = icon !== undefined
  return (
    <BaseButton
      data-slot="button"
      type={type}
      {...props}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ color, variant, size, iconOnly }), className)}
    >
      {iconOnly ? (
        loading ? (
          <Spinner size={BUTTON_ICON[size]} />
        ) : (
          icon
        )
      ) : (
        <>
          {loading ? <Spinner size={BUTTON_ICON[size]} /> : leftIcon}
          {children != null && <span className="inline-flex items-center gap-2xs">{children}</span>}
          {rightIcon}
        </>
      )}
    </BaseButton>
  )
}

export interface LinkButtonProps extends Omit<BaseButton.Props, 'className' | 'color'> {
  /** link (default, the link colour) | neutral (subtle text) | warning (something waits). */
  color?: 'link' | 'neutral' | 'warning'
  size?: 'md' | 'sm'
  className?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

/** A text action: link colour, underline on hover. */
export function LinkButton({
  color,
  size,
  className,
  leftIcon,
  rightIcon,
  type = 'button',
  children,
  ...props
}: LinkButtonProps): JSX.Element {
  return (
    <BaseButton
      data-slot="link-button"
      type={type}
      {...props}
      className={cn(linkButtonVariants({ color, size }), className)}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </BaseButton>
  )
}
