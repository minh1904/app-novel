import { useId, type InputHTMLAttributes, type JSX } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, id, className, ...props }: TextFieldProps): JSX.Element {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? inputId + '-hint' : undefined

  return (
    <div
      data-slot="text-field"
      className={['flex flex-col gap-[7px]', className].filter(Boolean).join(' ')}
    >
      <label className="text-[11px] font-semibold" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="h-[34px] w-full rounded-control border border-line-strong bg-canvas px-[11px] text-ink outline-none placeholder:text-ink-muted focus:border-focus focus:ring-2 focus:ring-focus/25"
        id={inputId}
        aria-describedby={hintId}
        {...props}
      />
      {hint && (
        <span id={hintId} className="text-[10px] text-ink-muted">
          {hint}
        </span>
      )}
    </div>
  )
}
