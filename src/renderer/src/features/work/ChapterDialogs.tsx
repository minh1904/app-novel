import { useState, type JSX } from 'react'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import { displayTitle, lossNote } from './chapterList'

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
      <p className="text-body-xs text-subtle">
        Đang chuyển <strong className="font-semibold text-default">{displayTitle(chapter)}</strong>{' '}
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
        <Button variant="light" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="solid" type="submit">
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
  onDelete,
  onBackup
}: {
  chapter: ChapterItem | null
  onClose(): void
  onDelete(chapter: ChapterItem): void
  /**
   * Offered when the chapter holds text: backs the work up without deleting anything. Resolves to
   * a sentence about how it went, shown in the dialog.
   */
  onBackup?: () => Promise<string | null>
}): JSX.Element {
  return (
    <Dialog
      open={chapter !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Xóa chương?"
    >
      {/* Keyed so a new chapter starts without the last chapter's backup message. */}
      {chapter && (
        <DeleteBody
          key={chapter.id}
          chapter={chapter}
          onClose={onClose}
          onDelete={onDelete}
          onBackup={onBackup}
        />
      )}
    </Dialog>
  )
}

function DeleteBody({
  chapter,
  onClose,
  onDelete,
  onBackup
}: {
  chapter: ChapterItem
  onClose(): void
  onDelete(chapter: ChapterItem): void
  onBackup?: () => Promise<string | null>
}): JSX.Element {
  const [backingUp, setBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const note = lossNote(chapter)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-xs leading-normal">
        <strong className="font-semibold">{describeChapter(chapter)}</strong> sẽ bị xóa khỏi tác
        phẩm, các chương sau nó đổi số thứ tự. Việc này không hoàn tác được.
      </p>
      {note && (
        <p
          role="note"
          className="rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-body-xs leading-normal"
        >
          <strong className="font-semibold">{note}</strong> Nên sao lưu tác phẩm trước khi xóa.
        </p>
      )}
      {backupMessage && (
        <p role="status" className="text-body-xs leading-normal break-words text-subtle">
          {backupMessage}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {note && onBackup && (
          <Button
            className="mr-auto"
            disabled={backingUp}
            onClick={() => {
              setBackingUp(true)
              void onBackup().then((message) => {
                setBackingUp(false)
                setBackupMessage(message)
              })
            }}
          >
            {backingUp ? 'Đang sao lưu…' : 'Sao lưu trước…'}
          </Button>
        )}
        <Button variant="light" onClick={onClose} autoFocus>
          Hủy
        </Button>
        <Button
          color="danger"
          variant="solid"
          disabled={backingUp}
          onClick={() => {
            onDelete(chapter)
            onClose()
          }}
        >
          Xóa chương
        </Button>
      </div>
    </div>
  )
}

/**
 * Deletes the chapters picked in the list. Says how many hold text that will be lost, offers a
 * backup first, and names the count on the button so a slip of the Shift key shows before it costs.
 */
export function DeleteChaptersDialog({
  chapters,
  onClose,
  onDelete,
  onBackup
}: {
  /** Empty closes the dialog. */
  chapters: ChapterItem[]
  onClose(): void
  onDelete(chapters: ChapterItem[]): void
  onBackup?: () => Promise<string | null>
}): JSX.Element {
  return (
    <Dialog
      open={chapters.length > 0}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={'Xóa ' + chapters.length + ' chương?'}
    >
      {chapters.length > 0 && (
        <DeleteManyBody
          chapters={chapters}
          onClose={onClose}
          onDelete={onDelete}
          onBackup={onBackup}
        />
      )}
    </Dialog>
  )
}

function DeleteManyBody({
  chapters,
  onClose,
  onDelete,
  onBackup
}: {
  chapters: ChapterItem[]
  onClose(): void
  onDelete(chapters: ChapterItem[]): void
  onBackup?: () => Promise<string | null>
}): JSX.Element {
  const [backingUp, setBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const withText = chapters.filter((chapter) => chapter.hasSource || chapter.hasTarget).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-xs leading-normal">
        <strong className="font-semibold">{chapters.length} chương</strong> sẽ bị xóa khỏi tác phẩm,
        các chương còn lại đổi số thứ tự. Việc này không hoàn tác được.
      </p>
      {withText > 0 && (
        <p
          role="note"
          className="rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-body-xs leading-normal"
        >
          <strong className="font-semibold">
            {withText} chương có bản gốc hoặc bản dịch; chữ trong đó sẽ mất.
          </strong>{' '}
          Nên sao lưu tác phẩm trước khi xóa.
        </p>
      )}
      {backupMessage && (
        <p role="status" className="text-body-xs leading-normal break-words text-subtle">
          {backupMessage}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {withText > 0 && onBackup && (
          <Button
            className="mr-auto"
            disabled={backingUp}
            onClick={() => {
              setBackingUp(true)
              void onBackup().then((message) => {
                setBackingUp(false)
                setBackupMessage(message)
              })
            }}
          >
            {backingUp ? 'Đang sao lưu…' : 'Sao lưu trước…'}
          </Button>
        )}
        <Button variant="light" onClick={onClose} autoFocus>
          Hủy
        </Button>
        <Button
          color="danger"
          variant="solid"
          disabled={backingUp}
          onClick={() => {
            onDelete(chapters)
            onClose()
          }}
        >
          {'Xóa ' + chapters.length + ' chương'}
        </Button>
      </div>
    </div>
  )
}
