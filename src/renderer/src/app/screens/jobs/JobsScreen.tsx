import type { JSX } from 'react'
import { PageFrame } from '../../../components/ui/PageFrame'
import { TabsList, TabsPanel, TabsRoot, TabsTab } from '../../../components/ui/Tabs'
import { OperationLog, TaskList } from '../../../modules/agent/public'
import { openGlossaryReview, useWorkspaceStore } from '../../../modules/workspace/public'

/**
 * Màn Tác vụ toàn ứng dụng: mọi tác vụ dịch bền, điều khiển được (tạm dừng, tiếp tục, hủy, thử lại) và
 * cập nhật khi Main báo đổi, kể cả khi màn đang mở sẵn. Tab Nhật ký AI liệt kê từng lượt AI chạy để
 * biết lượt nào lỗi và vì sao.
 */
export function JobsScreen({
  onOpenChapter
}: {
  onOpenChapter: (workId: string, chapterId: string) => void
}): JSX.Element {
  return (
    <PageFrame title="Tác vụ" wide>
      <TabsRoot defaultValue="tasks" className="flex flex-col gap-md">
        <TabsList>
          <TabsTab value="tasks">Tác vụ</TabsTab>
          <TabsTab value="log">Nhật ký AI</TabsTab>
        </TabsList>
        <TabsPanel value="tasks">
          <TaskList
            onOpenChapter={onOpenChapter}
            onReviewContext={(workId) => void openGlossaryReview(workId)}
            onOpenSegment={(workId, chapterId, paragraph) =>
              void useWorkspaceStore.getState().openParagraph(workId, chapterId, paragraph)
            }
          />
        </TabsPanel>
        <TabsPanel value="log">
          <OperationLog />
        </TabsPanel>
      </TabsRoot>
    </PageFrame>
  )
}
