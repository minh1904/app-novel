import type { JSX, ReactNode } from 'react'
import { CheckIcon } from '@renderer/components/ui/reicon'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'

import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

/*
 * Ô chọn (checkbox) và nút chọn (radio): kích thước 16px với viền ô nhập, phủ màu nổi bật
 * khi được kích hoạt. Nằm cùng hàng với nhãn để có thể nhấp chọn toàn bộ hàng.
 */
const box =
  'flex size-4 shrink-0 items-center justify-center border border-(--mira-border-input) bg-surface transition-colors duration-(--mira-duration-fast) data-checked:border-transparent data-checked:bg-inverted data-checked:text-inverted data-disabled:cursor-not-allowed data-disabled:opacity-50'

const row = 'inline-flex items-center gap-xs text-body-sm text-default'

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, 'className' | 'children'> {
  children?: ReactNode
  className?: string
}

export function Checkbox({ children, className, ...props }: CheckboxProps): JSX.Element {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: phần tử gốc checkbox của Base UI đóng vai trò là control điều khiển.
    <label data-slot="checkbox" className={cn(row, className)}>
      <BaseCheckbox.Root {...props} className={cn(box, 'rounded-xs', focusRing)}>
        <BaseCheckbox.Indicator>
          <CheckIcon size={ICON['2xs']} />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {children}
    </label>
  )
}

export function RadioGroup({
  className,
  ...props
}: Omit<BaseRadioGroup.Props, 'className'> & { className?: string }): JSX.Element {
  return <BaseRadioGroup {...props} className={cn('flex flex-col gap-xs', className)} />
}

export interface RadioProps extends Omit<BaseRadio.Root.Props, 'className' | 'children'> {
  children?: ReactNode
  className?: string
}

/** Một tùy chọn trong RadioGroup. */
export function Radio({ children, className, ...props }: RadioProps): JSX.Element {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: phần tử gốc radio của Base UI đóng vai trò là control điều khiển.
    <label data-slot="radio" className={cn(row, className)}>
      <BaseRadio.Root {...props} className={cn(box, 'rounded-full', focusRing)}>
        <BaseRadio.Indicator className="size-1.5 rounded-full bg-(--mira-text-inverted)" />
      </BaseRadio.Root>
      {children}
    </label>
  )
}
