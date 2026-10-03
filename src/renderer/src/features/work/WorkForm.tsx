import { useState, type JSX, type ReactNode } from 'react'
import { DESCRIPTION_MAX, TITLE_MAX, type SourceLanguage } from '../../../../shared/contracts/library'
import type { Result } from '../../../../shared/contracts/result'
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
  /**
   * Splits the form in two: the name and the language first, everything optional after. The first
   * step can submit on its own, so a work is two keystrokes away. Create screen only.
   */
  stepped?: boolean
  /** Resolves to the outcome; field errors in it are shown next to their fields. */
  onSubmit(values: WorkFormValues): Promise<Result<unknown>>
  onSuccess(): void
  onCancel(): void
  /** Extra content above the buttons, such as a note about what saving does. */
  footerNote?: ReactNode
}

/** Which step owns a field, so a failed save lands on the step that can fix it. */
const STEP_ONE_FIELDS = new Set(['title', 'sourceLang'])

/**
 * The fields of a work, shared by the create screen and the edit dialog. The cover sits beside the
 * fields, which all share one column, so nothing is wider or taller than its neighbour by accident.
 */
export function WorkForm({
  mode,
  initial = emptyWorkForm,
  submitLabel,
  busyLabel,
  stepped = false,
  onSubmit,
  onSuccess,
  onCancel,
  footerNote
}: WorkFormProps): JSX.Element {
  const [values, setValues] = useState<WorkFormValues>(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

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
    // A name rejected by the main process is fixed on step one, so go back to it.
    if (Object.keys(errors).some((key) => STEP_ONE_FIELDS.has(key))) setStep(1)
  }

  /** Moving on is not saving, but an empty name is still worth catching before step two. */
  function goToOptional(): void {
    if (values.title.trim() === '') {
      setFieldErrors({ title: 'Nhập tên tác phẩm.' })
      return
    }
    setStep(2)
  }

  const coverField = (
    <CoverPicker
      value={values.cover}
      onChange={(cover) => set('cover', cover)}
      disabled={submitting}
    />
  )

  const titleField = (
    <TextField
      label="Tên tác phẩm"
      value={values.title}
      maxLength={TITLE_MAX}
      autoFocus
      error={fieldErrors.title}
      onChange={(event) => set('title', event.target.value)}
    />
  )

  const languageField =
    mode === 'create' ? (
      <div className="flex flex-col gap-[7px]">
        <span className="text-[12px] font-semibold">Ngôn ngữ gốc</span>
        <Select<SourceLanguage>
          label="Ngôn ngữ gốc"
          value={values.sourceLang}
          options={languageOptions}
          onChange={(lang) => set('sourceLang', lang)}
          className="w-full"
        />
        <span className="text-[11px] text-ink-muted">Ngôn ngữ đích luôn là tiếng Việt.</span>
      </div>
    ) : (
      <TextField
        label="Ngôn ngữ gốc"
        value={languages[values.sourceLang].name}
        readOnly
        hint="Không đổi được sau khi tạo, vì bản gốc và bản dịch đã gắn với ngôn ngữ này."
      />
    )

  const optionalFields = (
    <>
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
    </>
  )

  const errorLine = (formError || fieldErrors.cover) && (
    <p role="alert" className="text-[12px] text-error">
      {formError ?? fieldErrors.cover}
    </p>
  )

  const onFormSubmit = (event: { preventDefault(): void }): void => {
    event.preventDefault()
    void submit()
  }

  if (stepped) {
    const onStepOne = step === 1
    // On step one Enter means "next", not "create": submitting is the smaller, explicit action.
    const onSteppedSubmit = (event: { preventDefault(): void }): void => {
      event.preventDefault()
      if (onStepOne) goToOptional()
      else void submit()
    }
    return (
      <form className="flex h-full min-h-0 flex-col" noValidate onSubmit={onSteppedSubmit}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-5 py-6">
            <ol className="flex items-center gap-2 text-[12px]" aria-label="Các bước tạo tác phẩm">
              {(
                [
                  [1, 'Bắt buộc'],
                  [2, 'Tùy chọn']
                ] as const
              ).map(([number, label], index) => (
                <li key={number} className="flex items-center gap-2">
                  {index > 0 && <span className="h-px w-6 bg-line-strong" aria-hidden="true" />}
                  <span
                    aria-current={step === number ? 'step' : undefined}
                    className={
                      'flex items-center gap-1.5 ' +
                      (step === number ? 'font-semibold' : 'text-ink-muted')
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={
                        'grid size-5 place-items-center rounded-full text-[11px] ' +
                        (step === number
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-line-strong')
                      }
                    >
                      {number}
                    </span>
                    {label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-semibold">
                {onStepOne ? 'Tác phẩm này tên gì?' : 'Thêm thông tin cho tác phẩm'}
              </h2>
              <p className="text-xs leading-[1.6] text-ink-muted">
                {onStepOne
                  ? 'Hai thứ này không đổi được dễ dàng về sau; phần còn lại thêm lúc nào cũng được.'
                  : 'Mọi thứ ở bước này đều bỏ trống được, và sửa lại sau lúc nào cũng được.'}
              </p>
            </div>

            {onStepOne ? (
              <>
                {titleField}
                {languageField}
                <p className="text-[12px] text-ink-muted">
                  Bước sau: ảnh bìa, tên gốc, tác giả, thể loại, mô tả — bỏ qua được.
                </p>
              </>
            ) : (
              <>
                {coverField}
                {optionalFields}
              </>
            )}

            {errorLine}
            {footerNote}
          </div>
        </div>

        <div className="flex h-[48px] shrink-0 items-center justify-end gap-2 border-t border-line bg-chrome px-3">
          {submitting && (
            <p role="status" className="mr-auto text-xs text-ink-muted">
              {busyLabel}
            </p>
          )}
          {onStepOne ? (
            <>
              <Button variant="secondary" onClick={onCancel} disabled={submitting}>
                Hủy
              </Button>
              <Button variant="outline" disabled={submitting} onClick={() => void submit()}>
                Tạo và bỏ qua phần còn lại
              </Button>
              <Button type="submit" disabled={submitting}>
                Tiếp tục
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
                Quay lại
              </Button>
              <Button variant="secondary" onClick={onCancel} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? busyLabel : submitLabel}
              </Button>
            </>
          )}
        </div>
      </form>
    )
  }

  return (
    <form className="@container flex flex-col gap-6" noValidate onSubmit={onFormSubmit}>
      <div className="grid grid-cols-1 items-start justify-items-center gap-8 @min-[600px]:grid-cols-[168px_minmax(0,1fr)] @min-[600px]:justify-items-stretch">
        {coverField}

        <div className="flex w-full flex-col gap-5">
          {titleField}
          {languageField}
          {optionalFields}
        </div>
      </div>

      {errorLine}

      {footerNote}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
