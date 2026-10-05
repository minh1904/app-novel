import type { JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { PAGE_SIZES, pageCount, pageRange, pageWindow, type PageSize } from './chapterList'

/** Range, page buttons and page size under the chapter list. Every control is a real button. */
export function ChapterPager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  unit = 'chương'
}: {
  page: number
  pageSize: number
  /** Items in the current result (after filtering). */
  total: number
  onPage(page: number): void
  /** Leave out to hide the page-size choice, for lists with a fixed page size. */
  onPageSize?: (size: PageSize) => void
  /** What is being paged, for the labels: "chương", "segment". */
  unit?: string
}): JSX.Element {
  const pages = pageCount(total, pageSize)
  const { from, to } = pageRange(page, total, pageSize)

  return (
    <nav
      aria-label={'Phân trang ' + unit}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3"
    >
      <p role="status" className="text-ui-xs text-ink-muted">
        {total === 0 ? 'Không có ' + unit : `${from}–${to} trong ${total} ${unit}`}
      </p>

      <div className="flex items-center gap-3">
        {onPageSize && (
          <Select<string>
            label={'Số ' + unit + ' mỗi trang'}
            value={String(pageSize)}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: size + ' ' + unit + '/trang'
            }))}
            onChange={(value) => onPageSize(Number(value) as PageSize)}
          />
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <AltArrowLeftIcon size={15} />
          </Button>
          {pageWindow(page, pages).map((entry, index) =>
            entry === null ? (
              <span key={'gap-' + index} aria-hidden="true" className="px-1 text-ink-muted">
                …
              </span>
            ) : (
              <Button
                key={entry}
                variant={entry === page ? 'secondary' : 'ghost-muted'}
                size="icon"
                aria-label={'Trang ' + entry}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onPage(entry)}
              >
                {entry}
              </Button>
            )
          )}
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Trang sau"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            <AltArrowRightIcon size={15} />
          </Button>
        </div>
      </div>
    </nav>
  )
}
