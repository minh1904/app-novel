/**
 * How Settings › Kết nối AI groups what the person has connected, after Hermes Desktop's four Providers
 * pages (change `hermes-settings-modal`, design D4). Data only: the connection records themselves are
 * unchanged; this decides where each one is shown.
 */

export interface ProviderCard {
  /** The preset's `providerId`, which is also the price-catalog id. */
  id: string
  label: string
  description: string
  /** Where the person gets a key. */
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

/** The Settings page a connection belongs on. */
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
 * Hosts a page may ask main to open in the browser (`app:open-external`). Only https and only these: the
 * renderer never gets a general "open any URL" door.
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
