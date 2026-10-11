import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { compactButtonVariants } from './variants'

export interface CompactButtonProps extends Omit<BaseButton.Props, 'className' | 'children'> {
  /** Kiểu hiển thị: ghost (mặc định) | light | dark | outline. */
  variant?: 'ghost' | 'light' | 'dark' | 'outline'
  /** Kích thước: lg 28px · md 24px (mặc định) · sm 20px (kích thước biểu tượng tương ứng 18 / 16 / 12px). */
  size?: 'lg' | 'md' | 'sm'
  round?: boolean
  /** Sắc thái hành động: neutral (mặc định) | success (chấp nhận) | danger (xóa): hiệu ứng hover thể hiện ý nghĩa hành động. */
  tone?: 'neutral' | 'success' | 'danger'
  className?: string
  icon: ReactNode
  /** Bắt buộc: nút không có nhãn chữ hiển thị nên cần aria-label cho công nghệ hỗ trợ. */
  'aria-label': string
}

/** Nút thu gọn chỉ chứa biểu tượng, dùng cho các thanh công cụ, hàng danh sách hoặc thẻ nhãn. */
export function CompactButton({
  variant,
  size,
  round,
  tone,
  className,
  icon,
  type = 'button',
  ...props
}: CompactButtonProps): JSX.Element {
  return (
    <BaseButton
      data-slot="compact-button"
      type={type}
      {...props}
      className={cn(compactButtonVariants({ variant, size, round, tone }), className)}
    >
      {icon}
    </BaseButton>
  )
}
