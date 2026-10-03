import type { JSX } from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { BookBookmarkIcon } from '@solar-icons/react/linear/book-bookmark'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { UsersGroupRoundedIcon } from '@solar-icons/react/linear/users-group-rounded'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { TabsList, TabsPanel, TabsRoot, TabsTab } from '../../components/Tabs'
import { SOON_LABEL } from './mockFeatures'

/** Fixed sample data: what the Context area would hold, not anything read from this work. */
interface HonorificRow {
  from: string
  to: string
  form: string
  changedAtChapter?: number
  note: string
  pending?: boolean
}

const HONORIFICS: HonorificRow[] = [
  { from: 'Tuệ Lâm', to: 'Bạch Dực', form: '"cậu" – "tớ"', note: 'Bạn học cùng lớp, từ chương 1' },
  {
    from: 'Tuệ Lâm',
    to: 'Bạch Dực',
    form: '"anh" – "em"',
    changedAtChapter: 14,
    note: 'AI phát hiện đổi cách xưng sau cảnh tỏ tình ở chương 13',
    pending: true
  },
  { from: 'Bạch Dực', to: 'thầy Vũ Thành', form: '"thầy" – "em"', note: 'Giữ nguyên suốt truyện' },
  {
    from: 'Tuệ Lâm',
    to: 'mẹ',
    form: '—',
    note: 'Chỉ xuất hiện 1 chương, chưa đủ hội thoại để xác định'
  }
]

interface TermRow {
  source: string
  target: string
  note: string
}

const TERMS: TermRow[] = [
  { source: 'Linh khí', target: 'linh khí', note: 'Sức mạnh tu luyện — không dịch là "khí linh"' },
  { source: 'Thiên Lam Tông', target: 'Thiên Lam Tông', note: 'Tên môn phái, giữ Hán Việt' },
  {
    source: 'Phá Quân Kiếm Pháp Đệ Tam Thức: Vân Tranh',
    target: 'Phá Quân Kiếm Pháp — chiêu thứ ba: Vân Tranh',
    note: 'Tên chiêu thức dài, đã thống nhất cách ngắt từ chương 4'
  },
  { source: 'Dao Trì', target: 'Dao Trì', note: '' }
]

/**
 * Illustration of the Context area: honorifics matrix (the P0 pain point in open-questions.md),
 * terminology and style voice. No data is read or written; every control is disabled. See
 * delivery/backlog.md, `context-area`.
 */
export function ContextAreaMock(): JSX.Element {
  return (
    <section
      aria-labelledby="context-heading"
      className="@container flex flex-col gap-4 rounded-panel border border-line p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="context-heading" className="flex items-center gap-2 text-[15px] font-semibold">
          Ngữ cảnh dịch
          <span className="rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink-muted">
            {SOON_LABEL}
          </span>
        </h2>
        <p className="max-w-[60ch] text-xs leading-[1.6] text-ink-muted">
          Những quy ước giúp AI dịch nhất quán trong cả tác phẩm: xưng hô giữa các nhân vật, thuật
          ngữ gốc–dịch, và văn phong học từ bản dịch cũ.
        </p>
      </div>

      <TabsRoot defaultValue="xung-ho">
        <TabsList aria-label="Loại ngữ cảnh">
          <TabsTab value="xung-ho">Xưng hô</TabsTab>
          <TabsTab value="thuat-ngu">Thuật ngữ</TabsTab>
          <TabsTab value="van-phong">Văn phong</TabsTab>
        </TabsList>

        <TabsPanel value="xung-ho" className="pt-4 outline-none">
          <HonorificsTable />
        </TabsPanel>
        <TabsPanel value="thuat-ngu" className="pt-4 outline-none">
          <TermsTable />
        </TabsPanel>
        <TabsPanel value="van-phong" className="pt-4 outline-none">
          <StylePanel />
        </TabsPanel>
      </TabsRoot>

      <p className="text-[12px] text-ink-muted">
        Bản minh họa: khu vực này chưa hoạt động và không thay đổi tác phẩm của bạn.
      </p>
    </section>
  )
}

const honorificGrid =
  'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_84px_minmax(0,1.4fr)] items-start gap-3 @max-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
const hideBelow720 = '@max-[720px]:hidden'

