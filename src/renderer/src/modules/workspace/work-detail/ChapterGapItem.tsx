import type { JSX } from 'react'
import { cn } from '../../../lib/cn'

export interface ChapterGapItemProps {
  missingCount: number
  startNumber?: number
  endNumber?: number
  className?: string
}

export function ChapterGapItem({
  missingCount,
  startNumber,
  endNumber,
  className
}: ChapterGapItemProps): JSX.Element {
  const label =
    startNumber !== undefined && endNumber !== undefined && missingCount > 1
      ? `Khuyết ${missingCount} chương (${startNumber}–${endNumber})`
      : `Khuyết ${missingCount} chương`

  return (
    <li
      aria-label={label}
      data-slot="chapter-gap-item"
      className={cn(
        'my-1 flex items-center justify-center gap-2 border-y border-dashed border-subtle bg-muted/15 px-3 py-1 text-body-2xs text-muted select-none',
        className
      )}
    >
      <span className="h-px flex-1 bg-subtle/50" aria-hidden="true" />
      <span className="font-mono font-medium">{label}</span>
      <span className="h-px flex-1 bg-subtle/50" aria-hidden="true" />
    </li>
  )
}
