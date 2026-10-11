import type { JSX } from 'react'
import { Slider as BaseSlider } from '@base-ui/react/slider'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface SliderProps {
  label: string
  value: number
  onChange(value: number): void
  /**
   * Gọi một lần khi người dùng thả con trượt hoặc kết thúc nhấn phím với giá trị cuối cùng.
   * Biểu mẫu cần lưu giá trị nên lưu tại đây thay vì lưu liên tục trong `onChange`.
   */
  onCommit?(value: number): void
  min?: number
  max?: number
  step?: number
  /** Định dạng chuỗi hiển thị của giá trị cạnh nhãn; mặc định hiển thị theo phần trăm (%). */
  format?(value: number): string
  /** Giữ nhãn cho công nghệ hỗ trợ và chỉ hiển thị giá trị số, thích hợp khi thanh trượt đã có tiêu đề ở hàng ngoài. */
  hideLabel?: boolean
  disabled?: boolean
}

export function Slider({
  label,
  value,
  onChange,
  onCommit,
  min = 0,
  max = 100,
  step = 1,
  format = (current) => current + '%',
  hideLabel = false,
  disabled = false
}: SliderProps): JSX.Element {
  return (
    <BaseSlider.Root
      data-slot="slider"
      className={cn('flex flex-col gap-xs', disabled && 'opacity-50')}
      value={value}
      onValueChange={onChange}
      onValueCommitted={onCommit}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <div
        className={cn(
          'flex text-body-sm text-subtle',
          hideLabel ? 'justify-end' : 'justify-between'
        )}
      >
        <BaseSlider.Label className={hideLabel ? 'sr-only' : undefined}>{label}</BaseSlider.Label>
        <BaseSlider.Value className="text-default tabular-nums">
          {(_, values) => format(values[0] ?? value)}
        </BaseSlider.Value>
      </div>
      <BaseSlider.Control className="flex h-5 w-full items-center data-disabled:cursor-not-allowed">
        <BaseSlider.Track className="relative h-1 w-full rounded-full bg-muted">
          <BaseSlider.Indicator className="h-full rounded-full bg-inverted" />
          <BaseSlider.Thumb
            className={cn(
              'block size-4 rounded-full border border-default bg-surface shadow-sm',
              'transition-[transform,box-shadow] duration-(--mira-duration-fast) ease-standard hover:scale-110 active:scale-95',
              focusRing
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
