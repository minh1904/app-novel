import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { LibraryStore } from '../../../../../src/main/services/library/library'

const root = resolve('fixtures/private/lab')
const manifestPath = resolve(root, 'lab.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const novel = manifest.novels.n4696dd
const library = LibraryStore.open({ dataDir: manifest.dataDir })
const dir = resolve(root, 'experiments/addressing-v4')
mkdirSync(dir, { recursive: true })
try {
  const backup = resolve(dir, 't1-snapshot.mira')
  library.exportWork(novel.copies['v3-nothink+t1'], backup)
  for (const [label, title] of [
    ['v3-nothink+t1-full', 'Chị em dị giới (T1 đối chứng nguyên chương)'],
    ['v4-nothink', 'Chị em dị giới (v4 chọn xưng gọi trước khi dịch)']
  ]) {
    if (novel.copies[label]) throw new Error('Bản đã tồn tại: ' + label)
    const work = library.restoreWork(backup)
    library.update(work.id, { title })
    for (const chapter of library.listChapters(work.id)) {
      const target = library.readText(work.id, chapter.id, 'target')
      if (target.content) library.saveText(work.id, chapter.id, 'target', '', target.rev, [])
    }
    novel.copies[label] = work.id
    novel.names = { ...novel.names, [label]: title }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(label, work.id)
  }
} finally {
  library.close()
}
