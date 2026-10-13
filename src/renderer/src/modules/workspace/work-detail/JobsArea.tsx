import type { JSX } from 'react'
import { TaskList } from '@renderer/modules/agent/public'
import { openGlossaryReview } from './openGlossaryReview'
import type { WorkAreaProps } from './workArea'

/** Khu Tác vụ của tác phẩm: các tác vụ dịch bền của riêng tác phẩm này, đọc từ Main. */
export function JobsArea({
  workId,
  onOpenChapter
}: Pick<WorkAreaProps, 'workId' | 'onOpenChapter'>): JSX.Element {
  return (
    <TaskList
      workId={workId}
      onOpenChapter={(_workId, chapterId) => onOpenChapter(chapterId)}
      onReviewContext={(id) => void openGlossaryReview(id)}
    />
  )
}
