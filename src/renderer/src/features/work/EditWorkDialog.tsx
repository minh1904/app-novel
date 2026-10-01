import { useEffect, useState, type JSX } from 'react'
import type { WorkPatch } from '../../../../shared/library'
import type { Result } from '../../../../shared/result'
import { Dialog } from '../../components/Dialog'
import type { Work } from '../library/works'
import { WorkForm } from './WorkForm'
import { buildPatch, type WorkFormValues } from './workFormValues'

function initialValues(work: Work, cover: string | null): WorkFormValues {
  return {
    title: work.title,
    sourceLang: work.sourceLanguage,
    originalTitle: work.originalTitle ?? '',
    author: work.author ?? '',
    genre: work.genre ?? '',
    description: work.description ?? '',
    cover
  }
}

/**
 * Edits the details and the cover of a work in one save. The dialog fetches the current cover
 * first, because the work summary only knows that a cover exists, not its pixels.
 */
export function EditWorkDialog({
  work,
  open,
  onClose,
  onSave
}: {
  work: Work
  open: boolean
  onClose(): void
  onSave(patch: WorkPatch): Promise<Result<unknown>>
}): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      size="wide"
      title="Sửa thông tin tác phẩm"
      description="Thông tin và ảnh bìa được lưu cùng lúc. Ngôn ngữ gốc không đổi được."
    >
      {/* Mounted only while open, so every opening starts from what is saved now. */}
      {open && <EditBody work={work} onClose={onClose} onSave={onSave} />}
    </Dialog>
  )
}

function EditBody({
  work,
  onClose,
  onSave
}: {
  work: Work
  onClose(): void
  onSave(patch: WorkPatch): Promise<Result<unknown>>
}): JSX.Element {
  const [initial, setInitial] = useState<WorkFormValues | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (work.coverVersion === undefined) {
      void Promise.resolve().then(() => {
        if (active) setInitial(initialValues(work, null))
      })
    } else {
      void window.mira.works.getCover(work.id).then((result) => {
        if (!active) return
        if (result.ok) setInitial(initialValues(work, result.value))
        else setLoadError(result.error.message)
      })
    }
    return () => {
      active = false
    }
    // Snapshot once per opening: later changes to `work` must not overwrite what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadError) {
    return (
      <p role="alert" className="text-xs text-error">
        Không đọc được ảnh bìa hiện tại: {loadError}
      </p>
    )
  }
  if (!initial) {
    return (
      <p role="status" className="py-8 text-center text-xs text-ink-muted">
        Đang mở thông tin…
      </p>
    )
  }

  return (
    <WorkForm
      mode="edit"
      initial={initial}
      submitLabel="Lưu thay đổi"
      busyLabel="Đang lưu…"
      onSubmit={async (values) => {
        const patch = buildPatch(initial, values)
        // Nothing changed: close without touching the file or its edit time.
        if (Object.keys(patch).length === 0) return { ok: true, value: null }
        return onSave(patch)
      }}
      onSuccess={onClose}
      onCancel={onClose}
    />
  )
}