function HonorificsTable(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">Ai gọi ai là gì, và từ chương nào đổi cách xưng.</p>
        <Button variant="outline" size="sm" disabled>
          <AddIcon size={13} />
          Thêm cách xưng hô
        </Button>
      </div>
      <div className="overflow-hidden rounded-panel border border-line">
        <div
          className={cx(
            honorificGrid,
            'border-b border-line bg-sidebar px-3 py-2 text-[12px] font-medium text-ink-muted'
          )}
        >
          <span>Người nói → người nghe</span>
          <span>Cách xưng</span>
          <span className={hideBelow720}>Đổi từ</span>
          <span className={hideBelow720}>Ghi chú</span>
        </div>
        <ul>
          {HONORIFICS.map((row, index) => (
            <li
              key={index}
              className={cx(
                honorificGrid,
                'border-b border-line px-3 py-2.5 text-[13px] last:border-b-0',
                row.pending && 'bg-warning/6'
              )}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <UsersGroupRoundedIcon size={13} className="shrink-0 text-ink-muted" />
                {row.from} → {row.to}
              </span>
              <span className="flex flex-col items-start gap-1.5">
                {row.form}
                {row.pending && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="w-fit rounded-full bg-warning/14 px-1.5 py-px text-[11px] font-semibold whitespace-nowrap text-warning">
                      Chờ duyệt · từ chương {row.changedAtChapter}
                    </span>
                    <Button size="xxs" disabled>
                      Duyệt
                    </Button>
                    <Button size="xxs" variant="outline" disabled>
                      Từ chối
                    </Button>
                  </span>
                )}
              </span>
              <span className={cx('text-ink-muted', hideBelow720)}>
                {row.changedAtChapter ? 'Ch. ' + row.changedAtChapter : '—'}
              </span>
              <span className={cx('leading-[1.5] text-ink-muted', hideBelow720)}>{row.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const termGrid =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-3 @max-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
const hideBelow640 = '@max-[640px]:hidden'

function TermsTable(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          Tên người, địa danh, chiêu thức: bản gốc và cách dịch đã chốt.
        </p>
        <Button variant="outline" size="sm" disabled>
          <AddIcon size={13} />
          Thêm thuật ngữ
        </Button>
      </div>
      <div className="overflow-hidden rounded-panel border border-line">
        <div
          className={cx(
            termGrid,
            'border-b border-line bg-sidebar px-3 py-2 text-[12px] font-medium text-ink-muted'
          )}
        >
          <span className="flex items-center gap-1.5">
            <BookBookmarkIcon size={13} />
            Bản gốc
          </span>
          <span>Bản dịch</span>
          <span className={hideBelow640}>Ghi chú</span>
        </div>
        <ul>
          {TERMS.map((term) => (
            <li
              key={term.source}
              className={cx(
                termGrid,
                'border-b border-line px-3 py-2.5 text-[13px] last:border-b-0'
              )}
            >
              <span className="font-medium" lang="zh-Hant">
                {term.source}
              </span>
              <span>{term.target}</span>
              <span className={cx('leading-[1.5] text-ink-muted', hideBelow640)}>
                {term.note || '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StylePanel(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-[1.6] text-ink-muted">
        Học giọng văn từ bản dịch cũ của bạn, áp dụng khi AI dịch đoạn mới hoặc viết lại theo yêu
        cầu.
      </p>
      <div className="flex flex-col gap-1.5 rounded-control border border-line bg-control/50 p-3.5">
        <p className="text-[12.5px] font-medium">Giọng văn hiện tại</p>
        <p className="text-[12.5px] leading-[1.6] text-ink-muted">
          Câu ngắn, thoại tự nhiên, ít từ Hán Việt trừ thuật ngữ tu luyện. Người kể xưng “tôi” ở các
          đoạn hồi tưởng.
        </p>
      </div>
      <div className="grid gap-3 @min-[560px]:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-control border border-line p-3">
          <p className="text-[11px] font-medium text-ink-muted">
            Bản dịch cũ (nguồn học văn phong)
          </p>
          <p className="text-[12.5px] leading-[1.6] text-ink-muted italic">
            “Nàng chỉ lặng im, ánh mắt dõi theo bóng hắn khuất dần sau rặng trúc.”
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-control border border-line p-3">
          <p className="text-[11px] font-medium text-ink-muted">Áp dụng cho câu mới</p>
          <p className="text-[12.5px] leading-[1.6] italic">
            “Cô chẳng nói gì, chỉ nhìn theo bóng cậu khuất dần sau hàng trúc.”
          </p>
        </div>
      </div>
      <div>
        <Button variant="outline" size="sm" disabled>
          <PenNewSquareIcon size={13} />
          Sửa mô tả văn phong
        </Button>
      </div>
    </div>
  )
}
