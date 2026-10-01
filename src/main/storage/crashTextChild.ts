/**
 * Runs as a separate process for the text crash test: saves one chapter's text and segments as fast
 * as it can. The text for a revision is a pure function of that revision, so the parent can check
 * after a kill that whatever revision survived is whole. A save is reported only after the store
 * has returned.
 */
import { writeSync } from 'node:fs'
import { LibraryStore } from './library'
import { textForRevision } from './crashTextShared'

const dataDir = process.argv[2]
if (!dataDir) throw new Error('usage: crashTextChild <dataDir>')

const store = LibraryStore.open({ dataDir })
const report = (line: string): void => void writeSync(1, line + '\n')

const work = store.list().works[0] ?? store.create({ title: 'Truyện thử', sourceLang: 'ja' })
const chapter = store.listChapters(work.id)[0] ?? store.createChapter(work.id, 'Chương thử').chapter
report(JSON.stringify({ op: 'ref', workId: work.id, chapterId: chapter.id }))
report('ready')

let rev = store.readText(work.id, chapter.id, 'source').rev
for (;;) {
  const next = textForRevision(rev + 1)
  const saved = store.saveText(work.id, chapter.id, 'source', next.content, rev, next.segments)
  rev = saved.rev
  report(JSON.stringify({ op: 'saved', rev }))
}
