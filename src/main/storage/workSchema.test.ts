import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrate, readPragmas } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { createTempDirs } from './testing'
import { WORK_APPLICATION_ID, workSchema } from './workSchema'

const tempDir = createTempDirs()

function fresh(): Db {
  const db = openDatabase(join(tempDir(), 'work.mira'))
  migrate(db, workSchema)
  db.exec(
    `INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('w', 'T', 'en', 1, 1);
     INSERT INTO chapter (id, position, created_at, updated_at) VALUES ('c', 0, 1, 1)`
  )
  return db
}

const thrown = (fn: () => unknown): boolean => {
  try {
    fn()
  } catch {
    return true
  }
  return false
}

describe('work schema', () => {
  it('stamps the Mira application id and the latest schema version', () => {
    const db = openDatabase(join(tempDir(), 'work.mira'))
    migrate(db, workSchema)
    expect(readPragmas(db)).toEqual({ userVersion: 5, applicationId: WORK_APPLICATION_ID })
    db.close()
  })

  it('allows exactly one work per file', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          "INSERT INTO work (id, title, source_lang, created_at, updated_at) VALUES ('x', 'U', 'en', 1, 1)"
        )
      )
    ).toBe(true)
    db.close()
  })

  it('enforces languages, statuses and a non-blank title', () => {
    const db = fresh()
    expect(thrown(() => db.exec("UPDATE work SET source_lang = 'fr'"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET status = 'done'"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET title = '   '"))).toBe(true)
    expect(thrown(() => db.exec("UPDATE work SET target_lang = 'en'"))).toBe(true)
    db.close()
  })

  it('cascades a chapter delete to its texts, segments and links', () => {
    const db = fresh()
    db.exec(
      `INSERT INTO chapter_text (chapter_id, side, updated_at) VALUES ('c', 'source', 1);
       INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
         VALUES ('s1', 'c', 'source', 0, 0, 5, 0);
       INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1);
       INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 's1')`
    )
    db.exec("DELETE FROM chapter WHERE id = 'c'")
    for (const table of ['chapter_text', 'segment', 'link', 'link_member']) {
      expect(db.prepare('SELECT count(*) AS n FROM ' + table).get<{ n: number }>()!.n).toBe(0)
    }
    db.close()
  })

  it('flags a link as needs_review instead of dropping it when a member segment is deleted', () => {
    const db = fresh()
    db.exec(
      `INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
         VALUES ('s1', 'c', 'source', 0, 0, 5, 0), ('t1', 'c', 'target', 0, 0, 4, 0);
       INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1);
       INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 's1'), ('l1', 't1');
       DELETE FROM segment WHERE id = 's1'`
    )
    const link = db.prepare("SELECT status FROM link WHERE id = 'l1'").get<{ status: string }>()
    expect(link?.status).toBe('needs_review')
    const members = db.prepare('SELECT segment_id FROM link_member').all<{ segment_id: string }>()
    expect(members.map((m) => m.segment_id)).toEqual(['t1'])
    db.close()
  })

  it('rejects an inverted segment range and a link to a missing segment', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          `INSERT INTO segment (id, chapter_id, side, position, start_offset, end_offset, text_rev)
           VALUES ('bad', 'c', 'source', 0, 5, 2, 0)`
        )
      )
    ).toBe(true)
    db.exec("INSERT INTO link (id, chapter_id, kind, created_at) VALUES ('l1', 'c', 'ai', 1)")
    expect(
      thrown(() => db.exec("INSERT INTO link_member (link_id, segment_id) VALUES ('l1', 'nope')"))
    ).toBe(true)
    db.close()
  })

  it('rejects an image with an unaccepted mime or empty bytes', () => {
    const db = fresh()
    expect(
      thrown(() =>
        db.exec(
          "INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/svg+xml', x'00', 1)"
        )
      )
    ).toBe(true)
    expect(
      thrown(() =>
        db.exec("INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/png', x'', 1)")
      )
    ).toBe(true)
    db.exec(
      "INSERT INTO image (id, mime, data, created_at) VALUES ('i1', 'image/png', x'89504e47', 1)"
    )
    expect(db.prepare('SELECT count(*) AS n FROM image').get<{ n: number }>()!.n).toBe(1)
    db.close()
  })

  it('keeps the work when its last chapter pointer is cleared by deleting that chapter', () => {
    const db = fresh()
    db.exec("UPDATE work SET last_chapter_id = 'c'")
    db.exec("DELETE FROM chapter WHERE id = 'c'")
    expect(
      db.prepare('SELECT last_chapter_id AS id FROM work').get<{ id: string | null }>()!.id
    ).toBeNull()
    db.close()
  })
})
