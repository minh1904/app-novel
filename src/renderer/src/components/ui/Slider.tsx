import type { JSX } from 'react'
import { Slider as BaseSlider } from '@base-ui/react/slider'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface SliderProps {
  label: string
  value: number
  onChange(value: number): void
  /**
   * Called once when the person lets go of the thumb or finishes a key press, with the final value. A
   * form that saves what the slider says saves here, not on every `onChange` (one per pixel of a drag).
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
              focusRing
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
