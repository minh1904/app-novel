import { ChaptersArea } from './ChaptersArea'
import { ContextAreaMock } from './ContextAreaMock'
import { JobsAreaMock } from './JobsAreaMock'
import { MOCK_FEATURES } from './mockFeatures'
import { SourcesAreaMock } from './SourcesAreaMock'
import type { WorkArea } from './workArea'

/**
 * The areas of the work detail screen, in the fixed order of the work-area-navigation change.
 * Chapters is real, and so is Context: its glossary and addressing tabs read and write the work, and
 * only Văn phong inside it is still a picture. Sources and Jobs are pictures marked "Sắp có" so the
 * finished layout can be seen; each has a row in delivery/backlog.md and becomes real by dropping `soon` and swapping its
 * `render` for the real screen.
 */
export const chaptersArea: WorkArea = {
  id: 'chapters',
  label: 'Chương',
  render: (props) => <ChaptersArea {...props} />
}

export const contextArea: WorkArea = {
  id: MOCK_FEATURES.contextArea.id,
  label: MOCK_FEATURES.contextArea.label,
  render: (props) => <ContextAreaMock workId={props.workId} />
}

export const sourcesArea: WorkArea = {
  id: MOCK_FEATURES.sourcesArea.id,
  label: MOCK_FEATURES.sourcesArea.label,
  soon: true,
  render: () => <SourcesAreaMock />
}

export const jobsArea: WorkArea = {
  id: MOCK_FEATURES.jobsArea.id,
  label: MOCK_FEATURES.jobsArea.label,
  soon: true,
  render: () => <JobsAreaMock />
}

export const workAreas: ReadonlyArray<WorkArea> = [chaptersArea, contextArea, sourcesArea, jobsArea]
