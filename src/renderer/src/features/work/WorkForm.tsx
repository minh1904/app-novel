import { useState, type JSX, type ReactNode } from 'react'
import { DESCRIPTION_MAX, TITLE_MAX, type SourceLanguage } from '../../../../shared/library'
import type { Result } from '../../../../shared/result'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { TextArea } from '../../components/TextArea'
import { TextField } from '../../components/TextField'
import { CoverPicker } from '../library/CoverPicker'
import { languages } from '../library/works'
import { emptyWorkForm, type WorkFormValues } from './workFormValues'

const languageOptions = (Object.keys(languages) as SourceLanguage[]).map((value) => ({
  value,
  label: languages[value].name
}))

export interface WorkFormProps {
  /** In edit mode the source language is shown but cannot change. */
  mode: 'create' | 'edit'
  initial?: WorkFormValues
  submitLabel: string
  busyLabel: string
  /** Resolves to the outcome; field errors in it are shown next to their fields. */
  onSubmit(values: WorkFormValues): Promise<Result<unknown>>
  onSuccess(): void
  onCancel(): void
  /** Extra content above the buttons, such as a note about what saving does. */
  footerNote?: ReactNode
}

/**
 * The fields of a work, shared by the create screen and the edit dialog. The cover sits beside the
 * fields, which all share one column, so nothing is wider or taller than its neighbour by accident.
 */
export function WorkForm({
  mode,
  initial = emptyWorkForm,
  submitLabel,
  busyLabel,
  onSubmit,
  onSuccess,
  onCancel,
  footerNote
}: WorkFormProps): JSX.Element {
  const [values, setValues] = useState<WorkFormValues>(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]): void => {
    setValues((current) => ({ ...current, [key]: value }))
    // Editing a field answers its error; the next save checks it again.
    setFieldErrors((current) => {
      if (!(key in current)) return current
      const rest = { ...current }
      delete rest[key]
      return rest
    })
  }

  async function submit(): Promise<void> {
    if (submitting) return

    // Mirror the main process rule so an empty name is caught before any round trip.
    if (values.title.trim() === '') {
      setFieldErrors({ title: 'Nhập tên tác phẩm.' })
      return
    }

    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    const result = await onSubmit(values)
    setSubmitting(false)

    if (result.ok) {
      onSuccess()
      return
    }
    // The form keeps everything the user typed, so a failed save can simply be retried.
    const errors: Record<string, string> = {}
    for (const detail of result.error.details ?? []) {
      errors[detail.path.replace(/^patch\./, '')] = detail.message
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length === 0) setFormError(result.error.message)
  }

  return (
    <form
      className="@container flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="grid grid-cols-1 items-start justify-items-center gap-8 @min-[600px]:grid-cols-[168px_minmax(0,1fr)] @min-[600px]:justify-items-stretch">
        <CoverPicker
          value={values.cover}
          onChange={(cover) => set('cover', cover)}
          disabled={submitting}
        />

        <div className="flex w-full flex-col gap-5">
          <TextField
            label="Tên tác phẩm"
            value={values.title}
            maxLength={TITLE_MAX}
            autoFocus
            error={fieldErrors.title}
            onChange={(event) => set('title', event.target.value)}
          />

          {mode === 'create' ? (
            <div className="flex flex-col gap-[7px]">
              <span className="text-[11px] font-semibold">Ngôn ngữ gốc</span>
              <Select<SourceLanguage>
                label="Ngôn ngữ gốc"
                value={values.sourceLang}
                options={languageOptions}
                onChange={(lang) => set('sourceLang', lang)}
                className="w-full"
              />
              <span className="text-[10px] text-ink-muted">Ngôn ngữ đích luôn là tiếng Việt.</span>
            </div>
          ) : (
            <TextField
              label="Ngôn ngữ gốc"
              value={languages[values.sourceLang].name}
              readOnly
              hint="Không đổi được sau khi tạo, vì bản gốc và bản dịch đã gắn với ngôn ngữ này."
            />
          )}

          <TextField
            label="Tên gốc (tùy chọn)"
            value={values.originalTitle}
            maxLength={TITLE_MAX}
            lang={values.sourceLang}
            error={fieldErrors.originalTitle}
            onChange={(event) => set('originalTitle', event.target.value)}
          />

          <TextField
            label="Tác giả (tùy chọn)"
            value={values.author}
            maxLength={TITLE_MAX}
            error={fieldErrors.author}
            onChange={(event) => set('author', event.target.value)}
          />

          <TextField
            label="Thể loại / bối cảnh (tùy chọn)"
            hint="Ví dụ: tiên hiệp, cổ đại. Giúp AI chọn xưng hô và giọng văn."
            value={values.genre}
            maxLength={TITLE_MAX}
            error={fieldErrors.genre}
            onChange={(event) => set('genre', event.target.value)}
          />

          <TextArea
            label="Mô tả (tùy chọn)"
            value={values.description}
            maxLength={DESCRIPTION_MAX}
            error={fieldErrors.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>
      </div>

      {(formError || fieldErrors.cover) && (
        <p role="alert" className="text-[12px] text-error">
          {formError ?? fieldErrors.cover}
        </p>
      )}

      {footerNote}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
