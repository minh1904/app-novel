import { useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { ArrowUpIcon } from '@solar-icons/react/linear/arrow-up'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { NotebookIcon } from '@solar-icons/react/linear/notebook'
import { cx } from '../../components/cx'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import type { ChatMode } from '../../../../shared/contracts/aiChat'
import type { ChatContextBlock } from '../../../../shared/contracts/aiChat'
import { ModelSelectionMenu } from '../models/ModelSelectionMenu'
import type { AiChatController, ChatSendSnapshot } from './useAiChat'

/**
 * The box the translator types in: what is going along as context, the question, and — on the same
 * row as the send button — which mode and which model.
 *
 * The scope chip is the one control here that protects something. Left alone a turn is about the
 * paragraph holding the caret; "cả chương" has to be picked, and picking it is visible the whole time
 * it is on. A panel that defaulted to the whole pane would turn "this line reads stiffly" into a
 * full-chapter rewrite (Q8).
 */

export function AiComposer({
  chat,
  rangeLabel,
  wholeChapter,
  wholeChapterForced,
  onWholeChapterChange,
  snapshot,
  automaticCount,
  onAddContext,
  onRemoveContext
}: {
  chat: AiChatController
  /** What the current range covers, in words: the chip the translator reads before sending. */
  rangeLabel: string
  wholeChapter: boolean
  /** The chapter has no translation yet, so there is no narrower stretch to choose. */
  wholeChapterForced: boolean
  onWholeChapterChange(whole: boolean): void
  snapshot: ChatSendSnapshot
  automaticCount: number
  onAddContext(): void
  onRemoveContext(index: number): void
}): JSX.Element {
  const [draft, setDraft] = useState('')
  const [confirmedTruncationKey, setConfirmedTruncationKey] = useState<string | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const context: ChatContextBlock[] = snapshot.context

  // Grows with the text up to max-h-40, then scrolls inside. Layout effect, not passive: measuring
  // after paint makes the box jump a frame behind what was typed.
  useLayoutEffect(() => {
    const node = field.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = node.scrollHeight + 'px'
  }, [draft])

  const truncationKey = useMemo(() => context.slice(0, automaticCount)
    .filter((block) => block.detail.includes('đã cắt'))
    .map((block) => block.label + '\0' + block.detail + '\0' + block.text).join('\0'),
  [context, automaticCount])
  const truncated = truncationKey !== ''
  const contextReady = !truncated || confirmedTruncationKey === truncationKey
  const ready = chat.canSend(draft) && contextReady

  const submit = (action: ChatMode = 'hoi'): void => {
    if (!chat.canSend(draft, action) || !contextReady) return
    const question = draft
    setDraft('')
    setConfirmedTruncationKey(null)
    void chat.send(question, action, snapshot)
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
          <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-control border border-line bg-canvas px-1.5 text-ui-xs text-ink-muted">
            <DocumentTextIcon size={12} className="shrink-0" />
            Đích nếu viết: {rangeLabel}
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
              'inline-flex h-[20px] shrink-0 cursor-pointer items-center gap-1 rounded-control border px-1.5 text-ui-xs',
              wholeChapter
                ? 'border-focus bg-selected text-ink'
                : 'border-dashed border-line-strong text-ink-muted hover:bg-hover hover:text-ink'
            )}
          >
            <NotebookIcon size={12} className="shrink-0" />
            Phạm vi cả chương
          </button>
        </div>

        <div className="px-1 pb-1 text-ui-xs text-ink-muted">
          <details>
            <summary className="cursor-pointer">Nguồn Mira gửi kèm · {context.length} khối (xem đúng nội dung)</summary>
            <ul className="mt-1 max-h-52 space-y-2 overflow-y-auto">
              {context.map((block, index) => <li key={block.label + String(index)} className="rounded-control border border-line bg-canvas p-2">
                <div className="flex items-center gap-1">
                  <strong className="text-ink">{block.label}</strong>
                  {index >= automaticCount && <button type="button" className="ml-auto text-error underline"
                    onClick={() => onRemoveContext(index - automaticCount)}>Bỏ nguồn</button>}
                </div>
                <p>{block.detail}</p>
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-ink">{block.text}</pre>
              </li>)}
            </ul>
          </details>
          <button type="button" className="mt-1 text-primary underline" onClick={onAddContext}>
            + Thêm nguồn từ chương khác
          </button>
          {truncated && <label className="mt-1 flex items-start gap-1 text-warning">
            <input type="checkbox" checked={contextReady}
              onChange={(event) => setConfirmedTruncationKey(event.target.checked ? truncationKey : null)} />
            Tôi đã xem phần ngữ cảnh bị cắt và đồng ý gửi phần hiển thị.
          </label>}
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
          className="max-h-40 min-h-6 w-full resize-none bg-transparent px-1.5 text-ui-sm leading-normal text-ink outline-none placeholder:text-ink-muted"
          placeholder="Hỏi về đoạn đang sửa, hoặc cả chương…"
        />

        <div className="flex items-center gap-0.5 pt-1">
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
              aria-label="Gửi để trò chuyện"
              title={ready ? 'Gửi để trò chuyện (Enter)' : 'Chưa gửi được'}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-control bg-primary px-2 text-ui-xs text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              Gửi <ArrowUpIcon size={14} />
            </button>
            <MenuRoot>
              <MenuTrigger
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-control border border-line-strong px-2 text-ui-xs text-ink-muted hover:bg-hover disabled:opacity-30"
                aria-label="Gửi thành đề xuất hoặc áp dụng thẳng"
                title="Viết vào bản dịch"
                disabled={!chat.canSend(draft, 'sua') || !contextReady}
              >
                Viết <AltArrowDownIcon size={14} />
              </MenuTrigger>
              <MenuPopup align="end">
                <MenuItem onClick={() => submit('sua')}>
                  <span>Tạo đề xuất</span>
                  <span className="text-ui-xs text-ink-muted">Duyệt trước khi ghi</span>
                </MenuItem>
                <MenuItem onClick={() => submit('ap_dung')}>
                  <span>Áp dụng thẳng</span>
                  <span className="text-ui-xs text-ink-muted">Ghi nếu còn an toàn</span>
                </MenuItem>
              </MenuPopup>
            </MenuRoot>
          </span>
        </div>
      </form>
    </div>
  )
}
