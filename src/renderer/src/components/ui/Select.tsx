import type { JSX, ReactNode } from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cn } from '../../lib/cn'
import { menuItemClass, menuSurfaceClass } from './DropdownMenu'
import { focusRing } from './focus'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectProps<T extends string> {
  /** Names the select for assistive technology. */
  label: string
  value: T
  options: ReadonlyArray<SelectOption<T>>
  onChange(value: T): void
  icon?: ReactNode
  /** md 32px · sm 24px (a toolbar), the same scale as Button and Input. */
  size?: 'md' | 'sm'
  id?: string
  disabled?: boolean
  className?: string
}

/** One value out of a list, on the input frame; the list opens as a menu. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  size = 'md',
  id,
  disabled,
  className
}: SelectProps<T>): JSX.Element {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next as T)
      }}
    >
      <BaseSelect.Trigger
        data-slot="select"
        id={id}
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center gap-xs border border-(--mira-input-border) bg-(--mira-input-bg) text-(--mira-input-fg)',
          'transition-colors duration-(--mira-duration-fast) ease-standard hover:bg-(--mira-input-bg-hover) data-popup-open:bg-(--mira-input-bg-hover)',
          'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:text-disabled',
          size === 'md'
            ? 'h-8 rounded-sm pr-xs pl-sm text-body-sm'
            : 'h-6 rounded-xs pr-2xs pl-xs text-body-xs',
          focusRing,
          className
        )}
      >
        {icon && <span className="flex text-muted">{icon}</span>}
        <BaseSelect.Value className="truncate whitespace-nowrap" />
        <BaseSelect.Icon className="ml-auto flex text-muted">
          <AltArrowDownIcon size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="z-(--mira-z-dropdown)"
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup className={cn(menuSurfaceClass, 'min-w-(--anchor-width)')}>
            {options.map((option) => (
              <BaseSelect.Item
                key={option.value}
                value={option.value}
                className={cn(menuItemClass, 'pr-sm')}
              >
                <span className="flex size-4 items-center justify-center">
                  <BaseSelect.ItemIndicator>
                    <CheckIcon size={14} />
                  </BaseSelect.ItemIndicator>
                </span>
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}
