import type { ButtonHTMLAttributes, JSX, ReactNode, Ref } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'
import { inputFrameVariants } from './variants'

export interface PickerTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** field: on the input frame, full width (a form) · ghost: borderless, in a bar (the composer). */
  variant?: 'field' | 'ghost'
  /** The chosen value; it truncates. */
  value: ReactNode
  /** A short tag after the value, e.g. the thinking level. */
  tag?: ReactNode
  /** A mark after the tag, e.g. a dot for "differs from the default". */
  mark?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/**
 * The button that opens a picker of our own (a popover list, not a Select): the value, an optional
 * tag, a chevron. It forwards every prop and its ref, so it can be the `render` of a Base UI trigger.
 */
export function PickerTrigger({
  variant = 'field',
  value,
  tag,
  mark,
  className,
  ref,
  type = 'button',
  ...props
}: PickerTriggerProps): JSX.Element {
  return (
    <button
      data-slot="picker-trigger"
      ref={ref}
      type={type}
      {...props}
      className={cn(
        variant === 'field'
          ? cn(
              inputFrameVariants({ size: 'md' }),
              'w-full',
              focusRing,
              'cursor-pointer gap-xs pr-xs data-popup-open:bg-(--mira-input-bg-hover)'
            )
          : cn(
              'inline-flex h-8 max-w-64 shrink-0 cursor-pointer items-center gap-2xs rounded-sm px-xs text-body-sm whitespace-nowrap text-subtle',
              'transition-colors duration-(--mira-duration-fast) ease-standard hover:bg-hover hover:text-default data-popup-open:bg-selected data-popup-open:text-default',
              focusRing
            ),
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{value}</span>
      {tag && (
        <span className="shrink-0 rounded-xs bg-muted px-2xs text-body-xs text-subtle">{tag}</span>
      )}
      {mark}
      <AltArrowDownIcon size={ICON.xs} aria-hidden="true" className="shrink-0 text-subtle" />
    </button>
  )
}
