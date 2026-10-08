import type { JSX, ReactElement, ReactNode } from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'

/** A tooltip opens after 200ms; while the pointer moves along a row, the next one opens at once. */
const OPEN_DELAY = 200

/** Wraps the app once, so neighbouring tooltips share one open delay. */
export function TooltipProvider({ children }: { children: ReactNode }): JSX.Element {
  return <BaseTooltip.Provider delay={OPEN_DELAY}>{children}</BaseTooltip.Provider>
}

export interface TipProps {
  /** What the control does, in a few words. */
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** The control the tooltip describes; it must accept a ref and props (a button, not a fragment). */
  children: ReactElement
}

/**
 * Text-only help on hover, colours inverted. It names an icon-only control; what a field does belongs
 * in the row beside it, because a tooltip is not there for touch.
 */
export function Tip({ label, side = 'bottom', children }: TipProps): JSX.Element {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="z-(--mira-z-tooltip)" side={side} sideOffset={6}>
          <BaseTooltip.Popup
            data-slot="tooltip"
            className="max-w-80 rounded-xs bg-(--mira-tooltip-bg) px-xs py-2xs text-label-xs text-(--mira-tooltip-fg) shadow-sm transition-opacity duration-(--mira-duration-fast) data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
