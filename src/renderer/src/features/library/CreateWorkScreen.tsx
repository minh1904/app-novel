import { useRef, type JSX } from 'react'
import type { CreateWorkInput } from '../../../../shared/library'
import type { Result } from '../../../../shared/result'
import { WorkForm } from '../work/WorkForm'
import type { WorkFormValues } from '../work/workFormValues'
import type { Work } from './works'

export interface CreateWorkScreenProps {
  onSubmit(input: CreateWorkInput): Promise<Result<Work>>
  onCreated(work: Work): void
  onCancel(): void
}

/** Optional fields are only sent when filled in, so a work is created with exactly what was typed. */
function toCreateInput(values: WorkFormValues): CreateWorkInput {
  return {
    title: values.title,
    sourceLang: values.sourceLang,
    ...(values.originalTitle.trim() !== '' && { originalTitle: values.originalTitle }),
    ...(values.author.trim() !== '' && { author: values.author }),
    ...(values.genre.trim() !== '' && { genre: values.genre }),
    ...(values.description.trim() !== '' && { description: values.description }),
    ...(values.cover !== null && { cover: values.cover })
  }
}

/** Name and source language are all a work needs; everything else can be added later. */
export function CreateWorkScreen({
  onSubmit,
  onCreated,
  onCancel
}: CreateWorkScreenProps): JSX.Element {
  const created = useRef<Work | null>(null)

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.045em]">
          Tạo tác phẩm
        </h2>
        <p className="text-[13px] leading-[1.6] text-ink-muted">
          Chỉ cần tên và ngôn ngữ gốc. Ảnh bìa, chương, bản gốc và bản dịch thêm sau cũng được.
        </p>
      </div>

      <WorkForm
        mode="create"
        submitLabel="Tạo tác phẩm"
        busyLabel="Đang tạo…"
        onSubmit={async (values) => {
          const result = await onSubmit(toCreateInput(values))
          if (result.ok) created.current = result.value
          return result
        }}
        onSuccess={() => {
          if (created.current) onCreated(created.current)
        }}
        onCancel={onCancel}
      />
    </div>
  )
}
