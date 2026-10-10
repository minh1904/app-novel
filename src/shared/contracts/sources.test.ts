import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  MAX_SOURCE_CURSOR_LENGTH,
  sourceBindingSchema,
  sourceCatalogItemSchema,
  sourceCatalogListInputSchema,
  sourceDescriptorSchema,
  sourceManifestSchema,
  sourceSyncRunSchema,
  sourceUpdateEventSchema
} from './sources'

const descriptor = {
  sourceId: 'mira.folder',
  displayName: 'Thư mục',
  nativeName: null,
  aliases: ['Folder'],
  domains: [],
  countryCode: null,
  languageTags: ['ko', 'fr-CA'],
  capabilities: ['identify', 'metadata', 'catalog', 'chapter'],
  access: 'local',
  health: { state: 'healthy', checkedAt: 1, message: null }
} as const

const manifest = {
  ...descriptor,
  manifestVersion: 1,
  adapterVersion: '1.2.3',
  apiVersion: 1,
  dataVersion: 1,
  auth: { type: 'none' },
  origins: [],
  limits: { pageSize: 100, maxPages: 20, timeoutMs: 30_000 }
} as const

describe('source descriptor and manifest contracts', () => {
  it('accepts independent country and language metadata', () => {
    expect(v.parse(sourceDescriptorSchema, { ...descriptor, countryCode: 'KR' })).toMatchObject({
      countryCode: 'KR',
      languageTags: ['ko', 'fr-CA']
    })
    expect(v.is(sourceManifestSchema, manifest)).toBe(true)
  })

  it.each([
    { ...manifest, sourceId: '' },
    { ...manifest, countryCode: 'KOR' },
    { ...manifest, countryCode: 'kr' },
    { ...manifest, languageTags: ['not_a_tag'] },
    { ...manifest, adapterVersion: 'latest' },
    { ...manifest, capabilities: ['database'] }
  ])('rejects invalid manifest metadata %#', (value) => {
    expect(v.is(sourceManifestSchema, value)).toBe(false)
  })
})

describe('source persisted DTO contracts', () => {
  it('accepts binding, catalog, sync and update records', () => {
    expect(
      v.is(sourceBindingSchema, {
        id: 'binding-1',
        workId: 'work-1',
        sourceId: 'mira.folder',
        adapterVersion: '1.2.3',
        remoteWorkId: 'folder:C:/novel',
        canonicalUrl: null,
        countryCode: null,
        languageTag: 'ko',
        label: 'Raw Hàn',
        role: 'primary',
        authProfileId: null,
        enabled: true,
        checkpoint: null,
        createdAt: 1,
        updatedAt: 1
      })
    ).toBe(true)
    expect(
      v.is(sourceCatalogItemSchema, {
        id: 'item-1',
        bindingId: 'binding-1',
        remoteChapterId: 'chapter/1.txt',
        remoteUrl: null,
        chapterId: null,
        position: 1,
        title: '1',
        kind: 'chapter',
        access: 'public',
        contentHash: null,
        firstSeenAt: 1,
        lastSeenAt: 1,
        missingStreak: 0,
        removedAt: null
      })
    ).toBe(true)
    expect(
      v.is(sourceSyncRunSchema, {
        id: 'run-1',
        bindingId: 'binding-1',
        trigger: 'manual',
        state: 'completed',
        adapterVersion: '1.2.3',
        complete: true,
        phase: 'done',
        processedCount: 2,
        totalCount: 2,
        failure: null,
        startedAt: 1,
        finishedAt: 2
      })
    ).toBe(true)
    expect(
      v.is(sourceUpdateEventSchema, {
        id: 'event-1',
        bindingId: 'binding-1',
        catalogItemId: 'item-1',
        kind: 'added',
        dedupeKey: 'added:item-1:first',
        payload: null,
        detectedAt: 2,
        seenAt: null,
        actedAt: null
      })
    ).toBe(true)
  })

  it.each([
    ['binding', sourceBindingSchema, { id: '', languageTag: 'ko' }],
    ['catalog access', sourceCatalogItemSchema, { id: 'x', access: 'paid' }],
    ['sync state', sourceSyncRunSchema, { id: 'x', state: 'sleeping' }],
    ['event kind', sourceUpdateEventSchema, { id: 'x', kind: 'deleted' }]
  ])('rejects invalid %s state', (_name, schema, value) => {
    expect(v.is(schema, value)).toBe(false)
  })
})

describe('source IPC contracts', () => {
  it('bounds pagination cursors and rejects unknown input fields', () => {
    expect(
      v.is(sourceCatalogListInputSchema, {
        workId: 'work-1',
        bindingId: 'binding-1',
        cursor: 'next',
        limit: 50
      })
    ).toBe(true)
    expect(
      v.is(sourceCatalogListInputSchema, {
        workId: 'work-1',
        cursor: 'x'.repeat(MAX_SOURCE_CURSOR_LENGTH + 1)
      })
    ).toBe(false)
    expect(v.is(sourceCatalogListInputSchema, { workId: 'work-1', secret: 'nope' })).toBe(false)
  })
})
