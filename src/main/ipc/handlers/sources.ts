import { EVENT_CHANNELS } from '../../../shared/contracts/channels'
import {
  sourceBindingCreateInputSchema,
  sourceBindingDeleteInputSchema,
  sourceBindingIdentifyInputSchema,
  sourceBindingPreviewCreateInputSchema,
  sourceBindingsListInputSchema,
  sourceBindingUpdateInputSchema,
  sourceCatalogGetInputSchema,
  sourceCatalogDownloadInputSchema,
  sourceCatalogDownloadRangeInputSchema,
  sourceCatalogReorderInputSchema,
  sourceCatalogListInputSchema,
  sourceSyncCancelInputSchema,
  sourceSyncStartInputSchema,
  sourceSyncStatusInputSchema,
  sourceRegistryListInputSchema,
  sourceUpdateApplyInputSchema,
  sourceUpdateMarkSeenInputSchema,
  sourceUpdatePreviewApplyInputSchema,
  sourceUpdatesListInputSchema,
  type SourceCatalogItem,
  type SourceBindingIdentifyResult,
  type SourceSyncRun,
  type SourceUpdateEvent
} from '../../../shared/contracts/sources'
import {
  computeTargetPosition,
  getSyncRun,
  listCatalogItems,
  listSourceBindings,
  listUpdateEvents,
  markEventSeen,
  reorderByCatalog,
  type StoredCatalogItem,
  type StoredSyncRun,
  type StoredUpdateEvent
} from '../../infra/storage/sourceStorage'
import { parseRangeString } from '../../../shared/text/rangeParser'
import { StorageError } from '../../infra/storage/errors'
import { identifyKakuyomu } from '../../sources/kakuyomu/identify'
import { createAsyncHandler, createHandler, createSinkHandler } from '../handler'
import { sourcesOf, type AreaHandlers, type HandlerDeps } from './deps'

function storedToContractCatalogItem(s: StoredCatalogItem): SourceCatalogItem {
  return {
    id: s.id,
    bindingId: s.bindingId,
    remoteChapterId: s.remoteChapterId,
    remoteUrl: s.remoteUrl,
    chapterId: s.chapterId,
    position: Number.parseInt(s.ordinalKey, 10) || 0,
    title: s.title,
    kind: (['chapter', 'volume', 'extra', 'unknown'].includes(s.kind)
      ? s.kind
      : 'chapter') as SourceCatalogItem['kind'],
    access: s.accessState as SourceCatalogItem['access'],
    contentHash: null,
    firstSeenAt: s.firstSeenAt,
    lastSeenAt: s.lastSeenAt,
    missingStreak: s.missingStreak,
    removedAt: s.removedAt
  }
}

function storedToContractSyncRun(s: StoredSyncRun): SourceSyncRun {
  return {
    id: s.id,
    bindingId: s.bindingId,
    trigger: s.trigger === 'import' ? 'manual' : s.trigger,
    state: s.state as SourceSyncRun['state'],
    adapterVersion: s.adapterVersion,
    complete: s.catalogComplete,
    phase: s.state === 'completed' ? 'done' : 'catalog',
    processedCount: 0,
    totalCount: null,
    failure: s.failureKind
      ? {
          code: ([
            'cancelled',
            'login_required',
            'manual_intervention_required',
            'temporarily_unavailable',
            'parser_broken',
            'adapter_missing',
            'deadline_exceeded'
          ].includes(s.failureKind)
            ? s.failureKind
            : 'unknown') as any,
          message: s.failureMessage ?? 'Lỗi kiểm tra nguồn',
          retryable: s.failureKind !== 'cancelled'
        }
      : null,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt
  }
}

function storedToContractUpdateEvent(s: StoredUpdateEvent): SourceUpdateEvent {
  let parsedPayload: Record<string, unknown> | null = null
  try {
    parsedPayload = JSON.parse(s.payloadJson)
  } catch {
    parsedPayload = null
  }

  return {
    id: s.id,
    bindingId: s.bindingId,
    catalogItemId: s.catalogItemId,
    kind: s.kind as SourceUpdateEvent['kind'],
    dedupeKey: s.dedupeKey,
    payload: parsedPayload,
    detectedAt: s.detectedAt,
    seenAt: s.seenAt,
    actedAt: s.actedAt
  }
}

