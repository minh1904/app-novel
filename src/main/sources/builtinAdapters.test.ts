import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFolderAdapter } from './folderAdapter'
import { createSingleFileAdapter } from './singleFileAdapter'

const cleanupRoots: string[] = []

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'mira-source-'))
  cleanupRoots.push(root)
  return root
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(
    cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('single-file adapter', () => {
  it('keeps identity across content edits while changing the revision hash', async () => {
    const root = await tempRoot()
    const selected = path.join(root, 'story.md')
    await writeFile(selected, 'A\r\nB')
    const adapter = await createSingleFileAdapter(selected, 'en')
    const identified = await adapter.identify!({ value: selected }, context())
    const firstCatalog = await adapter.getCatalog!(
      { remoteWorkId: identified!.remoteWorkId },
      context()
    )
    const first = await adapter.getChapter!(
      { remoteWorkId: identified!.remoteWorkId, remoteChapterId: 'content' },
      context()
    )

    await writeFile(selected, 'A\nchanged')
    const secondCatalog = await adapter.getCatalog!(
      { remoteWorkId: identified!.remoteWorkId },
      context()
    )
    const second = await adapter.getChapter!(
      { remoteWorkId: identified!.remoteWorkId, remoteChapterId: 'content' },
      context()
    )

    expect(firstCatalog.items[0].remoteChapterId).toBe('content')
    expect(secondCatalog.items[0].remoteChapterId).toBe('content')
    expect(first.contentHash).not.toBe(second.contentHash)
    expect(first.text).toBe('A\nB')
  })

  it('accepts an empty txt file and rejects another path or unsupported extension', async () => {
    const root = await tempRoot()
    const selected = path.join(root, 'empty.txt')
    const outside = path.join(root, 'other.txt')
    await writeFile(selected, '')
    await writeFile(outside, 'not selected')
    const adapter = await createSingleFileAdapter(selected, 'en')
    expect(
      (
        await adapter.getChapter!(
          { remoteWorkId: adapter.remoteWorkId, remoteChapterId: 'content' },
          context()
        )
      ).text
    ).toBe('')
    await expect(adapter.identify!({ value: outside }, context())).resolves.toBeNull()
    await expect(createSingleFileAdapter(path.join(root, 'bad.html'), 'en')).rejects.toThrow(
      /txt.*md/
    )
  })
})

describe('folder adapter', () => {
  it('scans supported files recursively in deterministic numeric order', async () => {
    const root = await tempRoot()
    await mkdir(path.join(root, 'volume'))
    await writeFile(path.join(root, 'chapter 10.txt'), 'ten')
    await writeFile(path.join(root, 'chapter 2.md'), 'two')
    await writeFile(path.join(root, 'volume', 'chapter 3.txt'), 'three')
    await writeFile(path.join(root, 'ignored.html'), 'no')
    const adapter = await createFolderAdapter(root, 'en')
    const page = await adapter.getCatalog!({ remoteWorkId: adapter.remoteWorkId }, context())

    expect(page.items.map((item) => item.remoteChapterId)).toEqual([
      'chapter 2.md',
      'chapter 10.txt',
      'volume/chapter 3.txt'
    ])
  })

  it('keeps path identities stable and reports added, removed and edited files on rescans', async () => {
    const root = await tempRoot()
    await writeFile(path.join(root, '1.txt'), 'one')
    await writeFile(path.join(root, '2.txt'), 'two')
    const adapter = await createFolderAdapter(root, 'en')
    const before = await adapter.getCatalog!({ remoteWorkId: adapter.remoteWorkId }, context())
    const { rm } = await import('node:fs/promises')
    await rm(path.join(root, '1.txt'))
    await writeFile(path.join(root, '2.txt'), 'two edited')
    await writeFile(path.join(root, '3.txt'), 'three')
    const after = await adapter.getCatalog!({ remoteWorkId: adapter.remoteWorkId }, context())

    expect(before.items.map((item) => item.remoteChapterId)).toEqual(['1.txt', '2.txt'])
    expect(after.items.map((item) => item.remoteChapterId)).toEqual(['2.txt', '3.txt'])
    expect(before.items[1].contentHash).not.toBe(after.items[0].contentHash)
  })

  it('rejects traversal and symlinks that could leave the selected root', async () => {
    const root = await tempRoot()
    const outsideRoot = await tempRoot()
    await writeFile(path.join(root, 'inside.txt'), 'inside')
    const outside = path.join(outsideRoot, 'outside.txt')
    await writeFile(outside, 'outside')
    const adapter = await createFolderAdapter(root, 'en')

    await expect(
      adapter.getChapter!(
        { remoteWorkId: adapter.remoteWorkId, remoteChapterId: '../outside.txt' },
        context()
      )
    ).rejects.toThrow(/outside/)

    try {
      await symlink(outside, path.join(root, 'linked.txt'))
      await expect(
        adapter.getCatalog!({ remoteWorkId: adapter.remoteWorkId }, context())
      ).rejects.toThrow(/symbolic link/)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error
    }
  })
})

function context() {
  return { signal: new AbortController().signal, now: () => new Date(0) }
}
