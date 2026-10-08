import {
  useId,
  type InputHTMLAttributes,
  type JSX,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react'
import { cn } from '../../lib/cn'
import { Input, type InputProps } from './Input'
import { Textarea } from './Textarea'

export interface FieldIds {
  /** The control's id, for the label. */
  id: string
  /** Space-separated ids of the hint and the error, for aria-describedby. */
  describedBy: string | undefined
  invalid: boolean
}

export interface FieldProps {
  label: string
  /** What the field is for; shown under it until there is an error. */
  hint?: ReactNode
  /** Validation message; also marks the control invalid for assistive technology. */
  error?: string
  /** Use an existing id for the control. */
  id?: string
  className?: string
  /** Renders the control with the ids it needs. */
  children(ids: FieldIds): ReactNode
}

/** A label above a control, a hint or an error under it. Labels are always visible. */
export function Field({ label, hint, error, id, className, children }: FieldProps): JSX.Element {
  const generated = useId()
  const controlId = id ?? generated
  const hintId = hint ? controlId + '-hint' : undefined
  const errorId = error ? controlId + '-error' : undefined
  return (
    <div data-slot="field" className={cn('flex flex-col gap-xs', className)}>
      <label className="text-label-sm text-default" htmlFor={controlId}>
        {label}
      </label>
      {children({
        id: controlId,
        describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
        invalid: Boolean(error)
      })}
      {error ? (
        <span id={errorId} role="alert" className="text-body-xs text-error">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-body-xs text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputProps, 'children'> {
  label: string
  hint?: ReactNode
  error?: string
  /** Classes for the frame of the field itself; `className` goes on the outer block. */
  frameClassName?: string
}

/** A labelled one-line field. */
export function TextField({
  label,
  hint,
  error,
  id,
  className,
  frameClassName,
  ...props
}: TextFieldProps): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(ids) => (
        <Input
          id={ids.id}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          className={frameClassName}
          {...props}
        />
      )}
    </Field>
  )
}

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  error?: string
}

/** A labelled multi-line field. */
export function TextareaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextareaFieldProps): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(ids) => (
        <Textarea
          id={ids.id}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
          {...props}
        />
      )}
    </Field>
  )
}

export type { InputHTMLAttributes }
