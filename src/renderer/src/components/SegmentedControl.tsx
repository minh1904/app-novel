import type { JSX } from 'react'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { cx } from './cx'
import { focusRing } from './focusRing'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive technology. */
  label: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange(value: T): void
  className?: string
}

/**
 * One choice out of a few, shown side by side (Hermes apps/desktop/src/components/ui/segmented-control.tsx):
 * a tinted track and a raised pill on the chosen option. Exactly one option is always chosen, so pressing
 * the chosen one again changes nothing.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <ToggleGroup
      data-slot="segmented-control"
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const chosen = next[0]
        if (chosen !== undefined) onChange(chosen as T)
      }}
      className={cx('inline-flex items-center gap-0.5 rounded-tab bg-tertiary p-0.5', className)}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cx(
            'h-5 cursor-pointer rounded-badge px-2.5 text-ui-2xs font-medium text-ink-muted outline-none transition-colors duration-(--duration-fast) hover:text-ink data-pressed:bg-canvas data-pressed:text-ink data-pressed:shadow-popover',
            focusRing
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
