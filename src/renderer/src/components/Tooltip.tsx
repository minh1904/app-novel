import type { JSX, ReactElement, ReactNode } from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'

/** Hermes opens a tooltip after 200ms and keeps the next one instant while the pointer moves along a row. */
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
 * A tooltip in Hermes Desktop's style (apps/desktop/src/components/ui/tooltip.tsx): the colours inverted,
 * 11px medium text, a small arrow, no entrance animation. It names an icon-only control; what a field does
 * still belongs in the row beside it (see SettingRow), because a tooltip is not there for touch.
 */
export function Tip({ label, side = 'bottom', children }: TipProps): JSX.Element {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="z-(--z-over-modal)" side={side} sideOffset={6}>
          <BaseTooltip.Popup
            data-slot="tooltip"
            className="max-w-96 rounded-icon bg-ink px-2 py-1 text-ui-2xs leading-tight font-medium text-canvas transition-opacity duration-(--duration-fast) data-ending-style:opacity-0"
          >
            {label}
            <BaseTooltip.Arrow className="data-[side=bottom]:-top-[5px] data-[side=left]:-right-[7px] data-[side=left]:rotate-90 data-[side=right]:-left-[7px] data-[side=right]:-rotate-90 data-[side=top]:-bottom-[5px] data-[side=top]:rotate-180">
              <svg
                width="10"
                height="5"
                viewBox="0 0 10 5"
                aria-hidden="true"
                className="block fill-ink"
              >
                <path d="M0 5 L5 0 L10 5 Z" />
              </svg>
            </BaseTooltip.Arrow>
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
