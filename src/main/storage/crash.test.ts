import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { LibraryStore } from './library'
import { openDatabase } from './sqlite'
import { fakeJpegDataUrl } from './testCover'
import { createTempDirs } from './testing'

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
function runAndKill(script: string, dataDir: string, runMs: number): Promise<Ack[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, dataDir], { stdio: ['ignore', 'pipe', 'pipe'] })
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
  op: 'work' | 'created' | 'renamed' | 'moved' | 'opened' | 'deleted'
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
        const deleted = new Set(acks.filter((a) => a.op === 'deleted').map((a) => a.id))
        for (const ack of acks) {
          if (ack.op === 'created' && !deleted.has(ack.id)) {
            expect(present.has(ack.id), 'acknowledged chapter missing after a kill').toBe(true)
          }
          if (ack.op === 'renamed' && !deleted.has(ack.id)) {
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
