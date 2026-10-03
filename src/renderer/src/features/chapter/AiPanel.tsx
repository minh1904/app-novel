import { useMemo, useState, type JSX } from 'react'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { PenNewRoundIcon } from '@solar-icons/react/linear/pen-new-round'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import type { SourceLanguage } from '../../../../shared/contracts/library'
import { Button } from '../../components/Button'
import type { TargetRange } from '../editor/chatRange'
import { AiComposer } from './AiComposer'
import { AiTurn } from './AiTurn'
import { rangeLabel, type ContextScope } from './chatContext'
import { useAiChat, type ChatEditor } from './useAiChat'

/**
 * Asking AI about the stretch being worked on. A real third column next to the two panes (it never
 * covers the text), built from wireframe `man=hoi-ai&v=a`: the conversation scrolls, the composer
 * stays at the bottom and carries the context chip, the mode and the model next to the send button.
 *
 * The panel calls a real connection and can write a proposal into the translation, but only through
 * a diff the translator accepted, and only as one undoable step. Everything it says it sent is what
 * it sent.
 */
const MIN_WIDTH = 320
const MAX_WIDTH = 720

export function AiPanel({
  workId,
  chapterId,
  chapterLabel,
  sourceLang,
  source,
  target,
  autoRange,
  reviewsEnded,
  width,
  onWidthChange,
  onClose,
  onOpenSettings
}: {
  /** Which work and chapter the turn is about; the read-only tools stay inside this work. */
  workId: string
  chapterId: string
  /** Which chapter the panel sits in, e.g. "Chương 12". */
  chapterLabel: string
  sourceLang: SourceLanguage
  /** The source pane, read live so context matches what is on screen. */
  source: { getText(): string }
  /** The translation pane: context comes from it, and an applied proposal goes into it. */
  target: ChatEditor | null
  /** The stretch the caret is in, following it as it moves. */
  autoRange: TargetRange | null
  /** How many reviews the pane has finished; rises when the last chunk is accepted or rejected. */
  reviewsEnded: number
  /** Current panel width in px; the parent grid's third column follows it. */
  width: number
  onWidthChange(width: number): void
  onClose(): void
  onOpenSettings(): void
}): JSX.Element {
  const [pinnedWhole, setPinnedWhole] = useState(false)
  // Captured when a review starts, so the notice can retire itself once the pane reports it done.
  const [reviewStartedAt, setReviewStartedAt] = useState(0)
  const targetText = target?.getText() ?? ''

  /**
   * An untranslated chapter is about the chapter, whatever the caret is doing.
   *
   * Asking "which paragraph of the translation" when the translation is empty has no useful answer,
   * and the turn would go out carrying nothing — which is how "dịch chương này" once reached the
   * model with no source attached at all.
   */
  const emptyTranslation = targetText.trim() === ''
  const wholeChapter = pinnedWhole || emptyTranslation
  const scope: ContextScope = wholeChapter ? 'chapter' : 'range'

  // Asking about the whole chapter is a request, so the range is read on demand rather than tracked:
  // nothing should be quietly holding a chapter-wide range while the caret sits in one paragraph.
  const range = useMemo(
    () => (wholeChapter ? (target?.targetRange('chapter') ?? null) : autoRange),
    [wholeChapter, target, autoRange]
  )

  const chat = useAiChat({
    workId,
    chapterId,
    sourceLang,
    source,
    target,
    range,
    scope,
    // Nothing to ask *about* in a blank pane; the job there is to produce a translation, and Sửa is
    // the mode whose answer can land in the pane. Switching modes by hand overrides this for good.
    defaultMode: emptyTranslation ? 'sua' : 'hoi'
  })

  return (
    <section aria-label="Hỏi AI" className="relative flex h-full min-h-0 flex-col bg-sidebar">
      {/* Drag handle for the panel width: the pane is to the right, so dragging left widens it. */}
      <span
        role="separator"
        aria-orientation="vertical"
        title="Kéo để đổi bề rộng"
        className="absolute top-0 left-0 z-10 flex h-full w-1.5 cursor-col-resize touch-none items-center justify-center hover:bg-focus/30"
        onPointerDown={(event) => {
          event.preventDefault()
          const pointerId = event.pointerId
          const target = event.currentTarget
          target.setPointerCapture(pointerId)
          const startX = event.clientX
          const startWidth = width

          const onMove = (moveEvent: PointerEvent): void => {
            const next = startWidth + (startX - moveEvent.clientX)
            onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
          }
          const onUp = (): void => {
            target.releasePointerCapture(pointerId)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
          }
          window.addEventListener('pointermove', onMove)
          window.addEventListener('pointerup', onUp)
        }}
      >
        <span aria-hidden="true" className="h-6 w-px bg-line-strong" />
      </span>

      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-line px-3">
        <StarsIcon size={16} className="shrink-0 text-info" />
        <h3 className="text-[12px] font-semibold">Hỏi AI</h3>
        <span className="min-w-0 truncate text-[11px] text-ink-muted">
          {chapterLabel} · {rangeLabel(range, targetText, scope)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Hội thoại mới"
            title="Hội thoại mới"
            disabled={chat.session.turns.length === 0}
            onClick={chat.newConversation}
          >
            <PenNewRoundIcon size={14} />
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            onClick={onClose}
          >
            <CloseIcon size={15} />
          </Button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {chat.loadError !== null && (
          <p className="rounded-control border border-error/40 bg-error/5 px-2 py-1.5 text-[12px] leading-[1.5]">
            Không đọc được danh sách kết nối: {chat.loadError}
          </p>
        )}

        {chat.loadError === null && chat.usable.length === 0 && (
          <div className="flex flex-col items-start gap-2 rounded-panel border border-line bg-canvas p-3">
            <p className="text-[12px] leading-[1.6] text-ink-muted">
              Chưa có kết nối AI nào đang bật, nên chưa gửi được câu hỏi nào. Khai một kết nối và dán
              khóa trong Cài đặt, rồi quay lại đây.
            </p>
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <SettingsIcon size={14} />
              Mở Cài đặt
            </Button>
          </div>
        )}

        {chat.session.dropped > 0 && (
          <p className="text-[11px] leading-[1.5] text-ink-muted">
            Hội thoại đã dài: {chat.session.dropped} lượt cũ nhất không được gửi kèm lượt vừa rồi.
          </p>
        )}

        {chat.session.turns.map((turn) => (
          <AiTurn
            key={turn.localId}
            turn={turn}
            onCancel={chat.cancel}
            onRetry={(question) => void chat.send(question)}
            onApply={(applied, replacement) => {
              if (applied.range === null) return
              setReviewStartedAt(reviewsEnded)
              chat.apply(applied.range, replacement)
            }}
          />
        ))}

        {chat.applyState.kind === 'stale' && (
          <div className="flex flex-col items-start gap-1.5 rounded-panel border border-error/40 bg-error/5 p-2">
            <p className="text-[12px] leading-[1.5] text-ink">
              Chưa áp dụng: đoạn đó đã đổi kể từ lúc hỏi. Xem lại bản dịch rồi hỏi lại cho đúng đoạn
              hiện tại.
            </p>
            <Button variant="ghost-muted" size="sm" onClick={chat.dismissApplyState}>
              Đã hiểu
            </Button>
          </div>
        )}

        {chat.applyState.kind === 'applied' && (
          <p className="text-[11px] leading-[1.5] text-ink-muted">
            Đã áp dụng vào bản dịch. Ctrl+Z trong pane bản dịch để hoàn tác.
          </p>
        )}

        {chat.applyState.kind === 'reviewing' && reviewsEnded === reviewStartedAt && (
          <div className="flex flex-col items-start gap-1.5 rounded-panel border border-line-strong p-2">
            <p className="text-[12px] leading-[1.5] text-ink">
              Thay đổi đang nằm trong pane bản dịch. Nhận hoặc bỏ <strong>từng chỗ</strong> bằng nút
              ngay cạnh đoạn đó; Ctrl+Z hoàn tác cả lượt.
            </p>
            <Button variant="ghost-muted" size="sm" onClick={chat.endReview}>
              Thôi, bỏ phần chưa duyệt
            </Button>
          </div>
        )}
      </div>

      <p className="shrink-0 px-3 text-[11px] leading-[1.5] text-ink-muted">
        Hội thoại chỉ sống trong phiên này: đóng panel là mất.
      </p>

      <AiComposer
        chat={chat}
        rangeLabel={rangeLabel(range, targetText, scope)}
        wholeChapter={wholeChapter}
        wholeChapterForced={emptyTranslation}
        onWholeChapterChange={setPinnedWhole}
      />
    </section>
  )
}
