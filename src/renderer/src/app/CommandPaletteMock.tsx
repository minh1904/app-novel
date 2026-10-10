import { useState, type JSX, type ReactNode } from 'react'
import { Book2Icon } from '@solar-icons/react/linear/book-2'
import { CommandIcon } from '@solar-icons/react/linear/command'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { Badge } from '../components/ui/Badge'
import { Dialog } from '../components/ui/Dialog'
import { ICON } from '../components/ui/icon'
import { Kbd, SearchInput } from '../components/ui/Input'
import { ListOption } from '../components/ui/ListOption'
import { SOON_LABEL } from '../lib/mockFeatures'

interface Result {
  icon: ReactNode
  text: string
  meta: ReactNode
}

const term = <Book2Icon size={ICON.sm} aria-hidden="true" />
const line = <DocumentTextIcon size={ICON.sm} aria-hidden="true" />
const command = <CommandIcon size={ICON.sm} aria-hidden="true" />

/** Fixed sample results for "hàn": what one search across the library would bring back. */
const GROUPS: { label: string; results: Result[] }[] = [
  {
    label: 'Thuật ngữ và nhân vật',
    results: [
      { icon: term, text: '韩立 → Hàn Lập', meta: 'Nhân vật · Phàm Nhân Tu Tiên' },
      { icon: term, text: '寒冰剑 → Hàn Băng Kiếm', meta: 'Vật phẩm · Tu tiên chung' }
    ]
  },
  {
    label: 'Trong bản dịch',
    results: [
      {
        icon: line,
        text: '…Hàn Lập trong lòng chấn động, thầm kêu không ổn…',
        meta: 'Phàm Nhân Tu Tiên · chương 1.198'
      },
      { icon: line, text: '…ánh mắt Hàn Lập lạnh dần…', meta: 'Phàm Nhân Tu Tiên · chương 1.201' }
    ]
  },
  {
    label: 'Lệnh',
    results: [
      { icon: command, text: 'Dịch tiếp chương chưa dịch kế tiếp', meta: <Kbd>Ctrl Enter</Kbd> },
      { icon: command, text: 'Tra Hán Việt cho chữ đang chọn', meta: <Kbd>Ctrl H</Kbd> }
    ]
  }
]

/**
 * Picture of the search and command palette (MOCK_FEATURES.commandPalette): one box over works,
 * chapters, terms, translated text and commands. It opens with Ctrl K and from the sidebar; the
 * results are fixed and choosing one does nothing.
 */
export function CommandPaletteMock({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange(open: boolean): void
}): JSX.Element {
  const [query, setQuery] = useState('hàn')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Tìm và lệnh"
      description="Tìm tác phẩm, chương, thuật ngữ, câu trong bản dịch hoặc gõ lệnh."
    >
      <div className="flex items-center gap-xs">
        <SearchInput
          label="Tìm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1"
        />
        <Badge color="accent">{SOON_LABEL}</Badge>
      </div>
      <div role="listbox" aria-label="Kết quả mẫu" className="flex flex-col">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col">
            <p className="m-0 px-xs pt-sm pb-2xs text-label-xs text-muted">{group.label}</p>
            {group.results.map((result, index) => (
              <ListOption key={result.text} selected={group === GROUPS[0] && index === 0} disabled>
                {result.icon}
                <span className="min-w-0 flex-1 truncate">{result.text}</span>
                <span className="shrink-0 text-body-xs text-muted">{result.meta}</span>
              </ListOption>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  )
}
