import type { JSX, Ref, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

/** A multi-line field on the same frame as Input. */
export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      ref={ref}
      className={cn(
        'min-h-20 w-full resize-y rounded-sm border border-(--mira-input-border) bg-(--mira-input-bg) px-sm py-xs text-body-sm text-(--mira-input-fg) placeholder:text-placeholder',
        'transition-colors duration-(--mira-duration-fast) ease-standard hover:bg-(--mira-input-bg-hover)',
        'aria-invalid:border-error disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled',
        focusRing,
        className
      )}
      {...props}
    />
  )
}
