import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { PenNewRoundIcon } from '@solar-icons/react/linear/pen-new-round'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import type { SourceLanguage } from '../../../../shared/contracts/library'
import { CHAT_BLOCK_TEXT_MAX, type ChatContextBlock } from '../../../../shared/contracts/aiChat'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { ProposalQueueItem } from '../../../../shared/contracts/aiProposals'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { Dialog } from '../../components/Dialog'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import type { TargetRange } from '../editor/chatRange'
import { AiComposer } from './AiComposer'
import { AiTurn } from './AiTurn'
import { buildChatContext, rangeLabel, type ContextScope } from './chatContext'
import { addedChapterContext, type AddedChapterContext } from './chatContextSelection'
import { useAiChat, type ChatEditor } from './useAiChat'
import { useUiStore } from '../../stores/uiStore'

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

const partStatusLabel = {
  pending: 'Chờ duyệt', applied: 'Đã nhận', rejected: 'Đã bỏ',
  conflict: 'Xung đột', stale: 'Nguồn đã đổi', 'needs-placement': 'Cần đặt vị trí'
} as const

export function AiPanel({
  workId,
  chapterId,
  chapterLabel,
  sourceLang,
  source,
  target,
  autoRange,
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
  source: { getText(): string; isDirty(): boolean }
  /** The translation pane: context comes from it, and an applied proposal goes into it. */
  target: ChatEditor | null
  /** The stretch the caret is in, following it as it moves. */
  autoRange: TargetRange | null
  /** Current panel width in px; the parent grid's third column follows it. */
  width: number
  onWidthChange(width: number): void
  onClose(): void
  onOpenSettings(): void
}): JSX.Element {
  const [pinnedWhole, setPinnedWhole] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [queueFilter, setQueueFilter] = useState<'all' | 'session'>('all')
  const [queue, setQueue] = useState<ProposalQueueItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [queueNotice, setQueueNotice] = useState<string | null>(null)
  const [chapterChoices, setChapterChoices] = useState<ChapterItem[]>([])
  const [contextPickerOpen, setContextPickerOpen] = useState(false)
  const [contextQuery, setContextQuery] = useState('')
  const [contextNotice, setContextNotice] = useState<string | null>(null)
  const [extraContext, setExtraContext] = useState<Array<{ key: string; block: ChatContextBlock }>>([])
  const [pendingContext, setPendingContext] = useState<AddedChapterContext | null>(null)
  const targetText = target?.getText() ?? ''
  const sourceTextNow = source.getText()

  useEffect(() => {
    let active = true
    void window.mira.chapters.list(workId).then((result) => {
      if (active && result.ok) setChapterChoices(result.value.chapters)
    })
    return () => { active = false }
  }, [workId])

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

  const automaticContext = useMemo(() => buildChatContext({
    sourceText: sourceTextNow, targetText, range, scope, radius: 2
  }), [sourceTextNow, targetText, range, scope])
  const context = useMemo(() => [
    ...automaticContext, ...extraContext.map((item) => item.block)
  ], [automaticContext, extraContext])
  const sendSnapshot = useMemo(() => ({
    sourceText: sourceTextNow, targetText, range, context
  }), [sourceTextNow, targetText, range, context])

  const addChapterContext = async (chapter: ChapterItem, side: 'source' | 'target'): Promise<void> => {
    if (extraContext.length >= 4) {
      setContextNotice('Mỗi lượt thêm tối đa bốn nguồn từ chương khác. Bỏ một nguồn trước khi thêm tiếp.')
      return
    }
    const key = chapter.id + ':' + side
    if (extraContext.some((item) => item.key === key)) {
      setContextNotice('Nguồn này đã được thêm.')
      return
    }
    const response = await window.mira.text.get(workId, chapter.id, side)
    if (!response.ok) { setContextNotice(response.error.message); return }
    if (!response.value.content.trim()) { setContextNotice('Chương này chưa có nội dung ở bên đã chọn.'); return }
    const added = addedChapterContext(chapter, side, response.value.content)
    if (added.truncated) { setPendingContext(added); return }
    setExtraContext((items) => [...items, { key: added.key, block: added.block }])
    setContextPickerOpen(false)
    setContextNotice(null)
  }

  const chat = useAiChat({
    workId,
    chapterId,
    sourceLang,
    source,
    target,
    range,
    scope,
    // The send action belongs to a turn, not to the chapter or the panel.
  })

  const reloadQueue = useCallback(async () => {
    const [listed, counts] = await Promise.all([
      window.mira.ai.proposals.listChapter(workId, chapterId),
      window.mira.ai.proposals.pendingCounts(workId)
    ])
    if (listed.ok) {
      setQueue(listed.value.proposals)
      setUndoAvailable(listed.value.undoAvailable)
    }
    if (counts.ok) setPendingCount(counts.value.counts.find((item) => item.chapterId === chapterId)?.count ?? 0)
  }, [workId, chapterId])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      window.mira.ai.proposals.listChapter(workId, chapterId),
      window.mira.ai.proposals.pendingCounts(workId)
    ]).then(([listed, counts]) => {
      if (cancelled) return
      if (listed.ok) {
        setQueue(listed.value.proposals)
        setUndoAvailable(listed.value.undoAvailable)
      }
      if (counts.ok) setPendingCount(counts.value.counts.find((item) => item.chapterId === chapterId)?.count ?? 0)
    })
    return () => { cancelled = true }
  }, [workId, chapterId, chat.proposalVersion])

  useEffect(() => {
    const refresh = (): void => { void reloadQueue() }
    window.addEventListener('mira:proposals-changed', refresh)
    return () => window.removeEventListener('mira:proposals-changed', refresh)
  }, [reloadQueue])

  const acceptPart = async (partId: string): Promise<void> => {
    if (target?.isDirty() || source.isDirty()) {
      setQueueNotice('Hãy đợi chữ đang sửa được lưu trước khi duyệt.')
      return
    }
    const result = await window.mira.ai.proposals.accept({
      workId, chapterId, partId, commandId: crypto.randomUUID()
    })
    if (!result.ok) setQueueNotice(result.error.message)
    else if (result.value.accepted.includes(partId)) {
      setQueueNotice('Đã áp dụng một phần vào bản dịch.')
      target?.endReview()
      if (target && !target.isDirty()) await target.reload()
    } else setQueueNotice('Phần này cần xem lại vì bản dịch hoặc nguồn đã đổi.')
    await reloadQueue()
  }

  const denyPart = async (partId: string): Promise<void> => {
    const result = await window.mira.ai.proposals.deny(workId, chapterId, partId)
    if (!result.ok) setQueueNotice(result.error.message)
    else { setQueueNotice('Đã bỏ phần đề xuất.'); target?.endReview() }
    await reloadQueue()
  }

  const showInEditor = (part: ProposalQueueItem['parts'][number]): void => {
    if (!target || part.baseFrom === null || part.baseTo === null) return
    const result = target.reviewProposal({
      from: part.baseFrom, to: part.baseTo, text: part.beforeText, targetIds: []
    }, part.afterText, () => { void acceptPart(part.id) },
    () => { void denyPart(part.id) },
    part.sourceOrder === null ? 'Đề xuất AI' : `Đề xuất đoạn ${part.sourceOrder + 1}`)
    if (result === 'stale') setQueueNotice('Vùng đích đã đổi; hãy xem lại đề xuất trong hàng chờ.')
    else setQueueNotice(null)
  }

  const contextChapters = chapterChoices.filter((item) => item.id !== chapterId &&
    (item.title.toLocaleLowerCase('vi').includes(contextQuery.toLocaleLowerCase('vi')) ||
      String(item.number).includes(contextQuery.trim()))).slice(0, 50)

  const acceptAll = async (): Promise<void> => {
    if (target?.isDirty() || source.isDirty()) {
      setQueueNotice('Hãy đợi chữ đang sửa được lưu trước khi duyệt.')
      return
    }
    const result = await window.mira.ai.proposals.acceptAll(workId, chapterId, crypto.randomUUID())
    if (!result.ok) setQueueNotice(result.error.message)
    else {
      setQueueNotice(`Đã nhận ${result.value.accepted.length} phần; ${result.value.skipped.length} phần cần xem lại.`)
      if (target && !target.isDirty() && result.value.accepted.length > 0) await target.reload()
    }
    await reloadQueue()
  }

  const undo = async (): Promise<void> => {
    if (target?.isDirty()) {
      setQueueNotice('Hãy đợi bản dịch đang sửa được lưu trước khi hoàn tác.')
      return
    }
    const result = await window.mira.ai.proposals.undo(workId, chapterId)
    if (!result.ok) setQueueNotice(result.error.message)
    else {
      setQueueNotice('Đã hoàn tác lượt duyệt gần nhất.')
      if (target) await target.reload()
    }
    await reloadQueue()
  }

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
          {chat.sessions.length > 0 && (
            <MenuRoot>
              <MenuTrigger
                className="inline-flex h-7 items-center gap-1 rounded-control px-1.5 text-[11px] text-ink-muted hover:bg-selected"
                aria-label="Mở lịch sử hội thoại"
              >
                Lịch sử <AltArrowDownIcon size={12} />
              </MenuTrigger>
              <MenuPopup align="end">
                {chat.sessions.map((saved) => (
                  <MenuItem key={saved.id} onClick={() => chat.selectSession(saved.id)}>
                    <span className="max-w-52 truncate">{saved.title || 'Hội thoại'}</span>
                    {saved.id === chat.sessionId && <span aria-hidden="true">✓</span>}
                  </MenuItem>
                ))}
              </MenuPopup>
            </MenuRoot>
          )}
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Hội thoại mới"
            title="Hội thoại mới"
            disabled={chat.session.turns.length === 0}
            onClick={chat.newConversation}
          >
            <PenNewRoundIcon size={16} />
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </Button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {pendingCount > 0 && (
          <div className="rounded-panel border border-line-strong bg-canvas p-2">
            <div className="flex items-center justify-between">
              <button type="button" className="text-[12px] font-medium text-ink" aria-expanded={queueOpen}
                onClick={() => setQueueOpen((value) => !value)}>
                Đề xuất chờ · {chapterLabel} ({pendingCount}) {queueOpen ? '▴' : '▾'}
              </button>
              {queueOpen && (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    className={cx('rounded-control px-1.5 py-0.5', queueFilter === 'all' ? 'bg-control font-semibold text-ink' : 'text-ink-muted hover:text-ink')}
                    onClick={() => setQueueFilter('all')}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    className={cx('rounded-control px-1.5 py-0.5', queueFilter === 'session' ? 'bg-control font-semibold text-ink' : 'text-ink-muted hover:text-ink')}
                    onClick={() => setQueueFilter('session')}
                  >
                    Phiên này
                  </button>
                </div>
              )}
            </div>
            {queueOpen && (
              <div className="mt-2 space-y-2">
                <Button size="sm" onClick={() => void acceptAll()}>
                  Áp dụng tất cả {pendingCount} phần của {chapterLabel}
                </Button>
                {(() => {
                  const filteredQueue = queueFilter === 'session'
                    ? queue.filter((proposal) => proposal.sessionId === chat.sessionId)
                    : queue
                  const parts = filteredQueue.flatMap((proposal) => proposal.parts.filter((part) =>
                    ['pending', 'conflict', 'stale', 'needs-placement'].includes(part.status)
                  ).map((part) => ({ proposal, part })))
                  if (parts.length === 0) {
                    return <p className="text-[11px] text-ink-muted">Không có đề xuất nào thuộc phiên này.</p>
                  }
                  return parts.map(({ proposal, part }) => (
                    <details key={part.id} className="rounded-control border border-line p-2 text-[11px]">
                      <summary className="cursor-pointer text-ink">
                        {proposal.origin === 'chat' ? 'Chat' : 'Dịch chương'} · {partStatusLabel[part.status]}
                      </summary>
                      <p className="mt-2 text-ink-muted">Chữ trước</p>
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-ink">{part.beforeText}</pre>
                      <p className="mt-2 text-ink-muted">Bản đề xuất</p>
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-ink">{part.afterText}</pre>
                      <div className="mt-2 flex gap-1">
                        {part.baseFrom !== null && part.baseTo !== null &&
                          <Button size="sm" variant="outline" onClick={() => showInEditor(part)}>
                            Xem trong editor
                          </Button>}
                        <Button size="sm" disabled={part.status === 'needs-placement'} onClick={() => void acceptPart(part.id)}>Áp dụng</Button>
                        <Button size="sm" variant="outline" onClick={() => void denyPart(part.id)}>Bỏ</Button>
                      </div>
                    </details>
                  ))
                })()}
              </div>
            )}
          </div>
        )}
        {queueNotice && <p role="status" className="text-[11px] text-ink-muted">{queueNotice}</p>}
        {undoAvailable && (
          <Button variant="ghost-muted" size="sm" className="self-start" onClick={() => void undo()}>
            Hoàn tác lượt duyệt gần nhất
          </Button>
        )}
        {chat.loadError !== null && (
          <p className="rounded-control border border-error/40 bg-error/5 px-2 py-1.5 text-[12px] leading-[1.5]">
            Không đọc được danh sách kết nối: {chat.loadError}
          </p>
        )}

        {chat.modelNotice !== null && (
          <p
            role="alert"
            className="flex items-start justify-between gap-2 rounded-control border border-error/40 bg-error/5 px-2 py-1.5 text-[12px] leading-[1.5]"
          >
            <span className="min-w-0 break-words">
              Không đổi được mức suy luận: {chat.modelNotice}
            </span>
            <button
              type="button"
              className="shrink-0 cursor-pointer text-ink-muted underline hover:text-ink"
              onClick={chat.dismissModelNotice}
            >
              Đóng
            </button>
          </p>
        )}

        {chat.loadError === null && chat.usable.length === 0 && (
          <div className="flex flex-col items-start gap-2 rounded-panel border border-line bg-canvas p-3">
            <p className="text-[12px] leading-[1.6] text-ink-muted">
              Chưa có kết nối AI nào đang bật, nên chưa gửi được câu hỏi nào. Khai một kết nối và
              dán khóa trong Cài đặt, rồi quay lại đây.
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

        {chat.session.turns.map((turn) => {
          const isOtherChapter = Boolean(turn.chapterId && turn.chapterId !== chapterId)
          const other = isOtherChapter ? chapterChoices.find((c) => c.id === turn.chapterId) : undefined
          return (
            <AiTurn
              key={turn.localId}
              turn={turn}
              currentChapterId={chapterId}
              chapterLabel={other ? `Chương ${other.number}` : undefined}
              targetChapterExists={!isOtherChapter || other !== undefined}
              onCancel={chat.cancel}
              onRetry={(question) => void chat.send(question, turn.mode)}
              onApply={(applied) => void chat.apply(applied)}
              onNavigateChapter={(targetId) => {
                void useUiStore.getState().navigate({ name: 'chapter', workId, chapterId: targetId })
              }}
            />
          )
        })}

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

        {chat.applyState.kind === 'error' && (
          <p role="alert" className="rounded-panel border border-error/40 bg-error/5 p-2 text-[12px] text-ink">
            {chat.applyState.message}
          </p>
        )}

        {chat.applyState.kind === 'applied' && (
          <p className="text-[11px] leading-[1.5] text-ink-muted">
            Đã áp dụng vào bản dịch. Ctrl+Z trong pane bản dịch để hoàn tác.
          </p>
        )}

      </div>

      <p className="shrink-0 px-3 text-[11px] leading-[1.5] text-ink-muted">
        Hội thoại được lưu trong tác phẩm; đóng panel vẫn có thể mở lại từ Lịch sử.
      </p>

      <AiComposer
        chat={chat}
        snapshot={sendSnapshot}
        automaticCount={automaticContext.length}
        onAddContext={() => { setContextNotice(null); setContextPickerOpen(true) }}
        onRemoveContext={(index) => setExtraContext((items) => items.filter((_, at) => at !== index))}
        rangeLabel={rangeLabel(range, targetText, scope)}
        wholeChapter={wholeChapter}
        wholeChapterForced={emptyTranslation}
        onWholeChapterChange={setPinnedWhole}
      />
      <Dialog open={contextPickerOpen} onOpenChange={(open) => {
        setContextPickerOpen(open)
        if (!open) setPendingContext(null)
      }} title="Thêm nguồn cho AI đọc" description="Chọn bản gốc hoặc bản dịch của một chương khác. Nguồn này không đổi đích viết." size="wide">
        <div className="flex flex-col gap-3">
          <input type="search" value={contextQuery} aria-label="Tìm chương"
            onChange={(event) => setContextQuery(event.target.value)}
            placeholder="Tìm theo tên hoặc số chương"
            className="rounded-control border border-line bg-canvas px-3 py-2 text-[12px]" />
          {contextNotice && <p role="alert" className="text-[12px] text-error">{contextNotice}</p>}
          {pendingContext && <div className="rounded-control border border-warning/40 bg-warning/10 p-3 text-[12px]">
            <p>Nguồn có {pendingContext.length.toLocaleString('vi')} ký tự. Giới hạn gửi kèm là{' '}
              {CHAT_BLOCK_TEXT_MAX.toLocaleString('vi')} ký tự đầu; phần còn lại sẽ không được gửi.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => {
                setExtraContext((items) => [...items, { key: pendingContext.key, block: pendingContext.block }])
                setPendingContext(null)
                setContextPickerOpen(false)
              }}>Thêm phần đầu đã nêu</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingContext(null)}>Chọn nguồn khác</Button>
            </div>
          </div>}
          {!pendingContext && <div className="max-h-72 space-y-1 overflow-y-auto">
            {contextChapters.length === 0 && <p className="text-[12px] text-ink-muted">Không tìm thấy chương khác.</p>}
            {contextChapters.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-control border border-line p-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate">{item.title.trim() || 'Chương ' + item.number}</span>
              <Button size="sm" variant="outline" disabled={!item.hasSource}
                onClick={() => void addChapterContext(item, 'source')}>Bản gốc</Button>
              <Button size="sm" variant="outline" disabled={!item.hasTarget}
                onClick={() => void addChapterContext(item, 'target')}>Bản dịch</Button>
            </div>)}
          </div>}
        </div>
      </Dialog>
    </section>
  )
}
