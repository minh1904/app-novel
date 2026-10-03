import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { textForRevision } from './crashTextShared'
import { LibraryStore } from './library'
import { openDatabase } from '../../infra/storage/sqlite'
import { fakeJpegDataUrl } from '../../testing/testCover'
import { createTempDirs } from '../../testing/testing'

/**
 * Kills a process that is writing works at a random moment and checks that what was acknowledged
 * survived and nothing half-written is visible. This covers process death, not power loss.
 */
const tempDir = createTempDirs()

interface Ack {
  op: 'created' | 'renamed' | 'paused'
  id: string
  title?: string
  status?: string
  n: number
}

function bundleChild(outDir: string): string {
  const outfile = join(outDir, 'crashChild.mjs')
  buildSync({
    entryPoints: [join(__dirname, 'crashChild.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  })
  return outfile
}

/** Starts the writer, lets it run for `runMs`, then kills it hard and returns what it acknowledged. */
function runAndKill(
  script: string,
  dataDir: string,
  runMs: number,
  extraArgs: string[] = []
): Promise<Ack[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, dataDir, ...extraArgs], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    let ready = false
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf-8')
      if (!ready && output.includes('ready')) {
        ready = true
        setTimeout(() => child.kill('SIGKILL'), runMs)
      }
    })
    child.on('error', reject)
    child.on('exit', () => {
      const acks = output
        .split('\n')
        .filter((line) => line.startsWith('{') && line.endsWith('}'))
        .map((line) => JSON.parse(line) as Ack)
      resolve(acks)
    })
  })
}

function integrityOk(path: string): boolean {
  const db = openDatabase(path)
  try {
    const rows = db.prepare('PRAGMA integrity_check').all<{ integrity_check: string }>()
    return rows.length === 1 && rows[0].integrity_check === 'ok'
  } finally {
    db.close()
  }
}

interface ChapterAck {
  op: 'work' | 'created' | 'renamed' | 'moved' | 'opened' | 'deleting' | 'deleted'
  id: string
  title?: string
}

