import type { JSX, ReactNode } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

export interface ActionRowProps extends Omit<BaseButton.Props, 'className' | 'children' | 'title'> {
  title: ReactNode
  /** One or more lines under the title. */
  description?: ReactNode
  /** A badge beside the title. */
  tag?: ReactNode
  /** An icon or a logo before the text. */
  leading?: ReactNode
  /**
   * Set for a row that opens a section below it instead of leading away: the chevron points down and
   * turns up while open, and the row carries aria-expanded.
   */
  expanded?: boolean
  /** The recommended choice of a list: it rests on the hover tint. */
  featured?: boolean
  /** Hides the chevron, e.g. for a row that only shows a state. */
  noChevron?: boolean
  className?: string
}

/**
 * A choice that leads somewhere: a title, a description and a chevron, the whole row clickable (pick a
 * provider, pick an account). Hover lays the selected overlay; a disabled row loses its chevron.
 */
export function ActionRow({
  title,
  description,
  tag,
  leading,
  expanded,
  featured = false,
  noChevron = false,
  disabled,
  className,
  type = 'button',
  ...props
}: ActionRowProps): JSX.Element {
  return (
    <BaseButton
      data-slot="action-row"
      type={type}
      disabled={disabled}
      aria-expanded={expanded}
      {...props}
      className={cn(
        'flex w-full items-center gap-sm rounded-sm px-sm py-xs text-left',
        'transition-colors duration-(--mira-duration-fast) ease-standard data-disabled:cursor-not-allowed data-disabled:opacity-50',
        featured
          ? 'bg-hover hover:bg-selected'
          : 'hover:bg-selected data-disabled:hover:bg-transparent',
        focusRing,
        className
      )}
    >
      {leading && <span className="flex shrink-0 items-center text-subtle">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-2xs">
        <span className="flex items-center gap-xs text-label-sm">
          {title}
          {tag}
        </span>
        {description && <span className="text-body-xs text-subtle">{description}</span>}
      </span>
      {!disabled &&
        !noChevron &&
        (expanded === undefined ? (
          <AltArrowRightIcon size={ICON.xs} aria-hidden="true" className="shrink-0 text-muted" />
        ) : (
          <AltArrowDownIcon
            size={ICON.xs}
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted transition-transform duration-(--mira-duration-fast)',
              expanded && 'rotate-180'
            )}
          />
        ))}
    </BaseButton>
  )
}
