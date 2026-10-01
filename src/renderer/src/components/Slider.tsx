import type { JSX } from 'react'
import { Slider as BaseSlider } from '@base-ui/react/slider'

export interface SliderProps {
  label: string
  value: number
  onChange(value: number): void
  min?: number
  max?: number
  step?: number
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1
}: SliderProps): JSX.Element {
  return (
    <BaseSlider.Root
      data-slot="slider"
      className="flex flex-col gap-[7px]"
      value={value}
      onValueChange={onChange}
      min={min}
      max={max}
      step={step}
    >
      <div className="flex justify-between text-[12px] text-ink-muted">
        <BaseSlider.Label>{label}</BaseSlider.Label>
        <BaseSlider.Value className="text-ink">
          {(_, values) => values[0] + '%'}
        </BaseSlider.Value>
      </div>
      <BaseSlider.Control className="flex h-7 w-full cursor-ew-resize items-center rounded-control border border-line bg-control outline-none focus-within:ring-2 focus-within:ring-focus/40">
        <BaseSlider.Track className="relative h-full w-full">
          <BaseSlider.Indicator className="h-full rounded-control bg-ink/14" />
          <BaseSlider.Thumb className="block h-[15px] w-[3px] rounded-sm bg-ink outline-none" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
