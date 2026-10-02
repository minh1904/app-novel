import { useLayoutEffect, useRef, useState, type JSX } from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { ArrowUpIcon } from '@solar-icons/react/linear/arrow-up'
import { BookIcon } from '@solar-icons/react/linear/book'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { PaperclipIcon } from '@solar-icons/react/linear/paperclip'
import { UsersGroupRoundedIcon } from '@solar-icons/react/linear/users-group-rounded'
import { cx } from '../../components/cx'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import {
  AI_MODELS,
  AI_MODES,
  CONTEXT_CHIPS,
  DEFAULT_MODEL,
  type AiModeId,
  type ContextChip
} from './aiChatSample'

const CHIP_ICON: Record<ContextChip['kind'], typeof DocumentTextIcon> = {
  segment: DocumentTextIcon,
  glossary: BookIcon,
  honorifics: UsersGroupRoundedIcon
}

/**
 * Both pickers share one shape so the toolbar row reads as a single strip. This is the class string
 * for `MenuTrigger` itself (which already renders a button) rather than a wrapper component: Base
 * UI's `render` prop needs the element to forward every prop and the ref, and a plain wrapper does
 * not, so the menu would never open.
 */
const pickerClass =
  'inline-flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-control px-1.5 text-[11px] whitespace-nowrap text-ink-muted outline-none hover:bg-selected hover:text-ink data-popup-open:bg-selected data-popup-open:text-ink'

/**
 * The box the translator types in: what is being sent as context, the question, and — on the same
 * row as the send button — which mode and which model. Mode and model are local state only; nothing
 * is sent anywhere until there is a provider.
 */
export function AiComposer(): JSX.Element {
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<AiModeId>('hoi')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [chips, setChips] = useState(CONTEXT_CHIPS)
  const field = useRef<HTMLTextAreaElement>(null)

  // Grows with the text up to max-h-40, then scrolls inside. Layout effect, not passive: measuring
  // after paint makes the box jump a frame behind what was typed.
  useLayoutEffect(() => {
    const node = field.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = node.scrollHeight + 'px'
  }, [draft])

  const activeMode = AI_MODES.find((entry) => entry.id === mode) ?? AI_MODES[0]

  return (
    <div className="relative m-3 shrink-0">
      <form
        className="flex flex-col rounded-panel border border-line-strong bg-control p-1 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/25"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-wrap items-center gap-1 px-1 pb-1">
          {chips.map((chip) => {
            const Icon = CHIP_ICON[chip.kind]
            return (
              <span
                key={chip.label}
                className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-[6px] border border-line bg-canvas pr-1 pl-1.5 text-[11px] text-ink-muted"
              >
                <Icon size={12} className="shrink-0" />
                {chip.label}
                {chip.fixed ? (
                  <span className="w-px" />
                ) : (
                  <button
                    type="button"
                    aria-label={'Bỏ ' + chip.label}
                    className="cursor-pointer px-0.5 hover:text-ink"
                    onClick={() => setChips((rest) => rest.filter((it) => it.label !== chip.label))}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
          <button
            type="button"
            disabled
            title="Chưa nối ngữ cảnh thật"
            className="inline-flex h-[20px] shrink-0 cursor-pointer items-center gap-1 rounded-[6px] border border-dashed border-line-strong px-1.5 text-[11px] text-ink-muted hover:bg-selected hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AddIcon size={12} className="shrink-0" />
            Ngữ cảnh
          </button>
        </div>

        <textarea
          ref={field}
          rows={1}
          value={draft}
          aria-label="Câu hỏi cho AI"
          onChange={(event) => setDraft(event.target.value)}
          className="max-h-40 min-h-6 w-full resize-none bg-transparent px-1.5 text-[13px] leading-[1.6] text-ink outline-none placeholder:text-ink-muted"
          placeholder="Hỏi về câu đang chọn, hoặc cả đoạn…"
        />

        <div className="flex items-center gap-0.5 pt-1">
          <MenuRoot>
            <MenuTrigger
              className={pickerClass}
              title={'Chế độ — ' + activeMode.hint + ' (Shift+Tab đổi)'}
            >
              {activeMode.label}
              <AltArrowDownIcon size={12} className="shrink-0" />
            </MenuTrigger>
            <MenuPopup align="start">
              {AI_MODES.map((entry) => (
                <MenuItem key={entry.id} onClick={() => setMode(entry.id)}>
                  <CheckIcon
                    size={14}
                    className={cx('shrink-0', entry.id === mode ? 'text-ink' : 'opacity-0')}
                  />
                  <span className="flex-1">{entry.label}</span>
                  <span className="text-[11px] text-ink-muted">{entry.hint}</span>
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuRoot>

          <MenuRoot>
            <MenuTrigger className={pickerClass} title="Đổi model (Ctrl+/)">
              {model}
              <AltArrowDownIcon size={12} className="shrink-0" />
            </MenuTrigger>
            <MenuPopup align="start">
              <div className="w-[276px]">
                {AI_MODELS.map((group) => (
                  <div key={group.group}>
                    <p className="px-1.5 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                      {group.group}
                    </p>
                    {group.items.map((item) => (
                      <MenuItem key={item.name} onClick={() => setModel(item.name)}>
                        <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.name}</span>
                        {item.badge && (
                          <span className="shrink-0 rounded-[5px] bg-control px-1 text-[10px] text-ink-muted">
                            {item.badge}
                          </span>
                        )}
                        <span className="shrink-0 text-[11px] text-ink-muted">{item.meta}</span>
                        <CheckIcon
                          size={14}
                          className={cx('shrink-0', item.name === model ? 'text-ink' : 'opacity-0')}
                        />
                      </MenuItem>
                    ))}
                  </div>
                ))}
                <p className="mt-1 border-t border-line px-1.5 pt-1.5 pb-0.5 text-[10px] leading-[1.5] text-ink-muted">
                  USD / 1M token, số mẫu. Thêm khóa và endpoint trong Cài đặt.
                </p>
              </div>
            </MenuPopup>
          </MenuRoot>

          <span className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              disabled
              aria-label="Đính kèm ảnh"
              title="Chưa nối provider"
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-selected hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperclipIcon size={14} />
            </button>
            <button
              type="submit"
              disabled
              aria-label="Gửi"
              title="Chưa nối provider"
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-control bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUpIcon size={14} />
            </button>
          </span>
        </div>
      </form>
    </div>
  )
}
