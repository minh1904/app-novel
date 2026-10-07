import type { JSX, ReactNode } from 'react'
import { cx } from './cx'

export type BadgeTone = 'success' | 'warning' | 'error' | 'muted'

/**
 * Nhãn trạng thái nhỏ: một chấm màu cộng một chữ.
 *
 * Không tô nền: ở theme sáng, chữ cảnh báo trên nền tint chỉ đạt 4,20:1 và chữ thành công 4,25:1,
 * dưới ngưỡng 4,5:1 — đo trên wireframe ngày 2026-10-02. Chấm màu cộng viền đã đủ để phân biệt.
 */
const tones: Record<BadgeTone, string> = {
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  error: 'border-error/40 text-error',
  muted: 'border-line-strong text-ink-muted'
}

const dots: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  muted: 'bg-ink-muted'
}

export function Badge({
  tone = 'muted',
  children,
  className
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <span
      data-slot="badge"
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-badge border bg-transparent px-1.5 py-0.5 text-ui-2xs leading-none font-medium whitespace-nowrap',
        tones[tone],
        className
      )}
    >
      <span className={cx('size-1.5 shrink-0 rounded-full', dots[tone])} />
      {children}
    </span>
  )
}
