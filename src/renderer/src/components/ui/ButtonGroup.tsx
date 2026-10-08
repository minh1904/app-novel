import type { JSX } from 'react'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface ButtonGroupOption<T extends string> {
  value: T
  label: string
}

export interface ButtonGroupProps<T extends string> {
  /** Names the group for assistive technology. */
  label: string
  value: T
  options: ReadonlyArray<ButtonGroupOption<T>>
  onChange(value: T): void
  size?: 'md' | 'sm'
  className?: string
}

/**
 * One choice out of a few, side by side: a muted track with the chosen option lifted onto the surface.
 * It is as tall as a button of the same size; an option's radius is the track's minus the 2px inset.
 * Exactly one option is always chosen, so pressing the chosen one again changes nothing.
 */
export function ButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className
}: ButtonGroupProps<T>): JSX.Element {
  return (
    <ToggleGroup
      data-slot="button-group"
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const chosen = next[0]
        if (chosen !== undefined) onChange(chosen as T)
      }}
      className={cn(
        'inline-flex items-center gap-3xs bg-muted p-3xs',
        'rounded-sm',
        size === 'md' ? 'h-8' : 'h-6',
        className
      )}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cn(
            'h-full rounded-xs px-sm whitespace-nowrap text-subtle transition-colors duration-(--mira-duration-fast) hover:text-default data-pressed:bg-surface data-pressed:text-default data-pressed:shadow-xs',
            size === 'md' ? 'text-label-sm' : 'px-xs text-label-xs',
            focusRing
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
