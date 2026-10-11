import { ChaptersArea } from './ChaptersArea'
import { ContextAreaMock } from './ContextAreaMock'
import { JobsAreaMock } from './JobsAreaMock'
import { MOCK_FEATURES } from '../../../lib/mockFeatures'
import { SourcesArea } from './SourcesArea'
import type { WorkArea } from './workArea'

/**
 * Các khu vực trong màn hình chi tiết tác phẩm theo thứ tự hiển thị:
 * Chương, Ngữ cảnh, Bản raw và Tác vụ dịch AI.
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
  label: 'Bản raw',
  render: (props) => <SourcesArea workId={props.workId} />
}

export const jobsArea: WorkArea = {
  id: MOCK_FEATURES.jobsArea.id,
  label: MOCK_FEATURES.jobsArea.label,
  soon: true,
  render: () => <JobsAreaMock />
}

export const workAreas: ReadonlyArray<WorkArea> = [chaptersArea, contextArea, sourcesArea, jobsArea]
