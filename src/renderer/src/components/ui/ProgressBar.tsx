import type { JSX } from 'react'
import { cn } from '../../lib/cn'

const FILLS = {
  neutral: 'bg-inverted',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error'
} as const

/**
 * How far something has got: a 6px track with a fill. The tone states what the fill means (running is
 * info, finished success, stopped error); neutral is plain progress, such as chapters translated.
 */
export function ProgressBar({
  value,
  tone = 'neutral',
  label,
  className
}: {
  /** 0–100; values outside are clamped. */
  value: number
  tone?: keyof typeof FILLS
  /** Names the bar for assistive technology, e.g. "Đã dịch 412 trên 1.430 chương". */
  label: string
  className?: string
}): JSX.Element {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <span
      data-slot="progress-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <span
        className={cn('block h-full rounded-full', FILLS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </span>
  )
}
