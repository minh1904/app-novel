/**
 * Features that exist only as a picture on screen. Each one is labelled "Sắp có", does not read a
 * file, call the main process or write data, and has a row with the same `id` in
 * docs/handbook/delivery/backlog.md (checked by a test). Remove the entry when the feature is real.
 */
export interface MockFeature {
  id: string
  label: string
}

export const SOON_LABEL = 'Sắp có'

export const MOCK_FEATURES = {
  importTxt: { id: 'import-txt', label: 'Nhập từ .txt' },
  contextArea: { id: 'context-area', label: 'Ngữ cảnh' },
  sourcesArea: { id: 'sources-area', label: 'Nguồn' },
  jobsArea: { id: 'jobs-area', label: 'Tác vụ' }
} as const satisfies Record<string, MockFeature>
