import { useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { ArrowUpIcon } from '@solar-icons/react/linear/arrow-up'
import { DocumentTextIcon } from '@solar-icons/react/linear/document-text'
import { NotebookIcon } from '@solar-icons/react/linear/notebook'
import { cx } from '../../components/cx'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import {
  CHAT_BLOCK_TEXT_MAX,
  type ChatContextBlock,
  type ChatMode
} from '../../../../shared/contracts/aiChat'
import { ModelSelectionMenu } from '../models/ModelSelectionMenu'
import type { AiChatController, ChatSendSnapshot } from './useAiChat'

/**
 * The box the translator types in: where a write would land, the question, and — on the same row as
 * the send button — which model.
 *
 * Sending writes. Enter and the main button both make a proposal that is shown in the translation
 * pane, so the answer lands where the translator is working instead of coming back as a paragraph in
 * the chat; the menu next to it is the way out (answer in the chat only, or apply straight in).
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
  snapshot
}: {
  chat: AiChatController
  /** What the current range covers, in words: the chip the translator reads before sending. */
  rangeLabel: string
  wholeChapter: boolean
  /** The chapter has no translation yet, so there is no narrower stretch to choose. */
  wholeChapterForced: boolean
  onWholeChapterChange(whole: boolean): void
  snapshot: ChatSendSnapshot
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

  // The context is no longer shown before sending, so a cut cannot be taken as seen: it is stated
  // here and has to be agreed to, or the model answers from half a chapter while the box says nothing.
  const cutBlocks = useMemo(
    () => context.filter((block) => block.detail.includes('đã cắt')),
    [context]
  )
  const truncationKey = useMemo(
    () => cutBlocks.map((block) => block.label + '\0' + block.detail + '\0' + block.text).join('\0'),
    [cutBlocks]
  )
  const truncated = truncationKey !== ''
  const contextReady = !truncated || confirmedTruncationKey === truncationKey
  const ready = chat.canSend(draft, 'sua') && contextReady
  const canAnswer = chat.canSend(draft, 'hoi') && contextReady

  const submit = (action: ChatMode = 'sua'): void => {
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

        {truncated && (
          <label className="flex items-start gap-1 px-1 pb-1 text-ui-xs text-warning">
            <input
              type="checkbox"
              checked={contextReady}
              onChange={(event) =>
                setConfirmedTruncationKey(event.target.checked ? truncationKey : null)
              }
            />
            Chỉ gửi kèm {CHAT_BLOCK_TEXT_MAX.toLocaleString('vi')} ký tự đầu của{' '}
            {cutBlocks.map((block) => block.label.toLocaleLowerCase('vi')).join(' và ')}. Tôi đồng ý
            gửi như vậy.
          </label>
        )}

        <textarea
          ref={field}
          rows={1}
          value={draft}
          aria-label="Yêu cầu cho AI"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a line break. Never send mid-composition: an input method
            // holding uncommitted text would have it swallowed.
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            submit()
          }}
          className="max-h-40 min-h-6 w-full resize-none bg-transparent px-1.5 text-ui-sm leading-normal text-ink outline-none placeholder:text-ink-muted"
          placeholder="Nhờ AI viết lại đoạn đang sửa, hoặc cả chương…"
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
              aria-label="Viết vào bản dịch để duyệt"
              title={
                ready
                  ? 'Viết vào bản dịch: đề xuất hiện trong editor để duyệt (Enter)'
                  : 'Chưa viết được: cần yêu cầu và một đoạn đích. Mở menu bên cạnh để chỉ hỏi trong chat'
              }
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-control bg-primary px-2 text-ui-xs text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              Viết <ArrowUpIcon size={14} />
            </button>
            <MenuRoot>
              <MenuTrigger
                className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line-strong px-1.5 text-ui-xs text-ink-muted hover:bg-hover disabled:opacity-30"
                aria-label="Cách gửi khác"
                title="Cách gửi khác"
                disabled={!canAnswer}
              >
                <AltArrowDownIcon size={14} />
              </MenuTrigger>
              <MenuPopup align="end">
                <MenuItem onClick={() => submit('hoi')}>
                  <span>Chỉ hỏi trong chat</span>
                  <span className="text-ui-xs text-ink-muted">Không ghi vào bản dịch</span>
                </MenuItem>
                <MenuItem
                  disabled={!chat.canSend(draft, 'ap_dung') || !contextReady}
                  onClick={() => submit('ap_dung')}
                >
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
