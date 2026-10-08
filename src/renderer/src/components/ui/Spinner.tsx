import type { JSX } from 'react'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { cn } from '../../lib/cn'

/** Work in progress, for a button or a small area. A screen that loads shows a skeleton instead. */
export function Spinner({
  size = 16,
  className,
  label
}: {
  size?: number
  className?: string
  /** Announced to assistive technology; omit when the spinner sits inside a labelled button. */
  label?: string
}): JSX.Element {
  return (
    <span
      data-slot="spinner"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0', className)}
    >
      <RefreshIcon size={size} className="animate-spin" />
    </span>
  )
}
