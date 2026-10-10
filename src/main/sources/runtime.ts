import type {
  AccessState,
  AdapterContext,
  CatalogItem,
  CatalogPage,
  ChapterPage,
  NovelSourceAdapter,
  SourceCapability
} from './domain'

export type AdapterRuntimeErrorCode =
  | 'capability_denied'
  | 'parser_broken'
  | 'cursor_loop'
  | 'page_limit'
  | 'cancelled'
  | 'deadline_exceeded'

export class AdapterRuntimeError extends Error {
  constructor(
    readonly code: AdapterRuntimeErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'AdapterRuntimeError'
  }
}

const ACCESS_STATES = new Set<AccessState>([
  'public',
  'login_required',
  'age_verification_required',
  'entitlement_required',
  'manual_intervention_required',
  'temporarily_unavailable',
  'parser_broken'
])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function validCatalogItem(value: unknown): value is CatalogItem {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<CatalogItem>
  return (
    isNonEmptyString(item.remoteChapterId) &&
    typeof item.title === 'string' &&
    typeof item.order === 'number' &&
    Number.isFinite(item.order) &&
    ACCESS_STATES.has(item.access as AccessState)
  )
}

function validCatalogPage(value: unknown): value is CatalogPage {
  if (value === null || typeof value !== 'object') return false
  const page = value as Partial<CatalogPage>
  return (
    isNonEmptyString(page.remoteWorkId) &&
    Array.isArray(page.items) &&
    page.items.every(validCatalogItem) &&
    typeof page.exhausted === 'boolean' &&
    typeof page.complete === 'boolean' &&
    (page.nextCursor === undefined || isNonEmptyString(page.nextCursor)) &&
    (page.exhausted || page.nextCursor !== undefined)
  )
}

function validChapterPage(value: unknown): value is ChapterPage {
  if (value === null || typeof value !== 'object') return false
  const page = value as Partial<ChapterPage>
  return (
    isNonEmptyString(page.remoteChapterId) &&
    typeof page.text === 'string' &&
    /^[a-f0-9]{64}$/.test(page.contentHash ?? '') &&
    /^[a-f0-9]{64}$/.test(page.payloadHash ?? '') &&
    page.normalizationVersion === 1
  )
}

export class AdapterRuntime {
  constructor(private readonly adapter: NovelSourceAdapter) {}

  async getCatalog(input: { remoteWorkId: string }, signal?: AbortSignal): Promise<CatalogPage> {
    this.requireCapability('catalog', this.adapter.getCatalog)
    return await this.withDeadline(signal, async (context) => {
      const items: CatalogItem[] = []
      const seenCursors = new Set<string>()
      let cursor: string | undefined
      let complete = true
      for (
        let pageNumber = 0;
        pageNumber < this.adapter.manifest.limits.maxPages;
        pageNumber += 1
      ) {
        const page = await this.adapter.getCatalog!({ ...input, cursor }, context)
        if (!validCatalogPage(page)) {
          throw new AdapterRuntimeError('parser_broken', 'adapter returned an invalid catalog page')
        }
        if (page.remoteWorkId !== input.remoteWorkId) {
          throw new AdapterRuntimeError('parser_broken', 'adapter returned the wrong work identity')
        }
        items.push(...page.items)
        complete &&= page.complete
        if (page.exhausted) return { ...page, items, complete, nextCursor: undefined }
        const nextCursor = page.nextCursor!
        if (seenCursors.has(nextCursor)) {
          throw new AdapterRuntimeError('cursor_loop', `adapter repeated cursor: ${nextCursor}`)
        }
        seenCursors.add(nextCursor)
        cursor = nextCursor
      }
      throw new AdapterRuntimeError('page_limit', 'adapter exceeded its page limit')
    })
  }

  async getChapter(
    input: { remoteWorkId: string; remoteChapterId: string },
    signal?: AbortSignal
  ): Promise<ChapterPage> {
    this.requireCapability('chapter', this.adapter.getChapter)
    return await this.withDeadline(signal, async (context) => {
      const page = await this.adapter.getChapter!(input, context)
      if (!validChapterPage(page) || page.remoteChapterId !== input.remoteChapterId) {
        throw new AdapterRuntimeError('parser_broken', 'adapter returned an invalid chapter page')
      }
      return page
    })
  }

  private requireCapability(capability: SourceCapability, operation: unknown): void {
    if (
      !this.adapter.manifest.capabilities.includes(capability) ||
      typeof operation !== 'function'
    ) {
      throw new AdapterRuntimeError(
        'capability_denied',
        `adapter does not declare the ${capability} capability`
      )
    }
  }

  private async withDeadline<T>(
    externalSignal: AbortSignal | undefined,
    operation: (context: AdapterContext) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController()
    let deadlineExpired = false
    const abortFromExternal = () => controller.abort(externalSignal?.reason)
    if (externalSignal?.aborted) abortFromExternal()
    else externalSignal?.addEventListener('abort', abortFromExternal, { once: true })
    const timer = setTimeout(() => {
      deadlineExpired = true
      controller.abort(new Error('adapter deadline exceeded'))
    }, this.adapter.manifest.limits.timeoutMs)

    try {
      if (controller.signal.aborted) throw controller.signal.reason
      return await operation({ signal: controller.signal, now: () => new Date() })
    } catch (error) {
      if (externalSignal?.aborted) {
        throw new AdapterRuntimeError('cancelled', 'adapter operation was cancelled', {
          cause: error
        })
      }
      if (deadlineExpired) {
        throw new AdapterRuntimeError(
          'deadline_exceeded',
          'adapter operation exceeded its deadline',
          {
            cause: error
          }
        )
      }
      throw error
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', abortFromExternal)
    }
  }
}
