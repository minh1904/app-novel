import type { JSX } from 'react'
import { ImportIcon } from '@solar-icons/react/linear/import'
import { StarIcon } from '@solar-icons/react/linear/star'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { LanguageMark } from '../library/LanguageMark'
import type { SourceLanguage } from '../library/works'
import { SOON_LABEL } from './mockFeatures'

/** Fixed sample data: what the Sources area would hold, not anything read from this work. */
interface SourceRow {
  language: SourceLanguage
  label: string
  matched: number
  total: number
  updated: string
  primary?: boolean
}

const SOURCES: SourceRow[] = [
  {
    language: 'zh-Hant',
    label: 'Bản gốc phồn thể',
    matched: 12,
    total: 12,
    updated: 'Cập nhật hôm qua',
    primary: true
  },
  {
    language: 'en',
    label: 'Bản dịch tiếng Anh (đối chiếu)',
    matched: 8,
    total: 12,
    updated: 'Cập nhật 3 ngày trước'
  },
  {
    language: 'ja',
    label: 'Bản dịch tiếng Nhật',
    matched: 0,
    total: 12,
    updated: 'Chưa nhập chương nào'
  }
]

/**
 * Illustration of the Sources area: multiple raw bases, which one is primary, and how many
 * chapters of this work each has matched. No data is read or written; every control is disabled.
 * See delivery/backlog.md, `sources-area`.
 */
export function SourcesAreaMock(): JSX.Element {
  return (
    <section
      aria-labelledby="sources-heading"
      className="@container flex flex-col gap-4 rounded-panel border border-line p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="sources-heading" className="flex items-center gap-2 text-[15px] font-semibold">
            Nguồn raw
            <span className="rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink-muted">
              {SOON_LABEL}
            </span>
          </h2>
          <p className="max-w-[60ch] text-xs leading-[1.6] text-ink-muted">
            Quản lý các bản raw của tác phẩm và chọn nguồn chính để dịch; các bản còn lại dùng để
            đối chiếu.
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled>
          <ImportIcon size={13} />
          Nhập nguồn mới
        </Button>
      </div>

      <ul className="grid gap-3 @min-[640px]:grid-cols-2">
        {SOURCES.map((source) => (
          <li
            key={source.language}
            className={cx(
              'flex flex-col gap-2.5 rounded-control border p-3.5',
              source.primary ? 'border-line-strong bg-control/50' : 'border-line'
            )}
          >
            <div className="flex items-center gap-2.5">
              <LanguageMark language={source.language} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{source.label}</p>
                <p className="text-[12px] text-ink-muted">{source.updated}</p>
              </div>
              {source.primary && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-selected px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ink">
                  <StarIcon size={11} />
                  Nguồn chính
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-control">
                <div
                  className={cx(
                    'h-full rounded-full',
                    source.matched === 0 ? 'bg-ink-muted/30' : 'bg-info'
                  )}
                  style={{
                    width: (source.total === 0 ? 0 : (source.matched / source.total) * 100) + '%'
                  }}
                />
              </div>
              <span className="shrink-0 text-[11px] whitespace-nowrap text-ink-muted">
                {source.matched}/{source.total} chương khớp
              </span>
            </div>
            {!source.primary && (
              <Button variant="outline" size="xs" disabled className="self-start">
                Đặt làm nguồn chính
              </Button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-ink-muted">
        Bản minh họa: khu vực này chưa hoạt động và không thay đổi tác phẩm của bạn.
      </p>
    </section>
  )
}
