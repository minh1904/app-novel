import { useState, type JSX } from 'react'
import type { CreateWorkInput, SourceLanguage } from '../../../../shared/library'
import type { Result } from '../../../../shared/result'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { TextArea } from '../../components/TextArea'
import { TextField } from '../../components/TextField'
import { CoverPicker } from './CoverPicker'
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

/**
 * Name and source language are all a work needs. The cover sits beside the fields, which all share
 * one column, so nothing on the form is wider or taller than its neighbour by accident.
 */
export function CreateWorkScreen({
  onSubmit,
  onCreated,
  onCancel
}: CreateWorkScreenProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [sourceLang, setSourceLang] = useState<SourceLanguage>('zh-Hans')
  const [originalTitle, setOriginalTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState<string | null>(null)
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
      ...(author.trim() !== '' && { author }),
      ...(genre.trim() !== '' && { genre }),
      ...(description.trim() !== '' && { description }),
      ...(cover !== null && { cover })
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
    <div className="@container mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em]">
          Tạo tác phẩm
        </h2>
        <p className="text-[13px] leading-[1.6] text-ink-muted">
          Chỉ cần tên và ngôn ngữ gốc. Ảnh bìa, chương, bản gốc và bản dịch thêm sau cũng được.
        </p>
      </div>

      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="grid grid-cols-1 items-start justify-items-center gap-8 @min-[600px]:grid-cols-[168px_minmax(0,1fr)] @min-[600px]:justify-items-stretch">
          <CoverPicker value={cover} onChange={setCover} disabled={submitting} />

          <div className="flex w-full flex-col gap-5">
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

            <TextField
              label="Tác giả (tùy chọn)"
              value={author}
              maxLength={TITLE_MAX}
              error={fieldErrors.author}
              onChange={(event) => setAuthor(event.target.value)}
            />

            <TextField
              label="Thể loại / bối cảnh (tùy chọn)"
              hint="Ví dụ: tiên hiệp, cổ đại. Giúp AI chọn xưng hô và giọng văn."
              value={genre}
              maxLength={TITLE_MAX}
              error={fieldErrors.genre}
              onChange={(event) => setGenre(event.target.value)}
            />

            <TextArea
              label="Mô tả (tùy chọn)"
              value={description}
              maxLength={DESCRIPTION_MAX}
              error={fieldErrors.description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        {(formError || fieldErrors.cover) && (
          <p role="alert" className="text-[12px] text-error">
            {formError ?? fieldErrors.cover}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
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
