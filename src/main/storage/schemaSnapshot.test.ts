import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LIBRARY_APPLICATION_ID, librarySchema } from './librarySchema'
import { migrate } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { createTempDirs } from './testing'
import { WORK_APPLICATION_ID, workSchema } from './workSchema'

/**
 * Freezes schema version 1 of both files. Released versions must never be edited: changes go in a
 * new migration, and this test fails if migration 1 drifts. To accept an intentional change before
 * any release, regenerate with `MIRA_UPDATE_SNAPSHOTS=1 pnpm test`.
 */
const tempDir = createTempDirs()
const fixtures = join(__dirname, '__fixtures__')

function dumpSchema(db: Db): string {
  const rows = db
    .prepare('SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name')
    .all<{ type: string; name: string; sql: string }>()
  return (
    rows.map((row) => '-- ' + row.type + ' ' + row.name + '\n' + row.sql + ';').join('\n\n') + '\n'
  )
}

function check(name: string, db: Db): void {
  const path = join(fixtures, name)
  const actual = dumpSchema(db)
  if (process.env.MIRA_UPDATE_SNAPSHOTS === '1') writeFileSync(path, actual, 'utf-8')
  expect(actual).toBe(readFileSync(path, 'utf-8'))
}

describe('schema version 1 is frozen', () => {
  it('work file schema matches the snapshot and application id', () => {
    const db = openDatabase(join(tempDir(), 'work.mira'))
    migrate(db, workSchema)
    check('work-v1.schema.sql', db)
    expect(WORK_APPLICATION_ID).toBe(0x4d495241)
    db.close()
  })

  it('library index schema matches the snapshot and application id', () => {
    const db = openDatabase(join(tempDir(), 'library.db'))
    migrate(db, librarySchema)
    check('library-v1.schema.sql', db)
    expect(LIBRARY_APPLICATION_ID).toBe(0x4d49524c)
    db.close()
  })
})
