import { useRef, useState, type JSX } from 'react'
import { ArchiveIcon } from '@solar-icons/react/linear/archive'
import { GalleryAddIcon } from '@solar-icons/react/linear/gallery-add'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import { PauseIcon } from '@solar-icons/react/linear/pause'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { PlayIcon } from '@solar-icons/react/linear/play'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import { UploadMinimalisticIcon } from '@solar-icons/react/linear/upload-minimalistic'
import { AddIcon } from '@solar-icons/react/linear/add'
import { Button, LinkButton } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import {
  MenuItem,
  MenuPopup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger
} from '../../components/ui/DropdownMenu'
import { formatFullDate, formatUpdated } from '../library/format'
import { WorkCover } from '../library/WorkCover'
import { languages, statusLabels, type Work } from '../library/works'

/** Descriptions longer than this are folded to three lines with "Xem thêm". */
const LONG_DESCRIPTION = 220

export interface WorkHeaderActions {
  onContinue(): void
  onAddChapter(): void
  onEdit(): void
  onSetPaused(paused: boolean): void
  onSetArchived(archived: boolean): void
  onSetCover(file: File | null): void
  onBackup(): void
  onExport(): void
}

/**
 * Everything about the work above the areas: cover, names, status, description and the main
 * action. Optional fields that are empty leave no gap and no empty label.
 */
export function WorkHeader({
  work,
  actions
}: {
  work: Work
  actions: WorkHeaderActions
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const coverInput = useRef<HTMLInputElement>(null)
  const byline = [work.author, work.genre].filter(Boolean).join(' · ')
  const long =
    work.description !== undefined &&
    (work.description.length > LONG_DESCRIPTION || work.description.split('\n').length > 3)

  return (
    <div className="@container">
      <header className="flex flex-col gap-4 @min-[520px]:flex-row @min-[520px]:gap-5">
        <WorkCover work={work} size="lg" className="@max-[519px]:self-start" />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-body-lg leading-tight font-semibold break-words">{work.title}</h2>
            {work.originalTitle && (
              <p lang={work.sourceLanguage} className="text-body-sm text-subtle break-words">
                {work.originalTitle}
              </p>
            )}
            {byline && <p className="text-body-sm break-words">{byline}</p>}
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-xs text-subtle">
            <span
              className={cn(
                'rounded-sm px-2 py-0.5 font-medium',
                work.status === 'in-progress' ? 'bg-selected text-default' : 'bg-muted text-default'
              )}
            >
              {statusLabels[work.status]}
            </span>
            {work.archived && (
              <span className="rounded-sm bg-muted px-2 py-0.5 font-medium text-default">
                Đã lưu trữ
              </span>
            )}
            <span>{languages[work.sourceLanguage].short} → Việt</span>
            <span aria-hidden="true">·</span>
            <span>{work.chapterCount} chương</span>
            <span aria-hidden="true">·</span>
            <time dateTime={work.updatedAt.toISOString()} title={formatFullDate(work.updatedAt)}>
              Sửa {formatUpdated(work.updatedAt).toLocaleLowerCase('vi')}
            </time>
          </p>

          {work.description && (
            <div className="flex max-w-[68ch] flex-col items-start gap-1">
              <p
                id="work-description"
                className={cn(
                  'text-body-sm leading-normal whitespace-pre-line',
                  long && !expanded && 'line-clamp-3'
                )}
              >
                {work.description}
              </p>
              {long && (
                <LinkButton
                  aria-expanded={expanded}
                  aria-controls="work-description"
                  onClick={() => setExpanded((open) => !open)}
                >
                  {expanded ? 'Thu gọn' : 'Xem thêm'}
                </LinkButton>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {work.lastChapter ? (
              <Button
                variant="solid"
                onClick={actions.onContinue}
                title={'Tiếp tục chương ' + work.lastChapter.number}
              >
                <PlayIcon size={14} />
                Tiếp tục
                <span className="font-normal opacity-70">· Chương {work.lastChapter.number}</span>
              </Button>
            ) : (
              <Button variant="solid" onClick={actions.onAddChapter}>
                <AddIcon size={14} />
                Thêm chương
              </Button>
            )}
            <Button onClick={actions.onEdit}>
              <PenNewSquareIcon size={14} />
              Sửa thông tin
            </Button>
            <Button onClick={actions.onExport}>
              <UploadMinimalisticIcon size={14} />
              Xuất tác phẩm…
            </Button>
            <MenuRoot>
              <MenuTrigger
                aria-label="Thao tác khác với tác phẩm"
                className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-sm text-subtle outline-none hover:bg-hover hover:text-default focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-default"
              >
                <MenuDotsIcon size={16} />
              </MenuTrigger>
              <MenuPopup align="start">
                {work.status === 'in-progress' && (
                  <MenuItem onClick={() => actions.onSetPaused(true)}>
                    <PauseIcon size={14} />
                    Tạm dừng dịch
                  </MenuItem>
                )}
                {work.status === 'paused' && (
                  <MenuItem onClick={() => actions.onSetPaused(false)}>
                    <PlayIcon size={14} />
                    Dịch tiếp
                  </MenuItem>
                )}
                <MenuItem onClick={() => coverInput.current?.click()}>
                  <GalleryAddIcon size={14} />
                  {work.coverVersion === undefined ? 'Thêm ảnh bìa…' : 'Đổi ảnh bìa…'}
                </MenuItem>
                {work.coverVersion !== undefined && (
                  <MenuItem onClick={() => actions.onSetCover(null)}>
                    <TrashBinMinimalisticIcon size={14} />
                    Gỡ ảnh bìa
                  </MenuItem>
                )}
                <MenuItem onClick={actions.onBackup}>
                  <UploadMinimalisticIcon size={14} />
                  Sao lưu…
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={() => actions.onSetArchived(!work.archived)}>
                  <ArchiveIcon size={14} />
                  {work.archived ? 'Đưa khỏi lưu trữ' : 'Lưu trữ'}
                </MenuItem>
              </MenuPopup>
            </MenuRoot>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label={'Ảnh bìa mới cho ' + work.title}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) actions.onSetCover(file)
              }}
            />
          </div>
        </div>
      </header>
    </div>
  )
}
