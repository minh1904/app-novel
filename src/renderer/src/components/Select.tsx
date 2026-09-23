import type { JSX, ReactNode } from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cx } from './cx'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectProps<T extends string> {
  label: string
  value: T
  options: ReadonlyArray<SelectOption<T>>
  onChange(value: T): void
  icon?: ReactNode
  className?: string
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  className
}: SelectProps<T>): JSX.Element {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next as T)
      }}
    >
      <BaseSelect.Trigger
        data-slot="select"
        aria-label={label}
        className={cx(
          'inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-canvas pr-2.5 pl-3 text-xs text-ink outline-none hover:bg-control focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-control',
          className
        )}
      >
        {icon && <span className="text-ink-muted">{icon}</span>}
        <BaseSelect.Value className="whitespace-nowrap" />
        <BaseSelect.Icon className="ml-auto text-ink-muted">
          <AltArrowDownIcon size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} align="end" alignItemWithTrigger={false}>
          <BaseSelect.Popup className="min-w-(--anchor-width) rounded-control border border-line bg-popover p-1 text-xs text-ink shadow-[0_8px_28px_rgb(0_0_0/0.14)] outline-none">
            {options.map((option) => (
              <BaseSelect.Item
                key={option.value}
                value={option.value}
                className="flex h-[30px] cursor-default items-center gap-2 rounded-[7px] pr-3 pl-2 outline-none select-none data-highlighted:bg-selected"
              >
                <span className="flex size-3.5 items-center justify-center">
                  <BaseSelect.ItemIndicator>
                    <CheckIcon size={13} />
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
