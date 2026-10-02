import type { JSX } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cx } from './cx'

/**
 * Công tắc bật/tắt. Dựng trên Base UI như các control khác của dự án, nên nó là một nút thật có
 * `role="switch"`: bàn phím và trình đọc màn hình hiểu sẵn.
 */
export function Switch({
  className,
  ...props
}: Omit<BaseSwitch.Root.Props, 'className'> & { className?: string }): JSX.Element {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cx(
        'relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-focus/40',
        'data-[checked]:border-transparent data-[checked]:bg-primary',
        'data-[unchecked]:border-line-strong data-[unchecked]:bg-control',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cx(
          'absolute size-3 rounded-full transition-all',
          'data-[checked]:left-[16px] data-[checked]:bg-primary-foreground',
          'data-[unchecked]:left-[2px] data-[unchecked]:bg-ink-muted'
        )}
      />
    </BaseSwitch.Root>
  )
}
