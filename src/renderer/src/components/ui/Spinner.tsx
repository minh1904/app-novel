import type { JSX } from 'react'
import { RefreshIcon } from '@renderer/components/ui/reicon'

import { cn } from '../../lib/cn'

/** Biểu tượng xoay báo tiến trình đang chạy, dùng cho nút bấm hoặc khu vực nhỏ. Màn hình đang tải dùng khung xương (skeleton). */
export function Spinner({
  size = 16,
  className,
  label
}: {
  size?: number
  className?: string
  /** Nhãn thông báo cho công nghệ hỗ trợ; có thể bỏ qua khi spinner nằm trong nút đã có nhãn. */
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
