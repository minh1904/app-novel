import { useLayoutEffect, useRef, useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { ArrowUpIcon } from '@solar-icons/react/linear/arrow-up'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { NotebookIcon } from '@solar-icons/react/linear/notebook'
import { cx } from '../../components/cx'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import { CHAT_MODES, type ChatMode } from '../../../../shared/contracts/aiChat'
import { ModelSelectionMenu } from '../models/ModelSelectionMenu'
import type { AiChatController } from './useAiChat'

/**
 * The box the translator types in: what is going along as context, the question, and — on the same
 * row as the send button — which mode and which model.
 *
 * The scope chip is the one control here that protects something. Left alone a turn is about the
 * paragraph holding the caret; "cả chương" has to be picked, and picking it is visible the whole time
 * it is on. A panel that defaulted to the whole pane would turn "this line reads stiffly" into a
 * full-chapter rewrite (Q8).
 */

const MODE_HINT: Record<ChatMode, string> = {
  hoi: 'Chỉ đọc, không sửa bản dịch',
  sua: 'Trả đề xuất có nút Áp dụng'
}

/**
 * Both pickers share one shape so the toolbar row reads as a single strip. This is the class string
 * for `MenuTrigger` itself (which already renders a button) rather than a wrapper component: Base
 * UI's `render` prop needs the element to forward every prop and the ref, and a plain wrapper does
 * not, so the menu would never open.
 */
const pickerClass =
  'inline-flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-control px-1.5 text-[11px] whitespace-nowrap text-ink-muted outline-none hover:bg-selected hover:text-ink data-popup-open:bg-selected data-popup-open:text-ink disabled:cursor-not-allowed disabled:opacity-50'

export function AiComposer({
  chat,
  rangeLabel,
  wholeChapter,
  wholeChapterForced,
  onWholeChapterChange
}: {
  chat: AiChatController
  /** What the current range covers, in words: the chip the translator reads before sending. */
  rangeLabel: string
  wholeChapter: boolean
  /** The chapter has no translation yet, so there is no narrower stretch to choose. */
  wholeChapterForced: boolean
  onWholeChapterChange(whole: boolean): void
}): JSX.Element {
  const [draft, setDraft] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)

  // Grows with the text up to max-h-40, then scrolls inside. Layout effect, not passive: measuring
  // after paint makes the box jump a frame behind what was typed.
  useLayoutEffect(() => {
    const node = field.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = node.scrollHeight + 'px'
  }, [draft])

  const ready = chat.canSend(draft)

  const submit = (): void => {
    if (!ready) return
    const question = draft
    setDraft('')
    void chat.send(question)
  }

  return (
    <div className="relative m-3 shrink-0">
      <form
        className="flex flex-col rounded-panel border border-line-strong bg-control p-1 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/25"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-wrap items-center gap-1 px-1 pb-1">
          <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-[6px] border border-line bg-canvas px-1.5 text-[11px] text-ink-muted">
            <DocumentTextIcon size={12} className="shrink-0" />
            {rangeLabel}
          </span>
          <button
            type="button"
            aria-pressed={wholeChapter}
            disabled={wholeChapterForced}
            title={
              wholeChapterForced
                ? 'Chương chưa có bản dịch nên mọi câu hỏi là về cả chương'
                : 'Hỏi về cả chương thay vì đoạn đang sửa'
            }
            onClick={() => onWholeChapterChange(!wholeChapter)}
            className={cx(
              'inline-flex h-[20px] shrink-0 cursor-pointer items-center gap-1 rounded-[6px] border px-1.5 text-[11px]',
              wholeChapter
                ? 'border-focus bg-selected text-ink'
                : 'border-dashed border-line-strong text-ink-muted hover:bg-selected hover:text-ink'
            )}
          >
            <NotebookIcon size={12} className="shrink-0" />
            Cả chương
          </button>
        </div>

        <textarea
          ref={field}
          rows={1}
          value={draft}
          aria-label="Câu hỏi cho AI"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a line break. Never send mid-composition: an input method
            // holding uncommitted text would have it swallowed.
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            submit()
          }}
          className="max-h-40 min-h-6 w-full resize-none bg-transparent px-1.5 text-[13px] leading-[1.6] text-ink outline-none placeholder:text-ink-muted"
          placeholder="Hỏi về đoạn đang sửa, hoặc cả chương…"
        />

        <div className="flex items-center gap-0.5 pt-1">
          <MenuRoot>
            <MenuTrigger className={pickerClass} title={'Chế độ — ' + MODE_HINT[chat.mode]}>
              {CHAT_MODES.includes(chat.mode) ? (chat.mode === 'sua' ? 'Sửa' : 'Hỏi') : 'Hỏi'}
              <AltArrowDownIcon size={12} className="shrink-0" />
            </MenuTrigger>
            <MenuPopup align="start">
              {CHAT_MODES.map((entry) => (
                <MenuItem key={entry} onClick={() => chat.setMode(entry)}>
                  <CheckIcon
                    size={14}
                    className={cx('shrink-0', entry === chat.mode ? 'text-ink' : 'opacity-0')}
                  />
                  <span className="flex-1">{entry === 'sua' ? 'Sửa' : 'Hỏi'}</span>
                  <span className="text-[11px] text-ink-muted">{MODE_HINT[entry]}</span>
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuRoot>

          <ModelSelectionMenu
            label="Model để hỏi"
            connections={chat.usable}
            selected={chat.selection}
            onSelect={chat.selectModel}
            onSelectThinking={(selection, choice) => void chat.setThinking(selection, choice)}
            onOpen={chat.refreshConnections}
          />

          <span className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="submit"
              disabled={!ready}
              aria-label="Gửi"
              title={ready ? 'Gửi (Enter)' : 'Chưa gửi được'}
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
