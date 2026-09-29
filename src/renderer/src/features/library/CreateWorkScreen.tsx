import { useState, type JSX } from 'react'
import type { CreateWorkInput, SourceLanguage } from '../../../../shared/library'
import type { Result } from '../../../../shared/result'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { TextArea } from '../../components/TextArea'
import { TextField } from '../../components/TextField'
import { languages, type Work } from './works'

const TITLE_MAX = 200
const DESCRIPTION_MAX = 2000

const languageOptions = (Object.keys(languages) as SourceLanguage[]).map((value) => ({
  value,
  label: languages[value].name
}))

export interface CreateWorkScreenProps {
  onSubmit(input: CreateWorkInput): Promise<Result<Work>>
  onCreated(work: Work): void
  onCancel(): void
}

/** Name and source language are all a work needs; everything else can be added later. */
export function CreateWorkScreen({
  onSubmit,
  onCreated,
  onCancel
}: CreateWorkScreenProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [sourceLang, setSourceLang] = useState<SourceLanguage>('zh-Hans')
  const [originalTitle, setOriginalTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(): Promise<void> {
    if (submitting) return

    // Mirror the main process rule so an empty name is caught before any round trip.
    if (title.trim() === '') {
      setFieldErrors({ title: 'Nhập tên tác phẩm.' })
      return
    }

    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    const result = await onSubmit({
      title,
      sourceLang,
      ...(originalTitle.trim() !== '' && { originalTitle }),
      ...(description.trim() !== '' && { description })
    })
    setSubmitting(false)

    if (result.ok) {
      onCreated(result.value)
      return
    }
    const errors: Record<string, string> = {}
    for (const detail of result.error.details ?? []) errors[detail.path] = detail.message
    setFieldErrors(errors)
    if (Object.keys(errors).length === 0) setFormError(result.error.message)
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em]">
          Tạo tác phẩm
        </h2>
        <p className="text-[13px] leading-[1.6] text-ink-muted">
          Chỉ cần tên và ngôn ngữ gốc. Chương, bản gốc và bản dịch thêm sau cũng được.
        </p>
      </div>

      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <TextField
          label="Tên tác phẩm"
          value={title}
          maxLength={TITLE_MAX}
          autoFocus
          error={fieldErrors.title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="flex flex-col gap-[7px]">
          <span className="text-[11px] font-semibold">Ngôn ngữ gốc</span>
          <Select<SourceLanguage>
            label="Ngôn ngữ gốc"
            value={sourceLang}
            options={languageOptions}
            onChange={setSourceLang}
            className="w-full"
          />
          <span className="text-[10px] text-ink-muted">Ngôn ngữ đích luôn là tiếng Việt.</span>
        </div>

        <TextField
          label="Tên gốc (tùy chọn)"
          value={originalTitle}
          maxLength={TITLE_MAX}
          lang={sourceLang}
          error={fieldErrors.originalTitle}
          onChange={(event) => setOriginalTitle(event.target.value)}
        />

        <TextArea
          label="Mô tả (tùy chọn)"
          value={description}
          maxLength={DESCRIPTION_MAX}
          error={fieldErrors.description}
          onChange={(event) => setDescription(event.target.value)}
        />

        {formError && (
          <p role="alert" className="text-[12px] text-error">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Đang tạo…' : 'Tạo tác phẩm'}
          </Button>
        </div>
      </form>
    </div>
  )
}
