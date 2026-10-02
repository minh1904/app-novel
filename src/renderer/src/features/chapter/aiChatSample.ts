/**
 * Fixed sample for the "Hỏi AI" panel. Nothing here is read from a file or a provider: the panel is
 * still illustration only (`ai-chat-panel` in delivery/backlog.md). The same content drives the
 * wireframe at docs/handbook/experience/wireframes (`man=hoi-ai`), so the two stay comparable.
 */

export interface ToolStep {
  label: string
  /** What the tool did — scope, source, filter. Never the answer itself. */
  detail: string
  state: 'done' | 'running' | 'error'
}

export interface ContextChip {
  label: string
  kind: 'segment' | 'glossary' | 'honorifics'
  /** The segment chip follows the cursor, so it cannot be removed by hand. */
  fixed?: boolean
}

export interface ModelOption {
  name: string
  /** Price in USD per 1M tokens and context size, or how the provider is reached. */
  meta: string
  badge?: string
}

export interface ModelGroup {
  group: string
  items: ModelOption[]
}

/** Ask answers, Edit proposes with an Apply button. No Agent mode — see research/ai-provider-integration.md. */
export const AI_MODES = [
  { id: 'hoi', label: 'Hỏi', hint: 'Chỉ đọc, không sửa bản dịch' },
  { id: 'sua', label: 'Sửa', hint: 'Trả đề xuất có nút Áp dụng' }
] as const

export type AiModeId = (typeof AI_MODES)[number]['id']

/**
 * Prices are samples. research/ai-provider-integration.md says to read each provider's own pricing
 * page before any of this reaches a real cost estimate.
 */
export const AI_MODELS: ModelGroup[] = [
  {
    group: 'Anthropic',
    items: [
      { name: 'Claude Sonnet 5', meta: '3 / 15 · 1M' },
      { name: 'Claude Haiku 4.5', meta: '1 / 5 · 200K' }
    ]
  },
  {
    group: 'Google',
    items: [{ name: 'Gemini Flash-Lite', meta: '0,30 / 2,50', badge: 'có bậc miễn phí' }]
  },
  { group: 'DeepSeek', items: [{ name: 'DeepSeek Chat', meta: '0,30 / 1,20' }] },
  { group: 'OpenRouter', items: [{ name: 'Tự chọn trong 300+ model', meta: 'một khóa' }] },
  { group: 'Máy này', items: [{ name: 'Qwen3 8B', meta: 'Ollama :11434', badge: 'ngoại tuyến' }] }
]

export const DEFAULT_MODEL = 'Claude Sonnet 5'

export const CONTEXT_CHIPS: ContextChip[] = [
  { label: 'segment 88', kind: 'segment', fixed: true },
  { label: 'Thuật ngữ', kind: 'glossary' },
  { label: 'Xưng hô', kind: 'honorifics' }
]

export const SAMPLE = {
  segment: 88,
  question: 'Dịch tự nhiên hơn, bớt cứng nhé',
  lead: 'Chỗ cứng nhất là “trong suốt trường tiểu học” và “được hưởng”. Bản gọn hơn:',
  proposal:
    'Nhờ ngoại hình nổi bật, cô được nhiều người để ý suốt những năm đi học, nhưng chưa từng yêu ai lâu dài.',
  note: '“grade school” ở đây là quãng học phổ thông, không phải cấp một; Thuật ngữ của tác phẩm đã chốt “những năm đi học”.',
  steps: [
    {
      label: 'Tra Thuật ngữ của tác phẩm',
      detail: 'Đối chiếu 14 mục đã chốt cho Ch.1–11',
      state: 'done'
    },
    {
      label: 'Tra ma trận Xưng hô',
      detail: 'Lấy cách gọi Miyako Shirakawa ở 3 chương gần nhất',
      state: 'done'
    },
    {
      label: 'Đọc ví dụ Văn phong',
      detail: '4 đoạn đã đánh dấu “giọng tự nhiên” trong bản dịch cũ',
      state: 'done'
    }
  ] satisfies ToolStep[],
  suggestions: ['“grade school” nên dịch thế nào?', 'Viết lại cả đoạn theo giọng này']
} as const
