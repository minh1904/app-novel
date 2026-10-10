import { describe, expect, it } from 'vitest'
import type { SourceManifest } from './domain'
import { ManifestValidationError, validateManifest } from './manifest'
import { SourceRegistry } from './registry'

const baseManifest: SourceManifest = {
  manifestVersion: 1,
  sourceId: 'mira.folder',
  displayName: 'Folder',
  nativeNames: ['Thư mục'],
  aliases: ['local files'],
  domains: [],
  adapterVersion: '1.2.3',
  apiVersion: '1.0.0',
  dataVersion: 1,
  countryCode: 'ZZ',
  languageTags: ['vi', 'en'],
  capabilities: ['identify', 'work', 'catalog', 'chapter'],
  auth: 'none',
  origin: { kind: 'builtin' },
  limits: { maxPages: 10, pageSize: 100, timeoutMs: 1_000 }
}

describe('adapter manifests and registry', () => {
  it('accepts a valid builtin manifest and rejects malformed or third-party manifests', () => {
    expect(validateManifest(baseManifest)).toEqual(baseManifest)
    expect(() => validateManifest({ ...baseManifest, adapterVersion: 'latest' })).toThrow(
      ManifestValidationError
    )
    expect(() =>
      validateManifest({
        ...baseManifest,
        sourceId: 'mira.third-party',
        origin: { kind: 'package', packageName: '@third-party/source' }
      })
    ).toThrow(/official Mira package/)
  })

  it('rejects duplicate source IDs', () => {
    expect(() => new SourceRegistry([baseManifest, { ...baseManifest }])).toThrow(
      /duplicate sourceId/
    )
  })

  it('searches metadata and combines country, language, capability and health filters', () => {
    const korean: SourceManifest = {
      ...baseManifest,
      sourceId: 'mira.korean',
      displayName: 'Korean Fiction',
      nativeNames: ['한국 소설'],
      aliases: ['han-guk'],
      domains: ['novel.example.kr'],
      countryCode: 'KR',
      languageTags: ['ko'],
      capabilities: ['catalog'],
      health: 'healthy'
    }
    const registry = new SourceRegistry([korean, { ...baseManifest, health: 'unchecked' }])

    expect(registry.query({ text: '한국' }).map((item) => item.sourceId)).toEqual(['mira.korean'])
    expect(
      registry
        .query({ countryGroup: 'KR', languageTag: 'ko', capability: 'catalog', health: 'healthy' })
        .map((item) => item.sourceId)
    ).toEqual(['mira.korean'])
    expect(registry.query({ countryGroup: 'other' }).map((item) => item.sourceId)).toEqual([
      'mira.folder'
    ])
    expect(registry.findByUrl('https://novel.example.kr/work/1')?.sourceId).toBe('mira.korean')
  })
})
