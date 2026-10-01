import {
  ProviderError,
  type SegmentText,
  type TranslateOptions,
  type TranslateRequest,
  type TranslateResponse,
  type TranslationProvider
} from './types'

/** What the mock should do wrong, to exercise the code that handles providers that do. */
export type MockFailure =
  | 'rate_limited'
  | 'network'
  | 'auth'
  | 'refused'
  /** Leaves out the last segment. */
  | 'missing_id'
  /** Answers the first segment twice, the second time with different text. */
  | 'duplicate_id'
  /** Answers with ids nobody asked for. */
  | 'extra_id'
  /** Answers in reverse order. */
  | 'shuffle'
  /** Answers with nothing at all. */
  | 'empty'

export interface MockProviderOptions {
  /** Pretend the model takes this long. Aborting ends the wait at once. */
  delayMs?: number
  failure?: MockFailure
  /** For `rate_limited`: how long the provider says to wait. */
  retryAfterMs?: number
}

export const MOCK_PROVIDER_ID = 'mock'
export const MOCK_MODEL = 'mock-1'
const PREFIX = '[giả lập] '

/** The deterministic "translation" the mock returns: easy to recognise and never mistaken for real. */
export function mockTranslation(text: string): string {
  return PREFIX + text
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ProviderError('cancelled', 'Yêu cầu đã bị hủy.'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new ProviderError('cancelled', 'Yêu cầu đã bị hủy.'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Offline provider for development and tests: no network, no key. Its answers are deterministic and
 * always say they are mock, so they can never pass for a real translation.
 */
export class MockProvider implements TranslationProvider {
  readonly id = MOCK_PROVIDER_ID

  constructor(private options: MockProviderOptions = {}) {}

  /** Changes how the mock behaves from the next call on. */
  configure(options: MockProviderOptions): void {
    this.options = options
  }

  async translate(
    request: TranslateRequest,
    { signal }: TranslateOptions = {}
  ): Promise<TranslateResponse> {
    const { delayMs = 0, failure, retryAfterMs } = this.options
    if (delayMs > 0) await wait(delayMs, signal)
    else if (signal?.aborted) throw new ProviderError('cancelled', 'Yêu cầu đã bị hủy.')

    switch (failure) {
      case 'rate_limited':
        throw new ProviderError('rate_limited', 'Nhà cung cấp giới hạn tốc độ.', { retryAfterMs })
      case 'network':
        throw new ProviderError('network', 'Không kết nối được tới nhà cung cấp.')
      case 'auth':
        throw new ProviderError('auth', 'Khóa API không hợp lệ.')
      case 'refused':
        throw new ProviderError('refused', 'Nhà cung cấp từ chối nội dung này.')
    }

    let items: SegmentText[] = request.segments.map((segment) => ({
      id: segment.id,
      text: mockTranslation(segment.text)
    }))

    switch (failure) {
      case 'missing_id':
        items = items.slice(0, -1)
        break
      case 'duplicate_id':
        if (items.length > 0) items = [...items, { id: items[0].id, text: 'bản trùng' }]
        break
      case 'extra_id':
        items = [...items, { id: 'khong-ai-yeu-cau', text: 'thừa' }]
        break
      case 'shuffle':
        items = [...items].reverse()
        break
      case 'empty':
        items = []
        break
    }

    return { provider: MOCK_PROVIDER_ID, model: MOCK_MODEL, items }
  }
}
