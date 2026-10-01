import { useState, type JSX } from 'react'
import type { ChapterItem } from '../../../../shared/chapters'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/TextField'
import { displayTitle } from './chapterList'

/** Asks for a position from 1 to the number of chapters and says why when the answer is not one. */
export function MoveChapterDialog({
  chapter,
  total,
  onClose,
  onMove
}: {
  chapter: ChapterItem | null
  total: number
  onClose(): void
  onMove(chapter: ChapterItem, to: number): void
}): JSX.Element {
  return (
    <Dialog
      open={chapter !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Chuyển tới vị trí"
      description="Các chương nằm giữa sẽ dồn lên hoặc xuống một bậc; số thứ tự tự đổi theo."
    >
      {/* Keyed so the field starts from the current position each time the dialog opens. */}
      {chapter && (
        <MoveForm
          key={chapter.id}
          chapter={chapter}
          total={total}
          onClose={onClose}
          onMove={onMove}
        />
      )}
    </Dialog>
  )
}

function MoveForm({
  chapter,
  total,
  onClose,
  onMove
}: {
  chapter: ChapterItem
  total: number
  onClose(): void
  onMove(chapter: ChapterItem, to: number): void
}): JSX.Element {
  const [value, setValue] = useState(String(chapter.number))
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const to = Number(value.trim())
        if (!/^\d+$/.test(value.trim()) || to < 1 || to > total) {
          setError('Nhập vị trí từ 1 đến ' + total + '.')
          return
        }
        if (to !== chapter.number) onMove(chapter, to)
        onClose()
      }}
    >
      <p className="text-xs text-ink-muted">
        Đang chuyển <strong className="font-semibold text-ink">{displayTitle(chapter)}</strong>{' '}
        (hiện ở vị trí {chapter.number}).
      </p>
      <TextField
        label={'Vị trí mới (1–' + total + ')'}
        value={value}
        inputMode="numeric"
        error={error ?? undefined}
        autoFocus
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          setValue(event.target.value)
          setError(null)
        }}
      />
      <div className="flex justify-end gap-2">
        <Button size="lg" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button size="lg" type="submit">
          Chuyển
        </Button>
      </div>
    </form>
  )
}

/** "Chương 7" for an untitled chapter, otherwise “its name” (vị trí 7). */
function describeChapter(chapter: ChapterItem): string {
  return chapter.title === ''
    ? 'Chương ' + chapter.number
    : '“' + chapter.title + '” (vị trí ' + chapter.number + ')'
}

/** Names the chapter and says that deleting cannot be undone. */
export function DeleteChapterDialog({
  chapter,
  onClose,
  onDelete
}: {
  chapter: ChapterItem | null
  onClose(): void
  onDelete(chapter: ChapterItem): void
}): JSX.Element {
  return (
    <Dialog
      open={chapter !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Xóa chương?"
    >
      {chapter && (
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-[1.55]">
            <strong className="font-semibold">{describeChapter(chapter)}</strong> sẽ bị xóa khỏi tác
            phẩm, các chương sau nó đổi số thứ tự. Việc này không hoàn tác được.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="lg" variant="secondary" onClick={onClose} autoFocus>
              Hủy
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => {
                onDelete(chapter)
                onClose()
              }}
            >
              Xóa chương
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
