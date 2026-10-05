import type { InputHTMLAttributes, JSX, Ref } from 'react'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { cx } from './cx'

/** `sm` fits a 42px toolbar; `default` is the standalone size. */
export type SearchFieldSize = 'sm' | 'default'

// `size` is omitted along with `type`: the HTML attribute is a number (characters wide) and this one
// is a design-system scale, so the two cannot both live on the same prop.
export interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  label: string
  shortcut?: string
  size?: SearchFieldSize
  ref?: Ref<HTMLInputElement>
}

export function SearchField({
  label,
  shortcut,
  size = 'default',
  className,
  ref,
  ...props
}: SearchFieldProps): JSX.Element {
  const small = size === 'sm'
  return (
    <div
      data-slot="search-field"
      className={cx(
        'relative flex min-w-0 items-center rounded-control border border-line bg-control text-ink focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/25',
        small ? 'h-7' : 'h-8',
        className
      )}
    >
      <MinimalisticMagnifierIcon
        size={small ? 13 : 15}
        className={cx('pointer-events-none absolute text-ink-muted', small ? 'left-2' : 'left-2.5')}
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className={cx(
          'h-full w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden',
          small ? 'pr-2 pl-7' : 'pr-2.5 pl-8'
        )}
        {...props}
      />
      {shortcut && (
        <kbd
          className={cx(
            'pointer-events-none rounded-[5px] border border-line px-1.5 font-sans text-[11px] whitespace-nowrap text-ink-muted',
            small ? 'mr-1.5' : 'mr-2'
          )}
        >
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
