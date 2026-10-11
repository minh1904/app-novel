import type { SourceCapability, SourceHealth, SourceManifest } from './domain'
import { validateManifest } from './manifest'

export interface RegistryQuery {
  text?: string
  countryGroup?: 'CN' | 'JP' | 'KR' | 'other'
  languageTag?: string
  capability?: SourceCapability
  health?: SourceHealth
}

export interface SourceRegistryOptions {
  allowUnreleased?: boolean
}

export class SourceRegistry {
  readonly #manifests: SourceManifest[]
  readonly #allowUnreleased: boolean

  constructor(manifests: SourceManifest[], options: SourceRegistryOptions = {}) {
    this.#allowUnreleased = options.allowUnreleased ?? false
    const sourceIds = new Set<string>()
    this.#manifests = manifests.map((manifest) => {
      const valid = validateManifest(manifest)
      if (sourceIds.has(valid.sourceId)) throw new Error(`duplicate sourceId: ${valid.sourceId}`)
      sourceIds.add(valid.sourceId)
      return valid
    })
  }

  get(sourceId: string): SourceManifest | undefined {
    const found = this.#manifests.find((manifest) => manifest.sourceId === sourceId)
    if (!found) return undefined
    return this.#maskIfClosed(found)
  }

  query(query: RegistryQuery = {}): SourceManifest[] {
    const needle = query.text?.trim().toLocaleLowerCase()
    return this.#manifests
      .filter((manifest) => {
        const isClosed = manifest.releaseGate === 'closed' && !this.#allowUnreleased
        if (isClosed && query.capability !== undefined) return false

        const searchable = [
          manifest.displayName,
          ...manifest.nativeNames,
          ...manifest.aliases,
          ...manifest.domains
        ]
          .join('\n')
          .toLocaleLowerCase()
        if (needle && !searchable.includes(needle)) return false
        if (query.countryGroup === 'other' && ['CN', 'JP', 'KR'].includes(manifest.countryCode))
          return false
        if (
          query.countryGroup !== undefined &&
          query.countryGroup !== 'other' &&
          manifest.countryCode !== query.countryGroup
        ) {
          return false
        }
        if (query.languageTag && !manifest.languageTags.includes(query.languageTag)) return false
        if (query.capability && !manifest.capabilities.includes(query.capability)) return false
        if (query.health && (manifest.health ?? 'unchecked') !== query.health) return false
        return true
      })
      .map((manifest) => this.#maskIfClosed(manifest))
  }

  findByUrl(value: string): SourceManifest | undefined {
    let hostname: string
    try {
      hostname = new URL(value).hostname.toLocaleLowerCase()
    } catch {
      return undefined
    }
    const found = this.#manifests.find((manifest) =>
      manifest.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
    )
    if (!found) return undefined
    return this.#maskIfClosed(found)
  }

  #maskIfClosed(manifest: SourceManifest): SourceManifest {
    if (manifest.releaseGate === 'closed' && !this.#allowUnreleased) {
      return {
        ...manifest,
        capabilities: []
      }
    }
    return manifest
  }
}
