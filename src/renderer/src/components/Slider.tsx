import type { JSX } from 'react'
import { Slider as BaseSlider } from '@base-ui/react/slider'
import { cx } from './cx'

export interface SliderProps {
  label: string
  value: number
  onChange(value: number): void
  /**
   * Called once when the person lets go of the thumb or finishes a key press, with the final value. A form
   * that saves what the slider says saves here and not on every `onChange`, which fires for every pixel
   * of a drag.
   */
  onCommit?(value: number): void
  min?: number
  max?: number
  step?: number
  /** How the value reads next to the label; the default is a percentage. */
  format?(value: number): string
  /** Keep the label for assistive technology and show only the value, for a slider titled by its row. */
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
      className={cx('flex flex-col gap-[7px]', disabled && 'opacity-50')}
      value={value}
      onValueChange={onChange}
      onValueCommitted={onCommit}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <div
        className={cx(
          'flex text-ui-xs text-ink-muted',
          hideLabel ? 'justify-end' : 'justify-between'
        )}
      >
        <BaseSlider.Label className={hideLabel ? 'sr-only' : undefined}>{label}</BaseSlider.Label>
        <BaseSlider.Value className="text-ink tabular-nums">
          {(_, values) => format(values[0] ?? value)}
        </BaseSlider.Value>
      </div>
      <BaseSlider.Control className="input-chrome flex h-6 w-full cursor-ew-resize items-center rounded-control border outline-none data-disabled:cursor-not-allowed">
        <BaseSlider.Track className="relative h-full w-full">
          <BaseSlider.Indicator className="h-full rounded-control bg-ink/14" />
          <BaseSlider.Thumb className="block h-[15px] w-[3px] rounded-sm bg-ink outline-none" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
