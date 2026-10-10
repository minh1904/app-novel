import { readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import type { CatalogItem, NovelSourceAdapter, SourceManifest } from './domain'
import { contentIdentity, relativePathIdentity, stablePathHash } from './normalization'

export interface FolderAdapter extends NovelSourceAdapter {
  readonly remoteWorkId: string
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function manifest(languageTag: string): SourceManifest {
  return {
    manifestVersion: 1,
    sourceId: 'mira.folder',
    displayName: 'Folder',
    nativeNames: [],
    aliases: ['directory', 'local files'],
    domains: [],
    adapterVersion: '1.0.0',
    apiVersion: '1.0.0',
    dataVersion: 1,
    countryCode: 'ZZ',
    languageTags: [languageTag],
    capabilities: ['identify', 'work', 'catalog', 'chapter'],
    auth: 'none',
    origin: { kind: 'builtin' },
    limits: { maxPages: 1, pageSize: 10_000, timeoutMs: 30_000 },
    health: 'healthy'
  }
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

async function guardedFile(root: string, remoteChapterId: string): Promise<string> {
  const identity = relativePathIdentity(remoteChapterId)
  const candidate = path.resolve(root, ...identity.split('/'))
  if (!isInside(root, candidate)) throw new Error('source path is outside the selected root')
  const actual = await realpath(candidate)
  if (!isInside(root, actual)) throw new Error('source path resolves outside the selected root')
  return actual
}

async function scan(root: string, directory = root): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error('symbolic links are not allowed in source folders')
    if (entry.isDirectory()) {
      files.push(...(await scan(root, candidate)))
      continue
    }
    if (
      !entry.isFile() ||
      !['.txt', '.md'].includes(path.extname(entry.name).toLocaleLowerCase())
    ) {
      continue
    }
    const actual = await realpath(candidate)
    if (!isInside(root, actual)) throw new Error('source path resolves outside the selected root')
    files.push(relativePathIdentity(path.relative(root, actual)))
  }
  return files.sort(collator.compare)
}

export async function createFolderAdapter(
  selectedRoot: string,
  languageTag: string
): Promise<FolderAdapter> {
  const root = await realpath(selectedRoot)
  const remoteWorkId = `folder:${stablePathHash(root)}`

  return {
    manifest: manifest(languageTag),
    remoteWorkId,
    async identify(input, context) {
      context.signal.throwIfAborted()
      try {
        return (await realpath(input.value)) === root ? { remoteWorkId } : null
      } catch {
        return null
      }
    },
    async getWork(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId) throw new Error('unknown remote work')
      return { remoteWorkId, title: path.basename(root), languageTag }
    },
    async getCatalog(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId) throw new Error('unknown remote work')
      if (input.cursor !== undefined) throw new Error('folder catalog has no cursor')
      const chapterPaths = await scan(root)
      const items: CatalogItem[] = []
      for (const [index, remoteChapterId] of chapterPaths.entries()) {
        context.signal.throwIfAborted()
        const identity = contentIdentity(await readFile(await guardedFile(root, remoteChapterId)))
        items.push({
          remoteChapterId,
          title: path.basename(remoteChapterId, path.extname(remoteChapterId)),
          order: index + 1,
          access: 'public',
          contentHash: identity.contentHash,
          payloadHash: identity.payloadHash,
          identityConfidence: 'stable'
        })
      }
      return { remoteWorkId, items, exhausted: true, complete: true }
    },
    async getChapter(input, context) {
      context.signal.throwIfAborted()
      if (input.remoteWorkId !== remoteWorkId) throw new Error('unknown remote work')
      const remoteChapterId = relativePathIdentity(input.remoteChapterId)
      const identity = contentIdentity(await readFile(await guardedFile(root, remoteChapterId)))
      return { remoteChapterId, ...identity }
    }
  }
}
