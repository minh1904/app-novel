import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { StorageError } from './errors'
import { migrate, readPragmas, type SchemaSpec } from './migrate'
import { openDatabase } from './sqlite'
import { createTempDirs } from './testing'

const tempDir = createTempDirs()
const APP_ID = 0x1234

function spec(overrides: Partial<SchemaSpec> = {}): SchemaSpec {
  return {
    applicationId: APP_ID,
    migrations: [
      {
        version: 1,
        up(db) {
          db.exec('CREATE TABLE a (id INTEGER PRIMARY KEY)')
          db.exec('PRAGMA application_id = ' + APP_ID)
        }
      },
      {
        version: 2,
        up(db) {
          db.exec('CREATE TABLE b (id INTEGER PRIMARY KEY)')
        }
      }
    ],
    ...overrides
  }
}

const tables = (db: ReturnType<typeof openDatabase>): string[] =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all<{ name: string }>()
    .map((row) => row.name)

describe('migrate', () => {
  it('upgrades a new file to the latest version', () => {
    const db = openDatabase(join(tempDir(), 'm.db'))
    migrate(db, spec())
    expect(readPragmas(db)).toEqual({ userVersion: 2, applicationId: APP_ID })
    expect(tables(db)).toEqual(['a', 'b'])
    db.close()
  })

  it('is a no-op when already current', () => {
    const db = openDatabase(join(tempDir(), 'm.db'))
    migrate(db, spec())
    migrate(db, spec())
    expect(readPragmas(db).userVersion).toBe(2)
    db.close()
  })

  it('upgrades an older file step by step and keeps its data', () => {
    const path = join(tempDir(), 'm.db')
    const old = openDatabase(path)
    migrate(old, spec({ migrations: spec().migrations.slice(0, 1) }))
    old.exec('INSERT INTO a (id) VALUES (7)')
    old.close()

    const db = openDatabase(path)
    migrate(db, spec())
    expect(readPragmas(db).userVersion).toBe(2)
    expect(db.prepare('SELECT id FROM a').get<{ id: number }>()!.id).toBe(7)
    db.close()
  })

  it('leaves the file at the previous version when a step fails', () => {
    const path = join(tempDir(), 'm.db')
    const db = openDatabase(path)
    const failing = spec()
    failing.migrations[1] = {
      version: 2,
      up(inner) {
        inner.exec('CREATE TABLE b (id INTEGER PRIMARY KEY)')
        inner.exec('INSERT INTO missing_table VALUES (1)')
      }
    }
    expect(() => migrate(db, failing)).toThrow()
    expect(readPragmas(db).userVersion).toBe(1)
    expect(tables(db)).toEqual(['a'])
    db.close()
  })

  it('refuses a file from a newer version without modifying it', () => {
    const path = join(tempDir(), 'm.db')
    const db = openDatabase(path)
    migrate(db, spec())
    db.exec('PRAGMA user_version = 9')
    let error: unknown
    try {
      migrate(db, spec())
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(StorageError)
    expect((error as StorageError).code).toBe('unsupported_version')
    expect(readPragmas(db).userVersion).toBe(9)
    db.close()
  })

  it('refuses a file that belongs to another application', () => {
    const db = openDatabase(join(tempDir(), 'm.db'))
    db.exec('PRAGMA application_id = 999')
    expect(() => migrate(db, spec())).toThrow(StorageError)
    expect(tables(db)).toEqual([])
    db.close()
  })
})
