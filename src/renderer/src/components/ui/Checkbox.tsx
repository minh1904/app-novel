import type { JSX, ReactNode } from 'react'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'
import { ICON } from './icon'

/*
 * Checkbox and radio (IZONE LMS): a 16px box with the input border, filled with the primary (inverted
 * neutral) when on. Each sits in a label row with its text, so the whole row toggles.
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
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox root is the control.
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

/** One option of a RadioGroup. */
export function Radio({ children, className, ...props }: RadioProps): JSX.Element {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's radio root is the control.
    <label data-slot="radio" className={cn(row, className)}>
      <BaseRadio.Root {...props} className={cn(box, 'rounded-full', focusRing)}>
        <BaseRadio.Indicator className="size-1.5 rounded-full bg-(--mira-text-inverted)" />
      </BaseRadio.Root>
      {children}
    </label>
  )
}
