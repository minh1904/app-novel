import { useId, type JSX, type TextareaHTMLAttributes } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextAreaProps): JSX.Element {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? inputId + '-hint' : undefined
  const errorId = error ? inputId + '-error' : undefined

  return (
    <div
      data-slot="text-area"
      className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}
    >
      <label className="text-ui-xs font-medium" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        className="input-chrome min-h-16 w-full resize-y rounded-control border px-2.5 py-1.5 text-ui-xs leading-normal text-ink outline-none placeholder:text-ink-faint"
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
