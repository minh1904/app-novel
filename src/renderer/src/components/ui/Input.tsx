import type { InputHTMLAttributes, JSX, ReactNode, Ref } from 'react'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { cn } from '../../lib/cn'
import { inputFrameVariants } from './variants'

export const inputElementClass =
  'h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder disabled:cursor-not-allowed'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'md' | 'sm'
  /** Classes for the frame (width, margin). */
  className?: string
  inputClassName?: string
  leftIcon?: ReactNode
  /** An icon, a short hint or a compact button after the text. */
  rightSlot?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/** A one-line field without a label; put it in a Field, or give it an aria-label. */
export function Input({
  size,
  className,
  inputClassName,
  leftIcon,
  rightSlot,
  ref,
  ...props
}: InputProps): JSX.Element {
  return (
    <div data-slot="input" className={cn(inputFrameVariants({ size }), className)}>
      {leftIcon}
      <input ref={ref} className={cn(inputElementClass, inputClassName)} {...props} />
      {rightSlot}
    </div>
  )
}

export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  /** Names the field for assistive technology. */
  label: string
  /** A keyboard shortcut shown at the end, e.g. "Ctrl F". */
  shortcut?: string
}

/** A search box: a magnifier, the field and an optional shortcut hint. */
export function SearchInput({ label, shortcut, size, ...props }: SearchInputProps): JSX.Element {
  return (
    <Input
      type="search"
      aria-label={label}
      size={size}
      leftIcon={<MinimalisticMagnifierIcon size={16} aria-hidden="true" />}
      inputClassName="[&::-webkit-search-cancel-button]:hidden"
      rightSlot={shortcut && <Kbd>{shortcut}</Kbd>}
      {...props}
    />
  )
}

/** A keyboard key or shortcut, e.g. in a search box or a menu row. */
export function Kbd({ children }: { children: ReactNode }): JSX.Element {
  return (
    <kbd className="pointer-events-none inline-flex h-5 shrink-0 items-center rounded-xs border border-default px-1.5 font-sans text-body-xs whitespace-nowrap text-muted">
      {children}
    </kbd>
  )
}
