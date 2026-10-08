import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { ChatLocation } from '../../../../../shared/contracts/aiChat'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { PenNewRoundIcon } from '@solar-icons/react/linear/pen-new-round'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import type { SourceLanguage } from '../../../../../shared/contracts/library'
import type { ChapterItem } from '../../../../../shared/contracts/chapters'
import type { ProposalQueueItem } from '../../../../../shared/contracts/aiProposals'
import { Button, LinkButton } from '../../../components/ui/Button'
import { ButtonGroup, type ButtonGroupOption } from '../../../components/ui/ButtonGroup'
import { CompactButton } from '../../../components/ui/CompactButton'
import { Disclosure } from '../../../components/ui/Disclosure'
import { ICON } from '../../../components/ui/icon'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../../components/ui/DropdownMenu'
import { AiComposer } from './AiComposer'
import { AiTurn } from './AiTurn'
import { buildLocation, type PaneCaret } from './chatLocation'
import { ProposalCard, type ProposalActions } from './ProposalCard'
import { isOpenPart } from './proposalStatus'
import { useAiChat, type ChatEditor } from './useAiChat'
import { useUiStore } from '../../../stores/uiStore'
import { useConnectionStore } from '../../../stores/connectionStore'

/**
 * Asking AI about the chapter. A real third column next to the two panes (it never covers the text):
 * the conversation scrolls and the composer stays at the bottom with the model next to the send button.
 *
 * The model reads the work with tools and proposes changes with tools (change `agentic-chat`); every
 * proposal waits here, under the turn that made it and in the chapter's queue, until the translator
 * accepts it, and an accepted one is one undoable step.
 */
const MIN_WIDTH = 320
type QueueFilter = 'all' | 'session'
const QUEUE_FILTERS: ReadonlyArray<ButtonGroupOption<QueueFilter>> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'session', label: 'Phiên này' }
]
const MAX_WIDTH = 720

