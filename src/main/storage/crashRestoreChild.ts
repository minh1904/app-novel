/**
 * Runs as a separate process for the restore crash test: restores the same backup over and over,
 * reporting each work only after the store has returned, so the parent can kill it at a random
 * moment and check that every restore is whole or absent.
 */
import { writeSync } from 'node:fs'
import { LibraryStore } from './library'

const dataDir = process.argv[2]
const backup = process.argv[3]
if (!dataDir || !backup) throw new Error('usage: crashRestoreChild <dataDir> <backup>')

const store = LibraryStore.open({ dataDir })
const report = (line: string): void => void writeSync(1, line + '\n')
report('ready')

for (let n = 0; ; n++) {
  const restored = store.restoreWork(backup)
  report(JSON.stringify({ op: 'restored', id: restored.id, n }))
}
