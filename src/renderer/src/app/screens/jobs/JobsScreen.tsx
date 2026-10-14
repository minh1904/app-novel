import type { JSX } from 'react'
import { PageFrame } from '../../../components/ui/PageFrame'
import { TaskList } from '../../../modules/agent/public'
import { openGlossaryReview, useWorkspaceStore } from '../../../modules/workspace/public'

/**
 * Màn Tác vụ toàn ứng dụng: mọi tác vụ dịch bền, điều khiển được (tạm dừng, tiếp tục, hủy, thử lại) và
 * cập nhật khi Main báo đổi, kể cả khi màn đang mở sẵn.
 */
export function JobsScreen({
  onOpenChapter
}: {
  onOpenChapter: (workId: string, chapterId: string) => void
}): JSX.Element {
  return (
    <PageFrame title="Tác vụ" wide>
      <TaskList
        onOpenChapter={onOpenChapter}
        onReviewContext={(workId) => void openGlossaryReview(workId)}
        onOpenSegment={(workId, chapterId, paragraph) =>
          void useWorkspaceStore.getState().openParagraph(workId, chapterId, paragraph)
        }
      />
    </PageFrame>
  )
}
