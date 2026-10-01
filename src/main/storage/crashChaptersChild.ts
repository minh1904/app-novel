/**
 * Runs as a separate process for the chapter crash test: adds, renames, moves and deletes chapters
 * of one work as fast as it can. Each operation is reported only after the store has returned, so
 * the parent knows what was acknowledged before it kills this process at a random moment.
 */
import { writeSync } from 'node:fs'
import { LibraryStore } from './library'

const dataDir = process.argv[2]
if (!dataDir) throw new Error('usage: crashChaptersChild <dataDir>')

const store = LibraryStore.open({ dataDir })
const report = (line: string): void => void writeSync(1, line + '\n')
const work = store.list().works[0] ?? store.create({ title: 'Truyện thử', sourceLang: 'en' })
report(JSON.stringify({ op: 'work', id: work.id }))
report('ready')

for (let n = 0; ; n++) {
  const { chapter } = store.createChapter(work.id, 'Chương ' + n + ' ' + Date.now())
  report(JSON.stringify({ op: 'created', id: chapter.id, n }))

  const renamed = store.renameChapter(work.id, chapter.id, 'Đổi tên ' + n + ' ' + Date.now())
  report(JSON.stringify({ op: 'renamed', id: chapter.id, title: renamed.chapter.title, n }))

  store.moveChapter(work.id, chapter.id, 1 + (n % Math.max(1, renamed.work.chapterCount)))
  report(JSON.stringify({ op: 'moved', id: chapter.id, n }))

  if (n % 4 === 3) {
    store.deleteChapter(work.id, chapter.id)
    report(JSON.stringify({ op: 'deleted', id: chapter.id, n }))
  } else {
    store.openChapter(work.id, chapter.id)
    report(JSON.stringify({ op: 'opened', id: chapter.id, n }))
  }
}
