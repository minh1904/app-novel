import type { JSX } from 'react'
import { FilterIcon } from '@solar-icons/react/linear/filter'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { Button } from '../../components/Button'
import { MOCK_FEATURES, SOON_LABEL } from '../work/mockFeatures'

/**
 * Illustration of the Từng câu filter toolbar: search boxes for the source and the translation, a
 * status filter, merge and split. No control reads a row, filters the list or changes anything.
 * See delivery/backlog.md, `sentence-mode-toolbar`.
 */
export function SentenceFilterToolbarMock(): JSX.Element {
  return (
    <div
      role="group"
      aria-label={MOCK_FEATURES.sentenceModeToolbar.label + ' (' + SOON_LABEL + ')'}
      className="flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-control/50 px-2.5 py-1.5"
    >
      <label className="flex h-6 min-w-[120px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">
        <MinimalisticMagnifierIcon
          size={13}
          className="shrink-0 text-ink-muted"
          aria-hidden="true"
        />
        <input
          disabled
          placeholder="Tìm trong bản gốc…"
          aria-label="Tìm trong bản gốc"
          className="min-w-0 flex-1 bg-transparent text-ui-xs outline-none placeholder:text-ink-muted"
        />
      </label>
      <label className="flex h-6 min-w-[120px] flex-1 items-center gap-1.5 rounded-control border border-line-strong px-2">
        <MinimalisticMagnifierIcon
          size={13}
          className="shrink-0 text-ink-muted"
          aria-hidden="true"
        />
        <input
          disabled
          placeholder="Tìm trong bản dịch…"
          aria-label="Tìm trong bản dịch"
          className="min-w-0 flex-1 bg-transparent text-ui-xs outline-none placeholder:text-ink-muted"
        />
      </label>
      <Button variant="outline" size="sm" disabled>
        <FilterIcon size={13} />
        Mọi trạng thái
      </Button>
      <Button variant="outline" size="sm" disabled>
        Gộp
      </Button>
      <Button variant="outline" size="sm" disabled>
        Tách
      </Button>
      <span className="ml-auto shrink-0 rounded-item bg-selected px-1.5 py-px text-ui-xs text-ink">
        {SOON_LABEL}
      </span>
    </div>
  )
}

/** Fixed sample data: one suggestion, not computed from the row actually selected. */
const SUGGESTION = {
  source: 'also warden of the almshouses, if the bishop in each case approved.',
  target: 'cũng là người quản lý nhà tế bần, nếu giám mục trong mỗi trường hợp chấp thuận.',
  match: '100% khớp'
}

/**
 * Illustration of the panel below the row table: tabs for Gợi ý / Thuật ngữ / Lịch sử / QA of the
 * selected row. Only the "Gợi ý" tab has sample content; the tabs do not switch. See
 * delivery/backlog.md, `sentence-mode-side-panels`.
 */
export function SentenceSuggestionPanelMock(): JSX.Element {
  return (
    <div
      aria-label={MOCK_FEATURES.sentenceModeSidePanels.label + ' (' + SOON_LABEL + ')'}
      className="flex h-[150px] shrink-0 flex-col gap-2 rounded-panel border border-line bg-sidebar p-2.5"
    >
      <div className="flex items-center gap-3 text-ui-xs">
        <span className="rounded-control bg-selected px-2 py-0.5 text-ink">
          Gợi ý <span className="text-ink-muted">(1)</span>
        </span>
        <span aria-disabled="true" className="text-ink-muted">
          Thuật ngữ <span className="opacity-60">(3)</span>
        </span>
        <span aria-disabled="true" className="text-ink-muted">
          Lịch sử
        </span>
        <span aria-disabled="true" className="text-ink-muted">
          QA <span className="opacity-60">(2)</span>
        </span>
        <span className="ml-auto shrink-0 rounded-item bg-selected px-1.5 py-px text-ui-xs text-ink">
          {SOON_LABEL}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 overflow-y-auto rounded-control border border-line p-2.5 text-ui-xs">
        <p lang="en">{SUGGESTION.source}</p>
        <p lang="vi">{SUGGESTION.target}</p>
        <span className="flex items-center gap-2">
          <Button size="xs" variant="outline" disabled>
            Chèn
          </Button>
          <span className="text-ui-xs text-success">{SUGGESTION.match}</span>
        </span>
      </div>
    </div>
  )
}