export function sourcesHandlers(deps: HandlerDeps): AreaHandlers<'sources'> {
  const sources = () => sourcesOf(deps)
  const activeDownloads = new Set<string>()
  const urlPreviews = new Map<
    string,
    {
      workId: string
      sourceId: string
      remoteWorkId: string
      canonicalUrl: string
      expiresAt: number
    }
  >()

  return {
    'sources:catalog:list': createHandler(sourceCatalogListInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        const stored = listCatalogItems(db, input.bindingId)
        const limit = input.limit ?? 50
        let offset = 0
        if (input.cursor) {
          offset = Number.parseInt(input.cursor, 10) || 0
        }

        const slice = stored.slice(offset, offset + limit)
        const nextOffset = offset + limit
        const exhausted = nextOffset >= stored.length

        return {
          items: slice.map(storedToContractCatalogItem),
          nextCursor: exhausted ? null : String(nextOffset),
          exhausted
        }
      })
    }),

    'sources:catalog:get': createHandler(sourceCatalogGetInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        const item = sources().catalog.get(db, input.itemId)
        if (!item) {
          throw new StorageError('not_found', `Catalog item ${input.itemId} không tồn tại`)
        }
        return storedToContractCatalogItem(item)
      })
    }),

    'sources:catalog:download': createAsyncHandler(
      sourceCatalogDownloadInputSchema,
      async (input) => {
        const key = `${input.workId}:${input.itemId}`
        if (activeDownloads.has(key)) throw new StorageError('conflict', 'Chương đang được tải')
        activeDownloads.add(key)
        try {
          const { item, binding } = deps.library.withWork(input.workId, (db) => {
            const item = sources().catalog.get(db, input.itemId)
            if (!item) throw new StorageError('not_found', 'Chương trong danh mục không tồn tại')
            const binding = listSourceBindings(db).find(
              (candidate) => candidate.id === item.bindingId
            )
            if (!binding || !binding.enabled)
              throw new StorageError('validation', 'Nguồn đã bị tắt')
            if (item.chapterId)
              throw new StorageError('conflict', 'Chương này đã được tải vào Mira')
            if (item.accessState !== 'public') {
              throw new StorageError('validation', 'Chương này hiện không thể tải công khai')
            }
            return { item, binding }
          })
          const page = await sources().getChapter({
            sourceId: binding.adapterId,
            remoteWorkId: binding.remoteWorkId,
            remoteChapterId: item.remoteChapterId,
            languageTag: binding.languageTag
          })
          if (!page.text.trim()) throw new StorageError('validation', 'Nguồn trả về chương rỗng')

          const targetPos = deps.library.withWork(input.workId, (db) =>
            computeTargetPosition(db, item.bindingId, item.ordinalKey)
          )
          const { chapter } = deps.library.createChapterAt(input.workId, targetPos, item.title)
          try {
            deps.library.saveText(input.workId, chapter.id, 'source', page.text, 0, [])
            deps.library.withWork(input.workId, (db) => {
              sources().catalog.mapChapter(db, item.id, chapter.id)
            })
          } catch (error) {
            deps.library.deleteChapter(input.workId, chapter.id)
            throw error
          }
          return { chapterId: chapter.id, title: item.title }
        } finally {
          activeDownloads.delete(key)
        }
      }
    ),

    'sources:catalog:download-range': createSinkHandler(
      sourceCatalogDownloadRangeInputSchema,
      async (input, sink) => {
        const positions = parseRangeString(input.range)
        if (positions.length === 0) {
          throw new StorageError('validation', 'Dải chương không hợp lệ')
        }

        const candidateItems = deps.library.withWork(input.workId, (db) => {
          const binding = listSourceBindings(db).find((b) => b.id === input.bindingId)
          if (!binding || !binding.enabled) throw new StorageError('validation', 'Nguồn đã bị tắt')
          const allItems = listCatalogItems(db, input.bindingId)
          const posSet = new Set(positions)
          return allItems.filter(
            (it) =>
              it.accessState === 'public' &&
              !it.chapterId &&
              posSet.has(Number.parseInt(it.ordinalKey, 10) || 0)
          )
        })

        let downloadedCount = 0
        for (let i = 0; i < candidateItems.length; i++) {
          const item = candidateItems[i]
          try {
            sink.send(EVENT_CHANNELS.sourcesDownloadProgress, {
              workId: input.workId,
              bindingId: input.bindingId,
              current: i + 1,
              total: candidateItems.length,
              title: item.title
            })
          } catch {
            // sink is best-effort
          }

          const { binding } = deps.library.withWork(input.workId, (db) => {
            const binding = listSourceBindings(db).find((b) => b.id === item.bindingId)
            if (!binding) throw new StorageError('not_found', 'Không tìm thấy nguồn')
            return { binding }
          })

          const page = await sources().getChapter({
            sourceId: binding.adapterId,
            remoteWorkId: binding.remoteWorkId,
            remoteChapterId: item.remoteChapterId,
            languageTag: binding.languageTag
          })
          if (!page.text.trim()) continue

          const targetPos = deps.library.withWork(input.workId, (db) =>
            computeTargetPosition(db, item.bindingId, item.ordinalKey)
          )
          const { chapter } = deps.library.createChapterAt(input.workId, targetPos, item.title)
          try {
            deps.library.saveText(input.workId, chapter.id, 'source', page.text, 0, [])
            deps.library.withWork(input.workId, (db) => {
              sources().catalog.mapChapter(db, item.id, chapter.id)
            })
            downloadedCount++
          } catch (error) {
            deps.library.deleteChapter(input.workId, chapter.id)
            throw error
          }
        }

        return { downloadedCount, totalAttempted: candidateItems.length }
      }
    ),

    'sources:catalog:reorder-by-source': createHandler(sourceCatalogReorderInputSchema, (input) => {
      deps.library.withWork(input.workId, (db) => {
        reorderByCatalog(db, input.bindingId, Date.now())
      })
    }),

    'sources:bindings:list': createHandler(sourceBindingsListInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        return sources().bindings.listBindings(db, input.workId)
      })
    }),

    'sources:bindings:identify': createHandler(sourceBindingIdentifyInputSchema, (input) => {
      const manifest = sources().registry.findByUrl(input.candidate)
      if (!manifest || !manifest.capabilities.includes('identify')) return null

      const identity =
        manifest.sourceId === 'mira.jp.kakuyomu' ? identifyKakuyomu(input.candidate) : null
      if (!identity) return null

      const result: SourceBindingIdentifyResult = {
        source: {
          sourceId: manifest.sourceId,
          displayName: manifest.displayName,
          nativeName: manifest.nativeNames[0] ?? null,
          aliases: manifest.aliases,
          domains: manifest.domains,
          countryCode: (manifest.countryCode === 'ZZ'
            ? null
            : manifest.countryCode) as SourceBindingIdentifyResult['source']['countryCode'],
          languageTags:
            manifest.languageTags as SourceBindingIdentifyResult['source']['languageTags'],
          capabilities: manifest.capabilities,
          access:
            manifest.origin.kind === 'builtin'
              ? 'local'
              : manifest.auth === 'none'
                ? 'public'
                : 'account',
          health: {
            state: manifest.health ?? 'healthy',
            checkedAt: null,
            message: null
          }
        },
        remoteWorkId: identity.remoteWorkId,
        canonicalUrl: identity.canonicalUrl,
        inputRemoteChapterId: identity.inputRemoteChapterId ?? null
      }
      return result
    }),

    'sources:bindings:preview-create': createAsyncHandler(
      sourceBindingPreviewCreateInputSchema,
      async (input) => {
        if (input.sourceId === 'mira.jp.kakuyomu') {
          for (const [id, pending] of urlPreviews) {
            if (pending.expiresAt < deps.library.appNow()) urlPreviews.delete(id)
          }
          const preview = await sources().preview({
            sourceId: input.sourceId,
            remoteWorkId: input.remoteWorkId
          })
          const previewId = deps.library.newAppId()
          const expiresAt = deps.library.appNow() + 10 * 60_000
          const canonicalUrl = `https://kakuyomu.jp/works/${input.remoteWorkId}`
          urlPreviews.set(previewId, {
            workId: input.workId,
            sourceId: input.sourceId,
            remoteWorkId: input.remoteWorkId,
            canonicalUrl,
            expiresAt
          })
          return {
            previewId,
            expiresAt,
            workId: input.workId,
            sourceId: input.sourceId,
            remoteWorkId: input.remoteWorkId,
            canonicalUrl,
            inputRemoteChapterId: input.inputRemoteChapterId ?? null,
            title: preview.title,
            author: null,
            description: null,
            languageTag: preview.languageTag,
            totalCount: preview.items.length,
            matchedCount: preview.items.length,
            unmatchedCount: 0,
            errorCount: 0,
            warnings: [],
            sample: preview.items.slice(0, 20).map((item) => ({
              remoteChapterId: item.remoteChapterId,
              title: item.title || item.remoteChapterId,
              position: item.order
            }))
          }
        }
        return {
          previewId: deps.library.newAppId(),
          workId: input.workId,
          sourceId: input.sourceId,
          remoteWorkId: input.remoteWorkId,
          totalCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          errorCount: 0
        }
      }
    ),

    'sources:bindings:create': createHandler(sourceBindingCreateInputSchema, (input) => {
      const preview = urlPreviews.get(input.expectedPreviewId)
      if (
        input.sourceId === 'mira.jp.kakuyomu' &&
        (!preview ||
          preview.expiresAt < deps.library.appNow() ||
          preview.workId !== input.workId ||
          preview.sourceId !== input.sourceId ||
          preview.remoteWorkId !== input.remoteWorkId)
      ) {
        throw new StorageError('validation', 'Bản xem trước URL đã hết hạn hoặc không khớp')
      }
      const binding = deps.library.withWork(input.workId, (db) => {
        return sources().bindings.createBinding(
          db,
          input.workId,
          { ...input, canonicalUrl: preview?.canonicalUrl ?? null },
          deps.library.appNow(),
          () => deps.library.newAppId()
        )
      })
      if (preview) urlPreviews.delete(input.expectedPreviewId)
      return binding
    }),

    'sources:bindings:update': createHandler(sourceBindingUpdateInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        return sources().bindings.updateBinding(
          db,
          input.workId,
          input.bindingId,
          input.patch,
          deps.library.appNow()
        )
      })
    }),

    'sources:bindings:delete': createHandler(sourceBindingDeleteInputSchema, (input) => {
      deps.library.withWork(input.workId, (db) => {
        sources().bindings.deleteBinding(db, input.workId, input.bindingId)
      })
    }),

    'sources:sync:start': createSinkHandler(sourceSyncStartInputSchema, async (input, sink) => {
      return deps.library.withWorkAsync(input.workId, async (db) => {
        const run = await sources().sync.startSync(
          db,
          input.bindingId,
          deps.library.appNow(),
          () => deps.library.newAppId(),
          (progress) => {
            if (!sink.isDestroyed()) {
              sink.send(EVENT_CHANNELS.sourceSyncProgress, progress)
            }
          }
        )
        return storedToContractSyncRun(run)
      })
    }),

    'sources:sync:cancel': createHandler(sourceSyncCancelInputSchema, (input) => {
      // Find in active work or across works
      for (const work of deps.library.list().works) {
        const cancelled = deps.library.withWork(work.id, (db) => {
          return sources().sync.cancelSync(db, input.runId, deps.library.appNow())
        })
        if (cancelled) break
      }
      return {
        id: input.runId,
        bindingId: '',
        trigger: 'manual',
        state: 'cancelled',
        adapterVersion: '1.0.0',
        complete: false,
        phase: 'done',
        processedCount: 0,
        totalCount: null,
        failure: { code: 'cancelled', message: 'Lượt kiểm tra đã bị hủy', retryable: false },
        startedAt: null,
        finishedAt: deps.library.appNow()
      }
    }),

    'sources:sync:status': createHandler(sourceSyncStatusInputSchema, (input) => {
      for (const work of deps.library.list().works) {
        const run = deps.library.withWork(work.id, (db) => getSyncRun(db, input.runId))
        if (run) return storedToContractSyncRun(run)
      }
      throw new StorageError('not_found', `Lượt sync ${input.runId} không tìm thấy`)
    }),

    'sources:updates:list': createHandler(sourceUpdatesListInputSchema, (input) => {
      const workId = input.workId ?? deps.library.list().works[0]?.id
      if (!workId) {
        return { items: [], nextCursor: null, exhausted: true }
      }

      return deps.library.withWork(workId, (db) => {
        let events = listUpdateEvents(db, input.bindingId)
        if (input.unseenOnly) {
          events = events.filter((e) => e.seenAt === null)
        }

        const limit = input.limit ?? 50
        let offset = 0
        if (input.cursor) {
          offset = Number.parseInt(input.cursor, 10) || 0
        }

        const slice = events.slice(offset, offset + limit)
        const nextOffset = offset + limit
        const exhausted = nextOffset >= events.length

        return {
          items: slice.map(storedToContractUpdateEvent),
          nextCursor: exhausted ? null : String(nextOffset),
          exhausted
        }
      })
    }),

    'sources:updates:mark-seen': createHandler(sourceUpdateMarkSeenInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        const now = deps.library.appNow()
        for (const id of input.eventIds) {
          markEventSeen(db, id, now)
        }
        return { updatedCount: input.eventIds.length }
      })
    }),

    'sources:updates:preview-apply': createHandler(sourceUpdatePreviewApplyInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        const events = listUpdateEvents(db)
        const ev = events.find((e) => e.id === input.eventId)
        if (!ev) {
          throw new StorageError('not_found', `Sự kiện cập nhật ${input.eventId} không tồn tại`)
        }
        let payload: Record<string, unknown> = {}
        try {
          payload = JSON.parse(ev.payloadJson)
        } catch {
          // empty
        }
        const chapterId = (payload.chapterId as string) ?? null
        const revisionId = (payload.revisionId as string) ?? null
        if (!chapterId || !revisionId) {
          return {
            eventId: ev.id,
            previewId: deps.library.newAppId(),
            canApply: false
          }
        }
        const preview = sources().content.previewApply(db, chapterId, revisionId)
        return {
          eventId: ev.id,
          previewId: deps.library.newAppId(),
          canApply: true,
          ...preview
        }
      })
    }),

    'sources:updates:apply': createHandler(sourceUpdateApplyInputSchema, (input) => {
      return deps.library.withWork(input.workId, (db) => {
        const events = listUpdateEvents(db)
        const ev = events.find((e) => e.id === input.eventId)
        if (!ev) {
          throw new StorageError('not_found', `Sự kiện cập nhật ${input.eventId} không tồn tại`)
        }
        let payload: Record<string, unknown> = {}
        try {
          payload = JSON.parse(ev.payloadJson)
        } catch {
          // empty
        }
        const chapterId = (payload.chapterId as string) ?? null
        const revisionId = (payload.revisionId as string) ?? null
        if (!chapterId || !revisionId) {
          throw new StorageError('validation', 'Sự kiện không có revision hoặc chapter liên kết')
        }

        const result = sources().content.applyRevision(
          db,
          {
            chapterId,
            revisionId,
            expectedRev: input.expectedRev
          },
          deps.library.appNow(),
          () => deps.library.newAppId()
        )
        return { applied: true, currentRev: result.currentRev }
      })
    }),

    'sources:registry:list': createHandler(sourceRegistryListInputSchema, (input) => {
      const manifests = sources().registry.query(input ?? {})
      return {
        sources: manifests.map((manifest) => ({
          sourceId: manifest.sourceId,
          displayName: manifest.displayName,
          nativeName: manifest.nativeNames[0] ?? null,
          aliases: manifest.aliases,
          domains: manifest.domains,
          countryCode: (manifest.countryCode === 'ZZ' ? null : manifest.countryCode) as any,
          languageTags: manifest.languageTags as any,
          capabilities: manifest.capabilities as any,
          access:
            manifest.origin.kind === 'builtin'
              ? 'local'
              : manifest.auth === 'none'
                ? 'public'
                : 'account',
          health: {
            state: (manifest.health ?? 'healthy') as any,
            checkedAt: null,
            message: null
          }
        }))
      }
    })
  }
}
