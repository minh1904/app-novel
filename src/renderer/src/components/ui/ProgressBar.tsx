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
 * Thanh tiến trình: thanh rãnh 6px kèm dải màu biểu thị mức độ hoàn thành. Sắc thái màu
 * thể hiện trạng thái (đang chạy là info, xong là success, lỗi là error, neutral là tiến trình thông thường).
 */
export function ProgressBar({
  value,
  tone = 'neutral',
  label,
  className
}: {
  /** Giá trị từ 0–100; các giá trị ngoài khoảng sẽ được giới hạn lại. */
  value: number
  tone?: keyof typeof FILLS
  /** Tên nhãn cho công nghệ hỗ trợ tiếp cận, ví dụ "Đã dịch 412 trên 1.430 chương". */
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
        className={cn(
          'block h-full rounded-full transition-[width] duration-(--mira-duration-base) ease-standard',
          FILLS[tone]
        )}
        style={{ width: `${clamped}%` }}
      />
    </span>
  )
}
