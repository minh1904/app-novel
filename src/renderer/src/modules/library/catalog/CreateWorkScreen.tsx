import { useRef, type JSX } from 'react'
import type { CreateWorkInput } from '../../../../../shared/contracts/library'
import type { Result } from '../../../../../shared/contracts/result'
import { WorkForm } from '../work-form/WorkForm'
import type { WorkFormValues } from '../work-form/workFormValues'
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

  // Two steps, so creating a work is the name and the language; the rest is a step you can skip.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkForm
        mode="create"
        stepped
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