export function AiPanel({
  workId,
  chapterId,
  chapterLabel,
  sourceLang,
  source,
  target,
  sourceCaret,
  targetCaret,
  activeSide,
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
  /** The source pane, read live so the position matches what is on screen. */
  source: { getText(): string; isDirty(): boolean }
  /** The translation pane: an accepted proposal is shown and reloaded there. */
  target: ChatEditor | null
  /** The caret or selection of each pane, following it as it moves. */
  sourceCaret: PaneCaret | null
  targetCaret: PaneCaret | null
  /** The pane touched last, whose selection counts. */
  activeSide: 'source' | 'target'
  /** Current panel width in px; the parent grid's third column follows it. */
  width: number
  onWidthChange(width: number): void
  onClose(): void
  onOpenSettings(): void
}): JSX.Element {
  const [queueOpen, setQueueOpen] = useState(false)
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [queue, setQueue] = useState<ProposalQueueItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [queueNotice, setQueueNotice] = useState<string | null>(null)
  const [chapterChoices, setChapterChoices] = useState<ChapterItem[]>([])
  const targetText = target?.getText() ?? ''
  const sourceTextNow = source.getText()

  useEffect(() => {
    let active = true
    void window.mira.chapters.list(workId).then((result) => {
      if (active && result.ok) setChapterChoices(result.value.chapters)
    })
    return () => {
      active = false
    }
  }, [workId])

  // Where the user is, in the paragraph numbers the tools use. Read when a turn is sent and shown in the
  // header, so "đoạn này" means what the header says.
  const location = useMemo<ChatLocation>(
    () =>
      buildLocation({
        sourceText: sourceTextNow,
        targetText,
        source: sourceCaret,
        target: targetCaret,
        active: activeSide
      }),
    [sourceTextNow, targetText, sourceCaret, targetCaret, activeSide]
  )
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  const chat = useAiChat({
    workId,
    chapterId,
    sourceLang,
    location: () => locationRef.current
  })

  // The first fallback of Settings that is not the model in use: what "Thử bằng …" on a failed turn offers.
  const fallbacks = useConnectionStore((state) => state.preferences?.fallbacks)
  const retryTarget = ((): {
    selection: { connectionId: string; entryId: string }
    label: string
  } | null => {
    for (const ref of fallbacks ?? []) {
      if (ref.entryId === chat.selection?.entryId) continue
      const connection = chat.usable.find((item) => item.id === ref.connectionId)
      const entry = connection?.models.find((item) => item.id === ref.entryId)
      if (connection && entry) {
        return { selection: ref, label: connection.name + ' · ' + entry.name }
      }
    }
    return null
  })()

  const reloadQueue = useCallback(async () => {
    const [listed, counts] = await Promise.all([
      window.mira.ai.proposals.listChapter(workId, chapterId),
      window.mira.ai.proposals.pendingCounts(workId)
    ])
    if (listed.ok) {
      setQueue(listed.value.proposals)
      setUndoAvailable(listed.value.undoAvailable)
    }
    if (counts.ok)
      setPendingCount(counts.value.counts.find((item) => item.chapterId === chapterId)?.count ?? 0)
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
      if (counts.ok)
        setPendingCount(
          counts.value.counts.find((item) => item.chapterId === chapterId)?.count ?? 0
        )
    })
    return () => {
      cancelled = true
    }
  }, [workId, chapterId])

  useEffect(() => {
    const refresh = (): void => {
      void reloadQueue()
    }
    window.addEventListener('mira:proposals-changed', refresh)
    return () => window.removeEventListener('mira:proposals-changed', refresh)
  }, [reloadQueue])

  // After a decision here, everything that counts pending proposals reloads: this queue, the status bar
  // and the chapter list all listen for the same event.
  const announce = (): void => {
    window.dispatchEvent(new Event('mira:proposals-changed'))
  }

  const acceptParts = async (partIds: string[]): Promise<void> => {
    if (target?.isDirty() || source.isDirty()) {
      setQueueNotice('Hãy đợi chữ đang sửa được lưu trước khi duyệt.')
      return
    }
    let applied = 0
    for (const partId of partIds) {
      const result = await window.mira.ai.proposals.accept({
        workId,
        chapterId,
        partId,
        commandId: crypto.randomUUID()
      })
      if (!result.ok) {
        setQueueNotice(result.error.message)
        break
      }
      if (result.value.accepted.includes(partId)) applied++
    }
    if (applied > 0) {
      setQueueNotice(
        applied === partIds.length
          ? 'Đã áp dụng vào bản dịch.'
          : 'Đã áp dụng một phần; phần còn lại cần xem lại.'
      )
      target?.endReview()
      if (target && !target.isDirty()) await target.reload()
    } else if (partIds.length > 0)
      setQueueNotice('Phần này cần xem lại vì bản dịch hoặc nguồn đã đổi.')
    announce()
  }
  const acceptPart = (partId: string): Promise<void> => acceptParts([partId])

  const denyPart = async (partId: string): Promise<void> => {
    const result = await window.mira.ai.proposals.deny(workId, chapterId, partId)
    if (!result.ok) setQueueNotice(result.error.message)
    else {
      setQueueNotice('Đã bỏ phần đề xuất.')
      target?.endReview()
    }
    announce()
  }

  const showInEditor = (part: ProposalQueueItem['parts'][number]): void => {
    if (!target || part.baseFrom === null || part.baseTo === null) return
    const result = target.reviewProposal(
      {
        from: part.baseFrom,
        to: part.baseTo,
        text: part.beforeText,
        targetIds: []
      },
      part.afterText,
      () => {
        void acceptPart(part.id)
      },
      () => {
        void denyPart(part.id)
      },
      part.sourceOrder === null ? 'Đề xuất AI' : `Đề xuất đoạn ${part.sourceOrder + 1}`
    )
    if (result === 'stale') setQueueNotice('Vùng đích đã đổi; hãy xem lại đề xuất trong hàng chờ.')
    else setQueueNotice(null)
  }

  const actions: ProposalActions = {
    accept: (partIds) => void acceptParts(partIds),
    deny: (partIds) => {
      void (async () => {
        for (const partId of partIds) await denyPart(partId)
      })()
    },
    show: showInEditor
  }
  const queueItem = (proposalId: string): ProposalQueueItem | undefined =>
    queue.find((proposal) => proposal.id === proposalId)

  const acceptAll = async (): Promise<void> => {
    if (target?.isDirty() || source.isDirty()) {
      setQueueNotice('Hãy đợi chữ đang sửa được lưu trước khi duyệt.')
      return
    }
    const result = await window.mira.ai.proposals.acceptAll(workId, chapterId, crypto.randomUUID())
    if (!result.ok) setQueueNotice(result.error.message)
    else {
      setQueueNotice(
        `Đã nhận ${result.value.accepted.length} phần; ${result.value.skipped.length} phần cần xem lại.`
      )
      if (target && !target.isDirty() && result.value.accepted.length > 0) await target.reload()
    }
    announce()
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
    announce()
  }

  return (
    <section aria-label="Hỏi AI" className="relative flex h-full min-h-0 flex-col bg-subtle">
      {/* Drag handle for the panel width: the pane is to the right, so dragging left widens it. */}
      <span
        role="separator"
        aria-orientation="vertical"
        title="Kéo để đổi bề rộng"
        className="absolute top-0 left-0 z-(--mira-z-sticky) flex h-full w-1.5 cursor-col-resize touch-none items-center justify-center hover:bg-focus/30"
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

      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-default px-3">
        <StarsIcon size={16} className="shrink-0 text-info" />
        <h3 className="text-body-xs font-semibold">Hỏi AI</h3>
        <span className="min-w-0 truncate text-body-xs text-subtle">{chapterLabel}</span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {chat.sessions.length > 0 && (
            <MenuRoot>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    aria-label="Mở lịch sử hội thoại"
                    rightIcon={<AltArrowDownIcon size={ICON.sm} aria-hidden="true" />}
                  >
                    Lịch sử
                  </Button>
                }
              />
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
          <CompactButton
            aria-label="Hội thoại mới"
            title="Hội thoại mới"
            disabled={chat.session.turns.length === 0}
            onClick={chat.newConversation}
            icon={<PenNewRoundIcon size={16} />}
          />
          <CompactButton
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            onClick={onClose}
            icon={<CloseIcon size={16} />}
          />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {pendingCount > 0 && (
          <div className="rounded-lg border border-strong bg-surface p-2">
            <Disclosure
              label={`Đề xuất chờ · ${chapterLabel} (${pendingCount})`}
              open={queueOpen}
              onOpenChange={setQueueOpen}
              className="font-medium text-default"
              trailing={
                queueOpen && (
                  <ButtonGroup
                    label="Lọc đề xuất"
                    value={queueFilter}
                    options={QUEUE_FILTERS}
                    onChange={(value) => setQueueFilter(value)}
                  />
                )
              }
            >
              <div className="mt-2 space-y-2">
                <Button variant="solid" onClick={() => void acceptAll()}>
                  Áp dụng tất cả {pendingCount} phần của {chapterLabel}
                </Button>
                {(() => {
                  const filteredQueue =
                    queueFilter === 'session'
                      ? queue.filter((proposal) => proposal.sessionId === chat.sessionId)
                      : queue
                  const parts = filteredQueue.flatMap((proposal) =>
                    proposal.parts.filter(isOpenPart).map((part) => ({ proposal, part }))
                  )
                  if (parts.length === 0) {
                    return (
                      <p className="text-body-xs text-subtle">
                        Không có đề xuất nào thuộc phiên này.
                      </p>
                    )
                  }
                  return parts.map(({ proposal, part }) => (
                    <ProposalCard
                      key={part.id}
                      title={proposal.origin === 'chat' ? 'Chat' : 'Dịch chương'}
                      status={part.status}
                      before={part.beforeText}
                      after={part.afterText}
                      onShow={
                        part.baseFrom !== null && part.baseTo !== null
                          ? () => showInEditor(part)
                          : undefined
                      }
                      onAccept={isOpenPart(part) ? () => void acceptPart(part.id) : undefined}
                      acceptDisabled={part.status === 'needs-placement'}
                      onDeny={isOpenPart(part) ? () => void denyPart(part.id) : undefined}
                    />
                  ))
                })()}
              </div>
            </Disclosure>
          </div>
        )}
        {queueNotice && (
          <p role="status" className="text-body-xs text-subtle">
            {queueNotice}
          </p>
        )}
        {undoAvailable && (
          <Button variant="ghost" className="self-start" onClick={() => void undo()}>
            Hoàn tác lượt duyệt gần nhất
          </Button>
        )}
        {chat.loadError !== null && (
          <p className="rounded-sm border border-error/40 bg-error/5 px-2 py-1.5 text-body-xs leading-normal">
            Không đọc được danh sách kết nối: {chat.loadError}
          </p>
        )}

        {chat.modelNotice !== null && (
          <p
            role="alert"
            className="flex items-start justify-between gap-2 rounded-sm border border-error/40 bg-error/5 px-2 py-1.5 text-body-xs leading-normal"
          >
            <span className="min-w-0 break-words">
              Không đổi được mức suy luận: {chat.modelNotice}
            </span>
            <LinkButton color="neutral" className="shrink-0" onClick={chat.dismissModelNotice}>
              Đóng
            </LinkButton>
          </p>
        )}

        {chat.loadError === null && chat.usable.length === 0 && (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-default bg-surface p-3">
            <p className="text-body-xs leading-normal text-subtle">
              Chưa có kết nối AI nào đang bật, nên chưa gửi được câu hỏi nào. Khai một kết nối và
              dán khóa trong Cài đặt, rồi quay lại đây.
            </p>
            <Button
              onClick={onOpenSettings}
              leftIcon={<SettingsIcon size={ICON.sm} aria-hidden="true" />}
            >
              Mở Cài đặt
            </Button>
          </div>
        )}

        {chat.session.dropped > 0 && (
          <p className="text-body-xs leading-normal text-subtle">
            Hội thoại đã dài: {chat.session.dropped} lượt cũ nhất không được gửi kèm lượt vừa rồi.
          </p>
        )}

        {chat.session.turns.map((turn) => {
          const isOtherChapter = Boolean(turn.chapterId && turn.chapterId !== chapterId)
          const other = isOtherChapter
            ? chapterChoices.find((c) => c.id === turn.chapterId)
            : undefined
          return (
            <AiTurn
              key={turn.localId}
              turn={turn}
              workId={workId}
              currentChapterId={chapterId}
              chapterLabel={other ? `Chương ${other.number}` : undefined}
              targetChapterExists={!isOtherChapter || other !== undefined}
              queueItem={queueItem}
              actions={actions}
              onRetry={(question) => void chat.send(question)}
              retryWith={
                turn.status === 'error' && retryTarget
                  ? {
                      label: retryTarget.label,
                      onClick: () => {
                        chat.selectModel(retryTarget.selection)
                        void chat.send(turn.question)
                      }
                    }
                  : undefined
              }
              onNavigateChapter={(targetId) => {
                void useUiStore
                  .getState()
                  .navigate({ name: 'chapter', workId, chapterId: targetId })
              }}
            />
          )
        })}
      </div>

      <AiComposer chat={chat} />
    </section>
  )
}
