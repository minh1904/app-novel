import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import type { NovelSourceAdapter, SourceManifest } from './domain'
import { contentIdentity, stablePathHash } from './normalization'

export interface SingleFileAdapter extends NovelSourceAdapter {
  readonly remoteWorkId: string
}

function manifest(languageTag: string): SourceManifest {
  return {
    manifestVersion: 1,
    sourceId: 'mira.single-file',
    displayName: 'Single file',
    nativeNames: [],
    aliases: ['file', 'txt', 'markdown'],
    domains: [],
    adapterVersion: '1.0.0',
    apiVersion: '1.0.0',
    dataVersion: 1,
    countryCode: 'ZZ',
    languageTags: [languageTag],
    capabilities: ['identify', 'work', 'catalog', 'chapter'],
    auth: 'none',
    origin: { kind: 'builtin' },
    limits: { maxPages: 1, pageSize: 1, timeoutMs: 5_000 },
    health: 'healthy'
  }
}

function assertSupportedFile(filePath: string): void {
  if (!['.txt', '.md'].includes(path.extname(filePath).toLocaleLowerCase())) {
    throw new Error('single-file sources must be .txt or .md files')
  }
}

export async function createSingleFileAdapter(
  selectedPath: string,
  languageTag: string
): Promise<SingleFileAdapter> {
  assertSupportedFile(selectedPath)
  const selectedRealPath = await realpath(selectedPath)
  const remoteWorkId = `file:${stablePathHash(selectedRealPath)}`

  const read = async () => {
    const currentRealPath = await realpath(selectedPath)
    if (currentRealPath !== selectedRealPath) throw new Error('selected file target changed')
    return contentIdentity(await readFile(currentRealPath))
  }

  return {
    manifest: manifest(languageTag),
    remoteWorkId,
    async identify(input, context) {
      context.signal.throwIfAborted()
      try {
        return (await realpath(input.value)) === selectedRealPath ? { remoteWorkId } : null
      } catch {
        return null
      }
    },
    async getWork(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId) throw new Error('unknown remote work')
      return {
        remoteWorkId,
        title: path.basename(selectedRealPath, path.extname(selectedRealPath)),
        languageTag
      }
    },
    async getCatalog(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId) throw new Error('unknown remote work')
      if (input.cursor !== undefined) throw new Error('single-file catalog has no cursor')
      const identity = await read()
      return {
        remoteWorkId,
        items: [
          {
            remoteChapterId: 'content',
            title: path.basename(selectedRealPath, path.extname(selectedRealPath)),
            order: 1,
            access: 'public',
            contentHash: identity.contentHash,
            payloadHash: identity.payloadHash,
            identityConfidence: 'stable'
          }
        ],
        exhausted: true,
        complete: true
      }
    },
    async getChapter(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId || input.remoteChapterId !== 'content') {
        throw new Error('unknown file chapter')
      }
      return { remoteChapterId: 'content', ...(await read()) }
    }
  }
}
