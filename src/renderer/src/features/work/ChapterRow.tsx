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
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import { cn } from '../../lib/cn'
import { Badge, type BadgeColor } from '../../components/ui/Badge'
import { Checkbox } from '../../components/ui/Checkbox'
import { LinkButton } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { ICON } from '../../components/ui/icon'
import { Input } from '../../components/ui/Input'
import {
  MenuItem,
  MenuPopup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger
} from '../../components/ui/DropdownMenu'
import { formatFullDate, formatUpdatedParts } from '../library/format'
import { chapterState, chapterStateLabels, displayTitle, type ChapterState } from './chapterList'

export interface ChapterRowActions {
  open(chapter: ChapterItem): void
  startRename(chapter: ChapterItem): void
  commitRename(chapter: ChapterItem, title: string): void
  cancelRename(): void
  moveTo(chapter: ChapterItem, to: number): void
  askMoveTo(chapter: ChapterItem): void
  askDelete(chapter: ChapterItem): void
  /** Ticks or unticks the chapter; with Shift, every chapter between it and the last one ticked. */
  select(chapter: ChapterItem, checked: boolean, range: boolean): void
}

/** Grid shared by the list header and every row, so the columns line up. */
export const CHAPTER_GRID =
  'grid grid-cols-[28px_40px_minmax(0,1fr)_36px] @min-[560px]:grid-cols-[28px_48px_minmax(0,1fr)_132px_132px_36px]'

/** The same colours as the dots of the chapter sidebar (ChapterNavSidebar). */
const STATE_COLORS: Record<ChapterState, BadgeColor> = {
  translated: 'success',
  untranslated: 'warning',
  empty: 'neutral'
}

export const ChapterRow = memo(function ChapterRow({
  chapter,
  total,
  editing,
  highlighted,
  selected,
  actions
}: {
  chapter: ChapterItem
  total: number
  editing: boolean
  highlighted: boolean
  selected: boolean
  actions: ChapterRowActions
}): JSX.Element {
  const label = displayTitle(chapter)
  const updatedAt = new Date(chapter.updatedAt)
  const updated = formatUpdatedParts(updatedAt)
  const state = chapterState(chapter)

  return (
    <li
      data-chapter-id={chapter.id}
      className={cn(
        CHAPTER_GRID,
        'items-center gap-x-2 border-b border-default px-1 py-1 transition-colors last:border-b-0',
        highlighted || selected ? 'bg-selected' : 'hover:bg-hover'
      )}
    >
      <Checkbox
        aria-label={'Chọn ' + label}
        className="justify-self-center"
        checked={selected}
        onCheckedChange={(checked, details) =>
          actions.select(chapter, checked, (details.event as MouseEvent).shiftKey === true)
        }
      />
      <span className="text-body-xs text-subtle">{chapter.number}</span>

      {editing ? (
        <RenameInput chapter={chapter} actions={actions} />
      ) : (
        <LinkButton
          color="neutral"
          data-title-button
          title={label}
          className="min-w-0 max-w-full justify-self-start"
          onClick={() => actions.open(chapter)}
          onKeyDown={(event) => {
            if (event.key === 'F2') {
              event.preventDefault()
              actions.startRename(chapter)
            }
          }}
        >
          <span className={cn('min-w-0 truncate', chapter.title === '' && 'text-muted')}>
            {label}
          </span>
        </LinkButton>
      )}

      <Badge
        variant="plain"
        dot
        color={STATE_COLORS[state]}
        className="hidden @min-[560px]:inline-flex"
      >
        {chapterStateLabels[state]}
      </Badge>

      <time
        className="hidden text-body-xs text-subtle @min-[560px]:block"
        dateTime={updatedAt.toISOString()}
        title={formatFullDate(updatedAt)}
      >
        {updated.day}
      </time>

      <MenuRoot>
        <MenuTrigger
          render={
            <CompactButton
              aria-label={'Thao tác với ' + label}
              icon={<MenuDotsIcon size={ICON.sm} />}
            />
          }
        />
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
          <MenuItem tone="danger" onClick={() => actions.askDelete(chapter)}>
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
    <Input
      autoFocus
      aria-label={'Tên chương ' + chapter.number}
      defaultValue={chapter.title}
      placeholder={'Chương ' + chapter.number}
      maxLength={200}
      className="min-w-0"
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
