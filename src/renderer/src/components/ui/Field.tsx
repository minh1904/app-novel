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
  /** ID của phần tử điều khiển, dùng liên kết với thẻ label. */
  id: string
  /** Các ID phân tách bằng dấu cách của gợi ý và lỗi, dùng cho aria-describedby. */
  describedBy: string | undefined
  invalid: boolean
}

export interface FieldProps {
  label: string
  /** Gợi ý giải thích mục đích của trường; hiển thị bên dưới cho đến khi có lỗi. */
  hint?: ReactNode
  /** Thông báo lỗi kiểm tra hợp lệ; đồng thời đánh dấu trường không hợp lệ cho công nghệ hỗ trợ. */
  error?: string
  /** Sử dụng ID có sẵn cho phần tử điều khiển. */
  id?: string
  className?: string
  /** Hàm render phần tử điều khiển với các thuộc tính ID cần thiết. */
  children(ids: FieldIds): ReactNode
}

/** Khung trường nhập liệu: nhãn phía trên, gợi ý hoặc thông báo lỗi phía dưới. Nhãn luôn hiển thị. */
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
  /** Lớp CSS cho khung của trường nhập liệu; `className` áp dụng cho khối bao ngoài. */
  frameClassName?: string
}

/** Trường nhập một dòng có sẵn nhãn, gợi ý và thông báo lỗi. */
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

/** Trường nhập nhiều dòng (textarea) có sẵn nhãn, gợi ý và thông báo lỗi. */
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
