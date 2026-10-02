import type { JSX } from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { ArchiveIcon } from '@solar-icons/react/linear/archive'
import { ClockCircleIcon } from '@solar-icons/react/linear/clock-circle'
import { FolderIcon } from '@solar-icons/react/linear/folder'
import { LibraryIcon } from '@solar-icons/react/linear/library'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { WorkCover } from './WorkCover'
import { workProgressLabel, type Work } from './works'

export type LibrarySection = 'all' | 'recent' | 'archived'

const sections: Array<{ id: LibrarySection; label: string; icon: JSX.Element }> = [
  { id: 'all', label: 'Tất cả tác phẩm', icon: <LibraryIcon size={17} /> },
  { id: 'recent', label: 'Gần đây', icon: <ClockCircleIcon size={17} /> },
  { id: 'archived', label: 'Lưu trữ', icon: <ArchiveIcon size={17} /> }
]

const itemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus/40'

export function LibrarySidebar({
  activeSection,
  onSelectSection,
  recentWorks,
  hasWorks,
  onOpenWork,
  onCreateWork
}: {
  /** Undefined when the current screen is not a library section. */
  activeSection?: LibrarySection
  onSelectSection(section: LibrarySection): void
  recentWorks: Work[]
  hasWorks: boolean
  onOpenWork(work: Work): void
  onCreateWork(): void
}): JSX.Element {
  return (
    <>
      <div className="flex items-center justify-between px-5 pt-1 pb-2">
        <h2 className="text-[13px] font-semibold">Thư viện</h2>
        <Button variant="outline" size="sm" onClick={onCreateWork}>
          <AddIcon size={13} />
          Tạo tác phẩm
        </Button>
      </div>

      <nav className="flex flex-col gap-0.5 px-3" aria-label="Thư viện">
        {sections.map((section) => {
          const active = section.id === activeSection
          return (
            <button
              key={section.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={cx(
                itemClass,
                'h-7 font-medium',
                active ? 'bg-selected text-ink' : 'text-ink-muted hover:bg-control hover:text-ink'
              )}
              onClick={() => onSelectSection(section.id)}
            >
              {section.icon}
              {section.label}
            </button>
          )
        })}
      </nav>

      <section
        className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line px-3 pt-4"
        aria-labelledby="recent-works-heading"
      >
        <h2
          id="recent-works-heading"
          className="mb-1.5 px-2.5 text-[12px] font-medium text-ink-muted"
        >
          Tác phẩm gần đây
        </h2>
        {hasWorks ? (
          <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
            {recentWorks.map((work) => (
              <li key={work.id}>
                <button
                  type="button"
                  className={cx(itemClass, 'py-1.5 pl-2 hover:bg-control')}
                  onClick={() => onOpenWork(work)}
                >
                  <WorkCover work={work} size="xs" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-ink">{work.title}</span>
                    <span className="truncate text-[12px] text-ink-muted">
                      {workProgressLabel(work)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 pb-10 text-center">
            <FolderIcon size={28} className="text-ink-muted" />
            <p className="text-xs font-semibold text-ink-muted">Chưa có tác phẩm nào</p>
            <p className="text-[12px] leading-[1.5] text-ink-muted">
              Tác phẩm bạn tạo sẽ hiện ở đây để mở lại nhanh.
            </p>
          </div>
        )}
      </section>
    </>
  )
}
