import type { JSX } from 'react'
import { FilterIcon } from '@solar-icons/react/linear/filter'
import { Button } from '../../../components/ui/Button'
import { ICON } from '../../../components/ui/icon'
import { SearchInput } from '../../../components/ui/Input'
import { MOCK_FEATURES, SOON_LABEL } from '../../../lib/mockFeatures'

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
      className="flex flex-wrap items-center gap-1.5 rounded-sm border border-default bg-muted/50 px-2.5 py-1.5"
    >
      <SearchInput
        disabled
        label="Tìm trong bản gốc"
        placeholder="Tìm trong bản gốc…"
        className="min-w-[120px] flex-1"
      />
      <SearchInput
        disabled
        label="Tìm trong bản dịch"
        placeholder="Tìm trong bản dịch…"
        className="min-w-[120px] flex-1"
      />
      <Button disabled leftIcon={<FilterIcon size={ICON.sm} aria-hidden="true" />}>
        Mọi trạng thái
      </Button>
      <Button disabled>Gộp</Button>
      <Button disabled>Tách</Button>
      <span className="ml-auto shrink-0 rounded-sm bg-selected px-1.5 py-px text-body-xs text-default">
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
      className="flex h-[150px] shrink-0 flex-col gap-2 rounded-lg border border-default bg-subtle p-2.5"
    >
      <div className="flex items-center gap-3 text-body-xs">
        <span className="rounded-sm bg-selected px-2 py-0.5 text-default">
          Gợi ý <span className="text-subtle">(1)</span>
        </span>
        <span aria-disabled="true" className="text-subtle">
          Thuật ngữ <span className="opacity-60">(3)</span>
        </span>
        <span aria-disabled="true" className="text-subtle">
          Lịch sử
        </span>
        <span aria-disabled="true" className="text-subtle">
          QA <span className="opacity-60">(2)</span>
        </span>
        <span className="ml-auto shrink-0 rounded-sm bg-selected px-1.5 py-px text-body-xs text-default">
          {SOON_LABEL}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 overflow-y-auto rounded-sm border border-default p-2.5 text-body-xs">
        <p lang="en">{SUGGESTION.source}</p>
        <p lang="vi">{SUGGESTION.target}</p>
        <span className="flex items-center gap-2">
          <Button disabled>Chèn</Button>
          <span className="text-body-xs text-success">{SUGGESTION.match}</span>
        </span>
      </div>
    </div>
  )
}
