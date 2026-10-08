import type { JSX } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

/**
 * An on/off switch, 36×20. A real button with role="switch", so keyboards and screen readers know it.
 * Give it a label: wrap it in a <label>, or pass aria-label.
 */
export function Switch({
  className,
  ...props
}: Omit<BaseSwitch.Root.Props, 'className'> & { className?: string }): JSX.Element {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-(--mira-switch-track) transition-colors duration-(--mira-duration-fast) ease-standard',
        'data-checked:bg-(--mira-switch-track-on) data-disabled:cursor-not-allowed data-disabled:opacity-50',
        focusRing,
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          'absolute left-0.5 size-4 rounded-full bg-(--mira-switch-thumb) shadow-xs transition-transform duration-(--mira-duration-fast) ease-standard',
          'data-checked:translate-x-4 data-checked:bg-(--mira-switch-thumb-on)'
        )}
      />
    </BaseSwitch.Root>
  )
}
