import type { JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CompactButton } from '../../components/ui/CompactButton'
import { Select } from '../../components/ui/Select'
import { PAGE_SIZES, pageCount, pageRange, pageWindow, type PageSize } from './chapterList'

/**
 * Range, page buttons and page size under the chapter list. Every control is a real button. A list
 * that fits on one page keeps only the range: the buttons would have nowhere to go, and the size
 * only matters once the list is longer than the smallest page.
 */
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
  const showSize = onPageSize !== undefined && total > PAGE_SIZES[0]

  return (
    <nav
      aria-label={'Phân trang ' + unit}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3"
    >
      <p role="status" className="text-body-xs text-subtle">
        {total === 0 ? 'Không có ' + unit : `${from}–${to} trong ${total} ${unit}`}
      </p>

      <div className="flex items-center gap-3">
        {showSize && (
          <Select<string>
            label={'Số ' + unit + ' mỗi trang'}
            value={String(pageSize)}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: size + ' ' + unit + '/trang'
            }))}
            onChange={(value) => onPageSize?.(Number(value) as PageSize)}
          />
        )}
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <CompactButton
              aria-label="Trang trước"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              icon={<AltArrowLeftIcon size={16} />}
            />
            {pageWindow(page, pages).map((entry, index) =>
              entry === null ? (
                <span key={'gap-' + index} aria-hidden="true" className="px-1 text-subtle">
                  …
                </span>
              ) : (
                <CompactButton
                  key={entry}
                  variant={entry === page ? 'light' : 'ghost'}
                  className="w-auto min-w-6 px-1.5 text-label-xs tabular-nums"
                  aria-label={'Trang ' + entry}
                  aria-current={entry === page ? 'page' : undefined}
                  onClick={() => onPage(entry)}
                  icon={entry}
                />
              )
            )}
            <CompactButton
              aria-label="Trang sau"
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              icon={<AltArrowRightIcon size={16} />}
            />
          </div>
        )}
      </div>
    </nav>
  )
}
