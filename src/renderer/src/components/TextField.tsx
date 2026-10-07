import { useId, type InputHTMLAttributes, type JSX } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  /** Validation message; also marks the input invalid for assistive technology. */
  error?: string
}

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextFieldProps): JSX.Element {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? inputId + '-hint' : undefined
  const errorId = error ? inputId + '-error' : undefined

  return (
    <div
      data-slot="text-field"
      className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}
    >
      <label className="text-ui-xs font-medium" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="input-chrome h-(--control-height) w-full rounded-control border px-2.5 text-ui-xs text-ink outline-none placeholder:text-ink-faint"
        id={inputId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-ui-xs text-error">
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className="text-ui-xs text-ink-muted">
          {hint}
        </span>
      )}
    </div>
  )
}
