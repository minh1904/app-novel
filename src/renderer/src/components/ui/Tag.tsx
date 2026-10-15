import type { JSX, ReactNode } from 'react'
import { CloseIcon } from './reicon'
import { focusRing } from './focus'
import { ICON } from './icon'
import { cn } from '../../lib/cn'

/** Nhãn nhỏ 24 px bỏ được, ví dụ ngữ cảnh gửi kèm trên ô soạn; chỉ nút × là vùng bấm. */
export function Tag({
  children,
  removeLabel,
  onRemove,
  className
}: {
  children: ReactNode
  /** Tên đọc được của nút ×, ví dụ "Bỏ ngữ cảnh Chương 1". */
  removeLabel: string
  onRemove(): void
  className?: string
}): JSX.Element {
  return (
    <span
      data-slot="tag"
      className={cn(
        'inline-flex h-6 min-w-0 max-w-full items-center gap-2xs rounded-xs bg-muted pr-0.5 pl-1.5 text-label-xs text-default',
        className
      )}
    >
      <span className="truncate">{children}</span>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-subtle hover:bg-(--mira-input-bg-hover) hover:text-default',
          focusRing
        )}
      >
        <CloseIcon size={ICON.xs} aria-hidden="true" />
      </button>
    </span>
  )
}
