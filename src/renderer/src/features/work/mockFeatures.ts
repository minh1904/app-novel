/**
 * Features that exist only as a picture on screen. Each one is labelled "Sắp có" and does not read a
 * file, call the main process or write data. Remove the entry when the feature is real.
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
  jobsArea: { id: 'jobs-area', label: 'Tác vụ' },
  // `aiPanel` was removed on 2026-10-02: the "Hỏi AI" panel calls a real provider and writes into the
  // translation, so it is no longer a picture on screen (change `ai-chat`).
  sentenceModeToolbar: { id: 'sentence-mode-toolbar', label: 'Tìm & lọc hàng' },
  sentenceModeSidePanels: {
    id: 'sentence-mode-side-panels',
    label: 'Gợi ý · Thuật ngữ · Lịch sử · QA'
  },
  // The app sidebar's pages (docs/modules/workspace/app-level-features.md). Home and Library are real;
  // the cards on Home other than "Tiếp tục dịch" and these pages are pictures.
  homeOverview: { id: 'home-overview', label: 'Số liệu, tác vụ và hoạt động ở Trang chủ' },
  jobsPage: { id: 'jobs-page', label: 'Tác vụ' },
  updatesPage: { id: 'updates-page', label: 'Cập nhật' },
  sharedGlossary: { id: 'shared-glossary', label: 'Kho dùng chung' },
  styleProfiles: { id: 'style-profiles', label: 'Prompt & văn phong' },
  assistantPage: { id: 'assistant-page', label: 'Trợ lý AI' },
  commandPalette: { id: 'command-palette', label: 'Tìm và lệnh (Ctrl K)' }
} as const satisfies Record<string, MockFeature>
