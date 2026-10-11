import type { HTMLAttributes, JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { badgeVariants } from './variants'

const DOTS = {
  neutral: 'bg-current opacity-60',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-accent'
} as const

export type BadgeColor = keyof typeof DOTS

/** Nhãn ngắn thể hiện trạng thái hoặc phân loại danh mục. */
export function Badge({
  color = 'neutral',
  variant,
  dot = false,
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & {
  color?: BadgeColor
  /** Kiểu hiển thị: light (nền nhạt, mặc định) | outline (viền ngoài) | plain (văn bản thuần). */
  variant?: 'light' | 'outline' | 'plain'
  /** Dấu chấm tròn trước văn bản thể hiện trạng thái. */
  dot?: boolean
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <span data-slot="badge" {...props} className={cn(badgeVariants({ color, variant }), className)}>
      {dot && (
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOTS[color])} />
      )}
      {children}
    </span>
  )
}
