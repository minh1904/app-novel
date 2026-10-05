import { useEffect, useRef } from 'react'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { WorkSummary } from '../../../../shared/contracts/library'
import type { Result } from '../../../../shared/contracts/result'
import {
  useChapterStore,
  describeChapterError,
  type ChaptersLoad
} from '../../stores/chapterStore'

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
  const store = useChapterStore()
  const onWorkRef = useRef(onWork)
  useEffect(() => {
    onWorkRef.current = onWork
  })

  useEffect(() => {
    void store.initWork(workId)
  }, [workId, store])

  return {
    load: store.load,
    chapters: store.chapters,
    loadError: store.loadError,
    notice: store.notice,
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
