import { describe, expect, it, vi } from 'vitest'
import type { CatalogPage, NovelSourceAdapter, SourceManifest } from './domain'
import { AdapterRuntime, type AdapterRuntimeError } from './runtime'

const manifest: SourceManifest = {
  manifestVersion: 1,
  sourceId: 'mira.test',
  displayName: 'Test',
  nativeNames: [],
  aliases: [],
  domains: [],
  adapterVersion: '1.0.0',
  apiVersion: '1.0.0',
  dataVersion: 1,
  countryCode: 'ZZ',
  languageTags: ['en'],
  capabilities: ['catalog'],
  auth: 'none',
  origin: { kind: 'builtin' },
  limits: { maxPages: 2, pageSize: 10, timeoutMs: 50 }
}

function adapter(getCatalog: NovelSourceAdapter['getCatalog']): NovelSourceAdapter {
  return { manifest, getCatalog }
}

function page(overrides: Partial<CatalogPage> = {}): CatalogPage {
  return {
    remoteWorkId: 'work-1',
    items: [{ remoteChapterId: '1', title: 'One', order: 1, access: 'public' }],
    exhausted: true,
    complete: true,
    ...overrides
  }
}

describe('AdapterRuntime', () => {
  it('refuses operations outside the declared capability', async () => {
    const runtime = new AdapterRuntime({ ...adapter(async () => page()), getChapter: vi.fn() })
    await expect(
      runtime.getChapter({ remoteWorkId: 'work-1', remoteChapterId: '1' })
    ).rejects.toMatchObject({
      code: 'capability_denied'
    })
  })

  it('validates adapter output before returning it', async () => {
    const runtime = new AdapterRuntime(
      adapter(async () => ({ ...page(), items: [{ title: 'bad' }] }) as never)
    )
    await expect(runtime.getCatalog({ remoteWorkId: 'work-1' })).rejects.toMatchObject({
      code: 'parser_broken'
    })
  })

  it('collects pages but rejects repeated cursors and page-limit overflow', async () => {
    const repeated = new AdapterRuntime(
      adapter(async ({ cursor }) => page({ exhausted: false, nextCursor: cursor ?? 'same' }))
    )
    await expect(repeated.getCatalog({ remoteWorkId: 'work-1' })).rejects.toMatchObject({
      code: 'cursor_loop'
    })

    let cursorNumber = 0
    const overflowing = new AdapterRuntime(
      adapter(async () => page({ exhausted: false, nextCursor: String(++cursorNumber) }))
    )
    await expect(overflowing.getCatalog({ remoteWorkId: 'work-1' })).rejects.toMatchObject({
      code: 'page_limit'
    })
  })

  it('passes cancellation through and classifies cancellation separately', async () => {
    const controller = new AbortController()
    const runtime = new AdapterRuntime(
      adapter(
        async (_input, context) =>
          await new Promise<CatalogPage>((_resolve, reject) => {
            context.signal.addEventListener('abort', () => reject(context.signal.reason), {
              once: true
            })
          })
      )
    )
    const pending = runtime.getCatalog({ remoteWorkId: 'work-1' }, controller.signal)
    controller.abort()
    await expect(pending).rejects.toEqual(
      expect.objectContaining<Partial<AdapterRuntimeError>>({ code: 'cancelled' })
    )
  })

  it('aborts an adapter that exceeds its deadline', async () => {
    const runtime = new AdapterRuntime(
      adapter(
        async (_input, context) =>
          await new Promise<CatalogPage>((_resolve, reject) => {
            context.signal.addEventListener('abort', () => reject(context.signal.reason), {
              once: true
            })
          })
      )
    )
    await expect(runtime.getCatalog({ remoteWorkId: 'work-1' })).rejects.toMatchObject({
      code: 'deadline_exceeded'
    })
  })
})
