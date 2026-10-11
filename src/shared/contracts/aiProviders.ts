/**
 * Nhóm các kết nối AI trong Cài đặt › Kết nối AI.
 * Quyết định cách hiển thị danh sách các kết nối theo từng nhóm nhà cung cấp.
 */

export interface ProviderCard {
  /** Id cấu hình sẵn của nhà cung cấp, dùng làm khóa tra cứu bảng giá. */
  id: string
  label: string
  description: string
  /** Địa chỉ trang lấy khóa API. */
  keyUrl: string
}

export const PROVIDER_CARDS: readonly ProviderCard[] = [
  {
    id: 'google',
    label: 'Google Gemini',
    description:
      'Gemini qua endpoint tương thích OpenAI của Google. Mỗi project có hạn mức miễn phí riêng.',
    keyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Một khóa cho hàng trăm model của nhiều hãng.',
    keyUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Model GPT bằng khóa API của OpenAI Platform.',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Model DeepSeek bằng khóa API của DeepSeek Platform.',
    keyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude bằng khóa API của Anthropic Console (không dùng gói Claude Pro/Max).',
    keyUrl: 'https://console.anthropic.com/settings/keys'
  }
]

export const LOCAL_PROVIDERS = ['ollama', 'lmstudio'] as const

export type ConnectionSection = 'accounts' | 'keys' | 'endpoints' | 'local'

/** Xác định mục trong trang Cài đặt mà kết nối này thuộc về. */
export function connectionSection(connection: {
  providerId: string | null
  authKind?: 'api_key' | 'oauth'
}): ConnectionSection {
  if (connection.authKind === 'oauth') return 'accounts'
  const id = connection.providerId
  if (id && (LOCAL_PROVIDERS as readonly string[]).includes(id)) return 'local'
  if (id && PROVIDER_CARDS.some((card) => card.id === id)) return 'keys'
  return 'endpoints'
}

/**
 * Danh sách host được phép mở trên trình duyệt bên ngoài qua `app:open-external`. Chỉ cho phép giao thức https.
 */
export const EXTERNAL_LINK_HOSTS: readonly string[] = [
  ...new Set(PROVIDER_CARDS.map((card) => new URL(card.keyUrl).host)),
  'ollama.com',
  'lmstudio.ai'
]

export function isAllowedExternalLink(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && EXTERNAL_LINK_HOSTS.includes(parsed.host)
  } catch {
    return false
  }
}
