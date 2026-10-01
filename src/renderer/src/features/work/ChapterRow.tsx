import { memo, useRef, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { AltArrowUpIcon } from '@solar-icons/react/linear/alt-arrow-up'
import { DoubleAltArrowDownIcon } from '@solar-icons/react/linear/double-alt-arrow-down'
import { DoubleAltArrowUpIcon } from '@solar-icons/react/linear/double-alt-arrow-up'
import { FolderOpenIcon } from '@solar-icons/react/linear/folder-open'
import { HashtagIcon } from '@solar-icons/react/linear/hashtag'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import type { ChapterItem } from '../../../../shared/chapters'
import { cx } from '../../components/cx'
import { MenuItem, MenuPopup, MenuRoot, MenuSeparator, MenuTrigger } from '../../components/Menu'
import { formatFullDate, formatUpdatedParts } from '../library/format'
import { displayTitle } from './chapterList'

export interface ChapterRowActions {
  open(chapter: ChapterItem): void
  startRename(chapter: ChapterItem): void
  commitRename(chapter: ChapterItem, title: string): void
  cancelRename(): void
  moveTo(chapter: ChapterItem, to: number): void
  askMoveTo(chapter: ChapterItem): void
  askDelete(chapter: ChapterItem): void
}

/** Grid shared by the list header and every row, so the columns line up. */
export const CHAPTER_GRID =
  'grid grid-cols-[48px_minmax(0,1fr)_36px] @min-[560px]:grid-cols-[56px_minmax(0,1fr)_132px_36px]'

export const ChapterRow = memo(function ChapterRow({
  chapter,
  total,
  editing,
  highlighted,
  actions
}: {
  chapter: ChapterItem
  total: number
  editing: boolean
  highlighted: boolean
  actions: ChapterRowActions
}): JSX.Element {
  const label = displayTitle(chapter)
  const updatedAt = new Date(chapter.updatedAt)
  const updated = formatUpdatedParts(updatedAt)

  return (
    <li
      data-chapter-id={chapter.id}
      className={cx(
        CHAPTER_GRID,
        'items-center gap-x-2 border-b border-line px-1 py-1 transition-colors last:border-b-0',
        highlighted ? 'bg-selected' : 'hover:bg-control/60'
      )}
    >
      <span className="pl-2 text-xs text-ink-muted tabular-nums">{chapter.number}</span>

      {editing ? (
        <RenameInput chapter={chapter} actions={actions} />
      ) : (
        <button
          type="button"
          data-title-button
          title={label}
          className={cx(
            'min-w-0 cursor-pointer truncate rounded-[7px] px-2 py-1.5 text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-focus/40',
            chapter.title === '' && 'text-ink-muted'
          )}
          onClick={() => actions.open(chapter)}
          onKeyDown={(event) => {
            if (event.key === 'F2') {
              event.preventDefault()
              actions.startRename(chapter)
            }
          }}
        >
          {label}
        </button>
      )}

      <time
        className="hidden text-xs text-ink-muted @min-[560px]:block"
        dateTime={updatedAt.toISOString()}
        title={formatFullDate(updatedAt)}
      >
        {updated.day}
      </time>

      <MenuRoot>
        <MenuTrigger
          aria-label={'Thao tác với ' + label}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-control text-ink-muted outline-none hover:bg-selected hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-ink"
        >
          <MenuDotsIcon size={16} />
        </MenuTrigger>
        <MenuPopup>
          <MenuItem onClick={() => actions.open(chapter)}>
            <FolderOpenIcon size={14} />
            Mở chương
          </MenuItem>
          <MenuItem onClick={() => actions.startRename(chapter)}>
            <PenNewSquareIcon size={14} />
            Đổi tên
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            disabled={chapter.number <= 1}
            onClick={() => actions.moveTo(chapter, chapter.number - 1)}
          >
            <AltArrowUpIcon size={14} />
            Chuyển lên
          </MenuItem>
          <MenuItem
            disabled={chapter.number >= total}
            onClick={() => actions.moveTo(chapter, chapter.number + 1)}
          >
            <AltArrowDownIcon size={14} />
            Chuyển xuống
          </MenuItem>
          <MenuItem disabled={chapter.number <= 1} onClick={() => actions.moveTo(chapter, 1)}>
            <DoubleAltArrowUpIcon size={14} />
            Lên đầu
          </MenuItem>
          <MenuItem
            disabled={chapter.number >= total}
            onClick={() => actions.moveTo(chapter, total)}
          >
            <DoubleAltArrowDownIcon size={14} />
            Xuống cuối
          </MenuItem>
          <MenuItem disabled={total < 2} onClick={() => actions.askMoveTo(chapter)}>
            <HashtagIcon size={14} />
            Chuyển tới vị trí…
          </MenuItem>
          <MenuSeparator />
          <MenuItem tone="destructive" onClick={() => actions.askDelete(chapter)}>
            <TrashBinMinimalisticIcon size={14} />
            Xóa chương…
          </MenuItem>
        </MenuPopup>
      </MenuRoot>
    </li>
  )
})

/** Renames in place: Enter or leaving the field saves, Escape keeps the old name. */
function RenameInput({
  chapter,
  actions
}: {
  chapter: ChapterItem
  actions: ChapterRowActions
}): JSX.Element {
  // Escape unmounts the input, which fires blur; this flag stops that blur from saving.
  const cancelled = useRef(false)

  return (
    <input
      autoFocus
      aria-label={'Tên chương ' + chapter.number}
      defaultValue={chapter.title}
      placeholder={'Chương ' + chapter.number}
      maxLength={200}
      className="h-[30px] min-w-0 rounded-control border border-focus bg-canvas px-2 text-[13px] outline-none ring-2 ring-focus/25 placeholder:text-ink-muted"
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancelled.current = true
          actions.cancelRename()
        }
      }}
      onBlur={(event) => {
        if (cancelled.current) return
        actions.commitRename(chapter, event.target.value)
      }}
    />
  )
}
