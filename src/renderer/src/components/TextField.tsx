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
      <label className="text-[12px] font-semibold" htmlFor={inputId}>
        {label}
      </label>
      <input
        className={[
          'h-8 w-full rounded-control border bg-control px-3 text-ink outline-none placeholder:text-ink-muted focus:ring-2',
          error
            ? 'border-error focus:border-error focus:ring-error/25'
            : 'border-line-strong focus:border-focus focus:ring-focus/25'
        ].join(' ')}
        id={inputId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-[12px] text-error">
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className="text-[12px] text-ink-muted">
          {hint}
        </span>
      )}
    </div>
  )
}
