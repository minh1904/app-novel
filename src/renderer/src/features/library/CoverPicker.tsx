import { useRef, useState, type JSX } from 'react'
import { GalleryAddIcon } from '@solar-icons/react/linear/gallery-add'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { CoverImageError, fileToCoverDataUrl } from './coverImage'

/**
 * Chooses a cover image. The file never leaves the renderer as a path: it is decoded, shrunk and
 * re-encoded here, and only the resulting JPEG is passed on.
 */
export function CoverPicker({
  value,
  onChange,
  disabled
}: {
  /** The current cover as a data URL. */
  value: string | null
  onChange(cover: string | null): void
  disabled?: boolean
}): JSX.Element {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  async function accept(file: File | undefined): Promise<void> {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await fileToCoverDataUrl(file))
    } catch (caught) {
      setError(caught instanceof CoverImageError ? caught.message : 'Không xử lý được ảnh này.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex w-[168px] flex-col gap-2.5">
      <span className="text-[11px] font-semibold">Ảnh bìa (tùy chọn)</span>
      <button
        type="button"
        disabled={disabled || busy}
        aria-label={value ? 'Đổi ảnh bìa' : 'Tải ảnh bìa lên'}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void accept(event.dataTransfer.files[0])
        }}
        className={cx(
          'relative flex aspect-[2/3] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-control border text-center outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-default disabled:opacity-60',
          value
            ? 'border-line-strong'
            : 'border-dashed border-line-strong bg-control/40 hover:bg-control',
          dragging && 'border-focus bg-control'
        )}
      >
        {value ? (
          <img src={value} alt="Xem trước ảnh bìa" className="size-full object-cover" />
        ) : (
          <>
            <GalleryAddIcon size={26} className="text-ink-muted" />
            <span className="px-3 text-[11px] leading-[1.4] text-ink-muted">
              {busy ? 'Đang xử lý…' : 'Bấm để chọn hoặc kéo ảnh vào đây'}
            </span>
          </>
        )}
      </button>

      {value && (
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
          >
            Đổi ảnh
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Gỡ ảnh bìa"
            title="Gỡ ảnh bìa"
            disabled={disabled || busy}
            onClick={() => {
              setError(null)
              onChange(null)
            }}
          >
            <TrashBinMinimalisticIcon size={15} />
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-[11px] leading-[1.4] text-error">
          {error}
        </p>
      ) : (
        <p className="text-[10px] leading-[1.4] text-ink-muted">
          JPEG, PNG hoặc WebP. Ảnh được thu nhỏ khi lưu.
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Clear so choosing the same file again still fires a change event.
          event.target.value = ''
          void accept(file)
        }}
      />
    </div>
  )
}
