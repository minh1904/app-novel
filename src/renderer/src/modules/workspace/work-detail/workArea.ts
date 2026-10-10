import type { ReactNode } from 'react'
import type { WorkSummary } from '../../../../../shared/contracts/library'

/** What the frame hands to every area of the work detail screen. */
export interface WorkAreaProps {
  /** Areas take their work from here, never from whatever the library has selected. */
  workId: string
  /** Called with the work returned by a change an area makes, so the header stays current. */
  onWork(summary: WorkSummary): void
  /** Opens a chapter in the editor. */
  onOpenChapter(chapterId: string): void
  /** Goes up each time the header asks the Chapters area to start adding a chapter. */
  addChapterSignal: number
  /** Opens the export dialog on the chapters picked in a list. */
  onExportChapters(ids: ReadonlySet<string>): void
}

/**
 * One area of the work detail screen: Chapters, then Context, Sources and Jobs (see the
 * work-area-navigation change for the order). An area is either a real screen, or a picture marked
 * `soon` that is listed in the backlog and does nothing.
 */
export interface WorkArea {
  id: string
  label: string
  /** Set for an area that is only a picture ("Sắp có"); its `id` must be in the backlog. */
  soon?: boolean
  render(props: WorkAreaProps): ReactNode
}