function bundleChaptersChild(outDir: string): string {
  const outfile = join(outDir, 'crashChaptersChild.mjs')
  buildSync({
    entryPoints: [join(__dirname, 'crashChaptersChild.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  })
  return outfile
}

describe('killing the process while it edits chapters', () => {
  it('keeps acknowledged chapters and a gapless order', async () => {
    const dataDir = tempDir()
    const script = bundleChaptersChild(tempDir())
    const acks: ChapterAck[] = []

    for (const runMs of [80, 200, 350, 500, 700]) {
      acks.push(...((await runAndKill(script, dataDir, runMs)) as unknown as ChapterAck[]))

      const workId = acks.find((ack) => ack.op === 'work')?.id
      expect(workId).toBeDefined()
      if (!workId) continue

      const store = LibraryStore.open({ dataDir })
      try {
        expect(store.list().problems).toEqual([])
        const chapters = store.listChapters(workId)
        expect(chapters.map((c) => c.number)).toEqual(chapters.map((_, i) => i + 1))

        const present = new Map(chapters.map((c) => [c.id, c]))
        // A deletion that was started may or may not have committed when the kill landed, so a
        // chapter whose deletion began is allowed to be gone. Every other acknowledged chapter
        // still has to be there.
        const mayBeGone = new Set(
          acks.filter((a) => a.op === 'deleting' || a.op === 'deleted').map((a) => a.id)
        )
        for (const ack of acks) {
          if (ack.op === 'created' && !mayBeGone.has(ack.id)) {
            expect(present.has(ack.id), 'acknowledged chapter missing after a kill').toBe(true)
          }
          if (ack.op === 'renamed' && !mayBeGone.has(ack.id)) {
            expect(present.get(ack.id)?.title).toBe(ack.title)
          }
          if (ack.op === 'deleted') expect(present.has(ack.id)).toBe(false)
        }

        // The index must agree with the work file, even if the kill landed between the two.
        expect(store.list().works[0]).toEqual(store.get(workId))
      } finally {
        store.close()
      }

      for (const name of readdirSync(join(dataDir, 'works'))) {
        if (name.endsWith('.mira')) expect(integrityOk(join(dataDir, 'works', name))).toBe(true)
      }
    }

    expect(acks.filter((a) => a.op === 'created').length).toBeGreaterThan(5)
  }, 90_000)
})

interface TextAck {
  op: 'ref' | 'saved'
  workId?: string
  chapterId?: string
  rev?: number
}

function bundleTextChild(outDir: string): string {
  const outfile = join(outDir, 'crashTextChild.mjs')
  buildSync({
    entryPoints: [join(__dirname, 'crashTextChild.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  })
  return outfile
}

describe('killing the process while it saves chapter text', () => {
  it('leaves the text and its segments at one whole revision', async () => {
    const dataDir = tempDir()
    const script = bundleTextChild(tempDir())
    const acks: TextAck[] = []

    for (const runMs of [80, 200, 350, 500, 700]) {
      acks.push(...((await runAndKill(script, dataDir, runMs)) as unknown as TextAck[]))

      const ref = acks.find((ack) => ack.op === 'ref')
      expect(ref?.workId).toBeDefined()
      if (!ref?.workId || !ref.chapterId) continue
      const acknowledged = Math.max(
        0,
        ...acks.filter((a) => a.op === 'saved').map((a) => a.rev ?? 0)
      )

      const store = LibraryStore.open({ dataDir })
      try {
        expect(store.list().problems).toEqual([])
        const text = store.readText(ref.workId, ref.chapterId, 'source')

        // Nothing acknowledged may be lost, and one unacknowledged save may have landed.
        expect(text.rev).toBeGreaterThanOrEqual(acknowledged)
        if (text.rev > 0) {
          // Whatever revision survived is whole: its exact text, and segments of that revision.
          const expected = textForRevision(text.rev)
          expect(text.content).toBe(expected.content)
          expect(text.segments.map((seg) => ({ start: seg.start, end: seg.end }))).toEqual(
            expected.segments
          )
          expect(text.segments.every((seg) => seg.textRev === text.rev)).toBe(true)
        } else {
          expect(text.segments).toEqual([])
        }
      } finally {
        store.close()
      }

      for (const name of readdirSync(join(dataDir, 'works'))) {
        if (name.endsWith('.mira')) expect(integrityOk(join(dataDir, 'works', name))).toBe(true)
      }
    }

    expect(acks.filter((a) => a.op === 'saved').length).toBeGreaterThan(5)
  }, 90_000)
})

describe('killing the process while it restores a backup', () => {
  it('leaves every restored work whole and no half-finished one', async () => {
    const source = LibraryStore.open({ dataDir: tempDir() })
    const work = source.create({
      title: 'Nguồn',
      sourceLang: 'en',
      cover: fakeJpegDataUrl(150_000, 3)
    })
    for (let i = 0; i < 40; i++) source.createChapter(work.id, 'Chương ' + i)
    const backup = join(tempDir(), 'sao-luu.mira')
    source.exportWork(work.id, backup)
    source.close()

    const dataDir = tempDir()
    const outDir = tempDir()
    const outfile = join(outDir, 'crashRestoreChild.mjs')
    buildSync({
      entryPoints: [join(__dirname, 'crashRestoreChild.ts')],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      logLevel: 'silent'
    })

    const acked: string[] = []
    for (const runMs of [100, 250, 400, 600]) {
      const acks = (await runAndKill(outfile, dataDir, runMs, [backup])) as unknown as Array<{
        op: string
        id: string
      }>
      acked.push(...acks.filter((a) => a.op === 'restored').map((a) => a.id))

      const store = LibraryStore.open({ dataDir })
      try {
        const { works, problems } = store.list()
        expect(problems).toEqual([])
        const ids = new Set(works.map((w) => w.id))
        for (const id of acked)
          expect(ids.has(id), 'restored work ' + id + ' is missing').toBe(true)
        for (const w of works) {
          expect(w.title).toBe('Nguồn')
          expect(w.chapterCount).toBe(40)
          expect(store.getCover(w.id)).toBe(fakeJpegDataUrl(150_000, 3))
        }
      } finally {
        store.close()
      }

      for (const name of readdirSync(join(dataDir, 'works'))) {
        if (name.endsWith('.mira')) expect(integrityOk(join(dataDir, 'works', name))).toBe(true)
      }
      expect(readdirSync(join(dataDir, 'works', '.tmp'))).toEqual([])
    }

    expect(acked.length).toBeGreaterThan(3)
  }, 120_000)
})

describe('killing the process while it writes', () => {
  it('keeps every acknowledged change and never exposes a half-written work', async () => {
    const dataDir = tempDir()
    const script = bundleChild(tempDir())
    const acknowledged: Ack[] = []

    // Several rounds against the same data directory, each killed at a different moment.
    for (const runMs of [60, 150, 260, 380, 520, 700]) {
      acknowledged.push(...(await runAndKill(script, dataDir, runMs)))

      const store = LibraryStore.open({ dataDir })
      try {
        const { works, problems } = store.list()
        expect(problems).toEqual([])
        const byId = new Map(works.map((work) => [work.id, work]))

        for (const ack of acknowledged) {
          const work = byId.get(ack.id)
          expect(work, 'acknowledged work ' + ack.id + ' is missing after a kill').toBeDefined()
          if (!work) continue
          if (ack.op === 'renamed') expect(work.title).toBe(ack.title)
          if (ack.op === 'paused') expect(work.status).toBe('paused')
        }

        for (const work of works) {
          // A work is only ever in one of the states the writer can produce.
          expect(work.title).toMatch(/^(Work|Renamed) \d+ \d+$/)
          // The cover was written with the work, so it must be whole whenever the work exists.
          const n = Number(work.title.split(' ')[1])
          expect(store.getCover(work.id)).toBe(fakeJpegDataUrl(150_000, n % 250))
        }
      } finally {
        store.close()
      }

      expect(integrityOk(join(dataDir, 'library.db'))).toBe(true)
      for (const name of readdirSync(join(dataDir, 'works'))) {
        if (name.endsWith('.mira')) expect(integrityOk(join(dataDir, 'works', name))).toBe(true)
      }
      // Partial files from an interrupted create are cleaned on the next start.
      expect(existsSync(join(dataDir, 'works', '.tmp'))).toBe(true)
      expect(readdirSync(join(dataDir, 'works', '.tmp'))).toEqual([])
    }

    // The test only means something if the writer actually got work done before each kill.
    expect(acknowledged.filter((ack) => ack.op === 'created').length).toBeGreaterThan(5)
  }, 90_000)
})
