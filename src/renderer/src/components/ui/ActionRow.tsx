import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { AltArrowDownIcon, AltArrowRightIcon } from '@renderer/components/ui/reicon'

import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

export interface ActionRowProps extends Omit<BaseButton.Props, 'className' | 'children' | 'title'> {
  title: ReactNode
  /** Một hoặc nhiều dòng văn bản dưới tiêu đề. */
  description?: ReactNode
  /** Huy hiệu bên cạnh tiêu đề. */
  tag?: ReactNode
  /** Biểu tượng hoặc logo phía trước văn bản. */
  leading?: ReactNode
  /**
   * Đặt khi hàng dùng để mở/đóng một phần bên dưới thay vì điều hướng: mũi tên trỏ xuống và
   * quay lên khi mở, đồng thời hàng mang aria-expanded.
   */
  expanded?: boolean
  /** Lựa chọn được khuyến nghị trong danh sách: luôn có nền nổi bật nhẹ. */
  featured?: boolean
  /** Ẩn mũi tên điều hướng, ví dụ với hàng chỉ hiển thị trạng thái. */
  noChevron?: boolean
  className?: string
}

/**
 * Hàng hành động có thể nhấn: gồm tiêu đề, mô tả và mũi tên điều hướng (như chọn nhà cung cấp,
 * chọn tài khoản). Hỗ trợ hiệu ứng hover và ẩn mũi tên khi bị vô hiệu hóa.
 */
export function ActionRow({
  title,
  description,
  tag,
  leading,
  expanded,
  featured = false,
  noChevron = false,
  disabled,
  className,
  type = 'button',
  ...props
}: ActionRowProps): JSX.Element {
  return (
    <BaseButton
      data-slot="action-row"
      type={type}
      disabled={disabled}
      aria-expanded={expanded}
      {...props}
      className={cn(
        'flex w-full items-center gap-sm rounded-sm px-sm py-xs text-left',
        'transition-colors duration-(--mira-duration-fast) ease-standard data-disabled:cursor-not-allowed data-disabled:opacity-50',
        featured
          ? 'bg-hover hover:bg-selected'
          : 'hover:bg-selected data-disabled:hover:bg-transparent',
        focusRing,
        className
      )}
    >
      {leading && <span className="flex shrink-0 items-center text-subtle">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-2xs">
        <span className="flex items-center gap-xs text-label-sm">
          {title}
          {tag}
        </span>
        {description && <span className="text-body-xs text-subtle">{description}</span>}
      </span>
      {!disabled &&
        !noChevron &&
        (expanded === undefined ? (
          <AltArrowRightIcon size={ICON.xs} aria-hidden="true" className="shrink-0 text-muted" />
        ) : (
          <AltArrowDownIcon
            size={ICON.xs}
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted transition-transform duration-(--mira-duration-fast)',
              expanded && 'rotate-180'
            )}
          />
        ))}
    </BaseButton>
  )
}
