import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Hàng cài đặt: tên và mô tả ở bên trái, phần tử điều khiển ở bên phải. Sử dụng truy vấn khung
 * chứa (container query) để tự động đẩy phần tử điều khiển xuống dưới mô tả khi khung hiển thị hẹp.
 * `wide` giữ phần tử điều khiển cùng hàng tiêu đề và dành toàn bộ chiều rộng cho phần `below`.
 *
 * Gợi ý hiển thị trực tiếp trên hàng để người dùng dễ đọc trước khi tương tác.
 */
export function SettingRow({
  title,
  hint,
  children,
  below,
  wide = false,
  id
}: {
  title: string
  hint?: ReactNode
  children?: ReactNode
  below?: ReactNode
  wide?: boolean
  /** Điểm neo định danh (ID) để liên kết sâu có thể cuộn tới và làm nổi bật. */
  id?: string
}): JSX.Element {
  return (
    <div data-slot="setting-row" data-setting-id={id} className="@container py-sm">
      <div
        className={cn(
          'grid gap-sm',
          wide
            ? 'grid-cols-[minmax(0,1fr)_auto] items-start'
            : '@2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] @2xl:items-center'
        )}
      >
        <div className="flex min-w-0 flex-col gap-3xs">
          <span className="text-label-sm text-default">{title}</span>
          {hint && <span className="text-body-xs text-muted">{hint}</span>}
        </div>
        {/* Khung điều khiển lấp đầy cột của nó: ô nhập lấy độ rộng từ khung bao ngoài thay vì
            độ dài văn bản bên trong, tránh làm ô nhập bị co lại quá mức. */}
        {children && (
          <div className="flex min-w-0 flex-wrap items-center gap-xs @2xl:justify-end">
            {children}
          </div>
        )}
      </div>
      {below && <div className="mt-xs">{below}</div>}
    </div>
  )
}

/** Tiêu đề phần cho một nhóm hàng, có chỗ hiển thị số lượng hoặc nút hành động phụ. */
export function SectionHeading({
  icon,
  children,
  aside
}: {
  icon?: ReactNode
  children: ReactNode
  aside?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-2xs flex items-center gap-xs pt-xs">
      {icon && <span className="flex text-muted">{icon}</span>}
      <h3 className="m-0 text-heading">{children}</h3>
      {aside && <span className="ml-auto flex items-center gap-xs">{aside}</span>}
    </div>
  )
}

/** Nhóm các hàng cài đặt: gồm tiêu đề và các hàng nội dung, phân cách bằng khoảng trắng. */
export function SettingsSection({
  title,
  icon,
  aside,
  children
}: {
  title?: string
  icon?: ReactNode
  aside?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <section className="mb-xl">
      {title && (
        <SectionHeading icon={icon} aside={aside}>
          {title}
        </SectionHeading>
      )}
      <div>{children}</div>
    </section>
  )
}
