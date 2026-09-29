/**
 * Runs as a separate process for the crash test: writes works as fast as it can and reports each
 * operation only after the store has returned, so the parent knows what was acknowledged before it
 * kills this process at a random moment.
 */
import { writeSync } from 'node:fs'
import { LibraryStore } from './library'
import { fakeJpegDataUrl } from './testCover'

const dataDir = process.argv[2]
if (!dataDir) throw new Error('usage: crashChild <dataDir>')

const store = LibraryStore.open({ dataDir })
const report = (line: string): void => void writeSync(1, line + '\n')
report('ready')

for (let n = 0; ; n++) {
  const work = store.create({
    title: 'Work ' + n + ' ' + Date.now(),
    sourceLang: 'en',
    cover: fakeJpegDataUrl(150_000, n % 250)
  })
  report(JSON.stringify({ op: 'created', id: work.id, title: work.title, n }))

  const renamed = store.update(work.id, { title: 'Renamed ' + n + ' ' + Date.now() })
  report(JSON.stringify({ op: 'renamed', id: work.id, title: renamed.title, n }))

  const paused = store.update(work.id, { status: 'paused' })
  report(JSON.stringify({ op: 'paused', id: work.id, status: paused.status, n }))
}
