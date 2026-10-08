import { type JSX, type ReactNode, useState } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../lib/cn'
import { focusRing } from './focus'

export interface DropZoneProps {
  /** Opens the file picker (the hidden file input of the screen). */
  onBrowse(): void
  /** The files dropped on the zone. */
  onDrop(files: FileList): void
  /** A preview fills the zone: the border turns solid and the hint is gone. */
  filled?: boolean
  disabled?: boolean
  'aria-label': string
  /** Size and shape, e.g. `aspect-2/3 w-full` for a cover. */
  className?: string
  /** The preview, or an icon and a hint. */
  children: ReactNode
}

/**
 * A place to drop a file or click to pick one: a dashed box that lights up while a file is dragged over
 * it. The screen keeps the hidden file input and reads the file.
 */
export function DropZone({
  onBrowse,
  onDrop,
  filled = false,
  disabled,
  className,
  children,
  ...props
}: DropZoneProps): JSX.Element {
  const [dragging, setDragging] = useState(false)
  return (
    <BaseButton
      data-slot="drop-zone"
      type="button"
      disabled={disabled}
      aria-label={props['aria-label']}
      onClick={onBrowse}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        onDrop(event.dataTransfer.files)
      }}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center gap-xs overflow-hidden rounded-sm border border-(--mira-border-input) text-center',
        'transition-colors duration-(--mira-duration-fast) ease-standard data-disabled:cursor-not-allowed data-disabled:opacity-60',
        filled ? '' : 'border-dashed bg-subtle hover:bg-hover',
        dragging && 'border-focus bg-selected',
        focusRing,
        className
      )}
    >
      {children}
    </BaseButton>
  )
}
