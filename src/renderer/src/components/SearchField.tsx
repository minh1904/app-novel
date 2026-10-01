import type { InputHTMLAttributes, JSX, Ref } from 'react'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { cx } from './cx'

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  shortcut?: string
  ref?: Ref<HTMLInputElement>
}

export function SearchField({
  label,
  shortcut,
  className,
  ref,
  ...props
}: SearchFieldProps): JSX.Element {
  return (
    <div
      data-slot="search-field"
      className={cx(
        'relative flex h-[34px] min-w-0 items-center rounded-control border border-line-strong bg-canvas text-ink focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/25',
        className
      )}
    >
      <MinimalisticMagnifierIcon
        size={15}
        className="pointer-events-none absolute left-2.5 text-ink-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className="h-full w-full min-w-0 bg-transparent pr-2.5 pl-8 text-xs outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {shortcut && (
        <kbd className="pointer-events-none mr-2 rounded-[5px] border border-line px-1.5 font-sans text-[11px] whitespace-nowrap text-ink-muted">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
