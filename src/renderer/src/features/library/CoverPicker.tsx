import { useRef, useState, type JSX } from 'react'
import { GalleryAddIcon } from '@solar-icons/react/linear/gallery-add'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import { Button } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { DropZone } from '../../components/ui/DropZone'
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
      <span className="text-body-xs font-semibold">Ảnh bìa (tùy chọn)</span>
      <DropZone
        disabled={disabled || busy}
        aria-label={value ? 'Đổi ảnh bìa' : 'Tải ảnh bìa lên'}
        onBrowse={() => input.current?.click()}
        onDrop={(files) => void accept(files[0])}
        filled={Boolean(value)}
        className="aspect-2/3 w-full"
      >
        {value ? (
          <img src={value} alt="Xem trước ảnh bìa" className="size-full object-cover" />
        ) : (
          <>
            <GalleryAddIcon size={24} className="text-subtle" />
            <span className="px-3 text-body-xs leading-tight text-subtle">
              {busy ? 'Đang xử lý…' : 'Bấm để chọn hoặc kéo ảnh vào đây'}
            </span>
          </>
        )}
      </DropZone>

      {value && (
        <div className="flex gap-1.5">
          <Button
            variant="light"
            className="flex-1"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
          >
            Đổi ảnh
          </Button>
          <CompactButton
            aria-label="Gỡ ảnh bìa"
            title="Gỡ ảnh bìa"
            disabled={disabled || busy}
            onClick={() => {
              setError(null)
              onChange(null)
            }}
            icon={<TrashBinMinimalisticIcon size={16} />}
          />
        </div>
      )}

      {error ? (
        <p role="alert" className="text-body-xs leading-tight text-error">
          {error}
        </p>
      ) : (
        <p className="text-body-xs leading-tight text-subtle">
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
