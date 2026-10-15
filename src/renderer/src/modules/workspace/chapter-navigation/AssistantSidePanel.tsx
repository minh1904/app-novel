import { useSyncExternalStore, type JSX, type ReactNode } from 'react'
import { CloseIcon } from '@renderer/components/ui/reicon'
import type { ResolvedTarget } from '../../../../../shared/contracts/agent'
import { CompactButton } from '../../../components/ui/CompactButton'
import { Drawer } from '../../../components/ui/Drawer'
import { ICON } from '../../../components/ui/icon'
import { TabsList, TabsPanel, TabsRoot, TabsTab } from '../../../components/ui/Tabs'
import { AgentPanel } from '@renderer/modules/agent/public'
import { AppliedContext } from '@renderer/modules/context/public'
import { openGlossaryReview } from '../work-detail/openGlossaryReview'
import { useWorkspaceStore } from '../store/workspaceStore'

export type SidePanelTab = 'assistant' | 'context' | 'legacy'

/** Cửa sổ hẹp hơn mức này thì panel thành drawer phủ từ bên phải (quyết định 7). */
const NARROW_QUERY = '(max-width: 960px)'

function subscribeNarrow(listener: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia(NARROW_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

const isNarrow = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(NARROW_QUERY).matches

export function useNarrowWindow(): boolean {
  return useSyncExternalStore(subscribeNarrow, isNarrow, () => false)
}

/** Mở đích của một thao tác: chương thì vào chương, tác phẩm thì vào trang tác phẩm. */
function openTarget(target: ResolvedTarget): void {
  void useWorkspaceStore
    .getState()
    .navigate(
      target.kind === 'chapter'
        ? { name: 'chapter', workId: target.workId, chapterId: target.chapterId }
        : { name: 'work', workId: target.workId }
    )
}

/**
 * Shell của side panel màn chương: `Trợ lý | Ngữ cảnh` trong cùng một panel, không mở hai panel song
 * song. Trợ lý dùng chung store với màn Trợ lý; Ngữ cảnh thuộc `add-agent-context-workflow`. Chat cũ
 * không còn tab: nó chỉ mở từ "đề xuất chờ duyệt", nơi duy nhất còn duyệt được đề xuất dịch đoạn.
 */
export function AssistantSidePanel({
  workId,
  chapterId,
  tab,
  onTabChange,
  onClose,
  legacy
}: {
  workId: string
  chapterId: string
  tab: SidePanelTab
  onTabChange(tab: SidePanelTab): void
  onClose(): void
  /** Chat cũ theo tác phẩm (AiPanel): hàng đợi đề xuất, mở từ thanh trạng thái. */
  legacy: ReactNode
}): JSX.Element {
  return (
    <section aria-label="Bảng Trợ lý" className="flex h-full min-h-0 flex-col bg-subtle">
      <TabsRoot
        value={tab}
        onValueChange={(next) => onTabChange(next as SidePanelTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-10 shrink-0 items-center gap-xs border-b border-default pr-xs pl-sm">
          <TabsList className="min-w-0 flex-1">
            <TabsTab value="assistant">Trợ lý</TabsTab>
            <TabsTab value="context">Ngữ cảnh</TabsTab>
          </TabsList>
          <CompactButton
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            onClick={onClose}
            icon={<CloseIcon size={ICON.sm} />}
          />
        </div>
        <TabsPanel value="assistant" className="flex min-h-0 flex-1 flex-col">
          <AgentPanel onOpenTarget={openTarget} />
        </TabsPanel>
        <TabsPanel value="context" className="min-h-0 flex-1 overflow-y-auto">
          <AppliedContext
            workId={workId}
            chapterId={chapterId}
            onReview={(id) => void openGlossaryReview(id)}
          />
        </TabsPanel>
        <TabsPanel value="legacy" className="flex min-h-0 flex-1 flex-col">
          {legacy}
        </TabsPanel>
      </TabsRoot>
    </section>
  )
}

/** Trên cửa sổ hẹp, cùng shell nằm trong drawer giữ focus; trên cửa sổ rộng nó dock cạnh màn. */
export function AssistantSideDrawer({
  open,
  onOpenChange,
  children
}: {
  open: boolean
  onOpenChange(open: boolean): void
  children: ReactNode
}): JSX.Element {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} label="Bảng Trợ lý">
      {children}
    </Drawer>
  )
}
