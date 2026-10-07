import type { JSX } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cx } from './cx'
import { focusRing } from './focusRing'

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
        // Hermes switch (apps/desktop/src/components/ui/switch.tsx): 36×20 track, 16px thumb.
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-(--duration-fast) outline-none',
        focusRing,
        'data-[checked]:border-transparent data-[checked]:bg-primary',
        'data-[unchecked]:border-line-strong data-[unchecked]:bg-control',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cx(
          'absolute size-4 rounded-full transition-all duration-(--duration-fast)',
          'data-[checked]:left-[17px] data-[checked]:bg-primary-foreground',
          'data-[unchecked]:left-px data-[unchecked]:bg-ink'
        )}
      />
    </BaseSwitch.Root>
  )
}
