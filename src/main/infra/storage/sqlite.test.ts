import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openDatabase, type Db } from './sqlite'
import { createTempDirs } from '../../testing/testing'

const tempDir = createTempDirs()

function open(): Db {
  const db = openDatabase(join(tempDir(), 'test.db'))
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL)')
  return db
}

const count = (db: Db): number => db.prepare('SELECT count(*) AS n FROM t').get<{ n: number }>()!.n

describe('openDatabase', () => {
  it('enables WAL, full synchronous writes and foreign keys', () => {
    const db = open()
    expect(db.prepare('PRAGMA journal_mode').get<{ journal_mode: string }>()!.journal_mode).toBe(
      'wal'
    )
    expect(db.prepare('PRAGMA synchronous').get<{ synchronous: number }>()!.synchronous).toBe(2)
    expect(db.prepare('PRAGMA foreign_keys').get<{ foreign_keys: number }>()!.foreign_keys).toBe(1)
    db.close()
  })

  it('round-trips Vietnamese, CJK and emoji text exactly', () => {
    const db = open()
    const text = 'Tiên Hiệp — 玉庭記 · 初雪の駅 😀\r\nđường'
    db.prepare('INSERT INTO t (v) VALUES (?)').run(text)
    expect(db.prepare('SELECT v FROM t').get<{ v: string }>()!.v).toBe(text)
    db.close()
  })
})

describe('openDatabase on a file that is not a database', () => {
  it('throws and releases the file so it can be deleted', () => {
    const dir = tempDir()
    const path = join(dir, 'garbage.db')
    writeFileSync(path, 'this is not a database')
    expect(() => openDatabase(path)).toThrow()
    // On Windows a leaked handle makes this fail with EBUSY/EPERM.
    rmSync(path)
    expect(existsSync(path)).toBe(false)
  })
})

describe('transaction', () => {
  it('commits and returns the callback result', () => {
    const db = open()
    const result = db.transaction(() => {
      db.prepare('INSERT INTO t (v) VALUES (?)').run('a')
      return 42
    })
    expect(result).toBe(42)
    expect(count(db)).toBe(1)
    db.close()
  })

  it('rolls back everything when the callback throws and rethrows the original error', () => {
    const db = open()
    const boom = new Error('boom')
    expect(() =>
      db.transaction(() => {
        db.prepare('INSERT INTO t (v) VALUES (?)').run('a')
        throw boom
      })
    ).toThrow(boom)
    expect(count(db)).toBe(0)
    // The connection is still usable afterwards.
    db.transaction(() => db.prepare('INSERT INTO t (v) VALUES (?)').run('b'))
    expect(count(db)).toBe(1)
    db.close()
  })

  it('rolls back on a constraint violation', () => {
    const db = open()
    expect(() =>
      db.transaction(() => {
        db.prepare('INSERT INTO t (v) VALUES (?)').run('a')
        db.prepare('INSERT INTO t (v) VALUES (?)').run(null)
      })
    ).toThrow()
    expect(count(db)).toBe(0)
    db.close()
  })

  it('lets an inner failure roll back alone when the outer caller handles it', () => {
    const db = open()
    db.transaction(() => {
      db.prepare('INSERT INTO t (v) VALUES (?)').run('outer')
      try {
        db.transaction(() => {
          db.prepare('INSERT INTO t (v) VALUES (?)').run('inner')
          throw new Error('inner failed')
        })
      } catch {
        // handled: only the inner savepoint is undone
      }
    })
    const rows = db.prepare('SELECT v FROM t').all<{ v: string }>()
    expect(rows.map((r) => r.v)).toEqual(['outer'])
    db.close()
  })

  it('rolls back the outer transaction when an unhandled inner error propagates', () => {
    const db = open()
    expect(() =>
      db.transaction(() => {
        db.prepare('INSERT INTO t (v) VALUES (?)').run('outer')
        db.transaction(() => {
          throw new Error('inner failed')
        })
      })
    ).toThrow('inner failed')
    expect(count(db)).toBe(0)
    db.close()
  })

  it('rejects asynchronous callbacks and rolls back', () => {
    const db = open()
    expect(() =>
      db.transaction((() => {
        db.prepare('INSERT INTO t (v) VALUES (?)').run('a')
        return Promise.resolve(1)
      }) as unknown as () => number)
    ).toThrow(/synchronous/)
    expect(count(db)).toBe(0)
    db.close()
  })
})
