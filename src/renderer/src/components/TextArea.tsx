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
      <label className="text-ui-xs font-semibold" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        className={[
          'min-h-[76px] w-full resize-y rounded-control border bg-control px-3 py-2 leading-normal text-ink outline-none placeholder:text-ink-muted focus:ring-2',
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
