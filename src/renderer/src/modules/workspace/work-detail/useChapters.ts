import { useContext, useEffect, useRef } from 'react'
import type { ChapterItem } from '../../../../../shared/contracts/chapters'
import type { WorkSummary } from '../../../../../shared/contracts/library'
import type { Result } from '../../../../../shared/contracts/result'
import { useChapterStore, describeChapterError, type ChaptersLoad } from '../store/chapterStore'
import { WorkTabActiveContext } from '../../../components/ui/topBarSlot'

export type { ChaptersLoad }
export { describeChapterError }

export interface ChaptersController {
  load: ChaptersLoad
  chapters: ChapterItem[]
  loadError: string | null
  notice: string | null
  dismissNotice(): void
  reload(): Promise<void>
  create(title?: string): Promise<Result<ChapterItem>>
  rename(chapterId: string, title: string): Promise<Result<ChapterItem>>
  move(chapterId: string, to: number): Promise<Result<ChapterItem[]>>
  remove(chapterId: string): Promise<Result<ChapterItem[]>>
  open(chapterId: string): Promise<Result<WorkSummary>>
}

export function useChapters(
  workId: string,
  onWork?: (summary: WorkSummary) => void
): ChaptersController {
  const tabActive = useContext(WorkTabActiveContext)
  const store = useChapterStore()
  const onWorkRef = useRef(onWork)
  useEffect(() => {
    onWorkRef.current = onWork
  })

  useEffect(() => {
    if (tabActive) void useChapterStore.getState().initWork(workId)
  }, [workId, tabActive])

  return {
    load: store.workId === workId ? store.load : 'loading',
    chapters: store.workId === workId ? store.chapters : [],
    loadError: store.workId === workId ? store.loadError : null,
    notice: store.workId === workId ? store.notice : null,
    dismissNotice: store.dismissNotice,
    reload: store.reload,
    create: store.create,
    rename: store.rename,
    move: store.move,
    remove: store.remove,
    open: async (chapterId) => {
      const res = await store.open(chapterId)
      if (res.ok) onWorkRef.current?.(res.value)
      return res
    }
  }
}
