import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../testing/testing'
import { openDatabase } from '../infra/storage/sqlite'
import { workSchema } from '../infra/storage/workSchema'
import { migrate } from '../infra/storage/migrate'
import { SourceBindingService } from './bindingService'

const tempDir = createTempDirs()

describe('SourceBindingService', () => {
  function setupDb() {
    const dbPath = join(tempDir(), 'work.mira')
    const db = openDatabase(dbPath)
    migrate(db, workSchema)
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
      VALUES ('w1', 'Tác phẩm', 'zh-Hans', 1, 1);
    `)
    return db
  }

  it('supports multiple bindings for the same language and manages primary role exclusivity', () => {
    const db = setupDb()
    const service = new SourceBindingService()
    let idCounter = 1
    const newId = () => `b-${idCounter++}`

    // Create first binding (primary) for zh-Hans
    const b1 = service.createBinding(
      db,
      'w1',
      {
        workId: 'w1',
        sourceId: 'builtin.folder',
        remoteWorkId: 'qidian:123',
        languageTag: 'zh-Hans',
        label: 'Bản Qidian',
        role: 'primary'
      },
      1000,
      newId
    )

    // Create second binding (reference) also for zh-Hans
    const b2 = service.createBinding(
      db,
      'w1',
      {
        workId: 'w1',
        sourceId: 'builtin.single-file',
        remoteWorkId: 'file:raw.txt',
        languageTag: 'zh-Hans',
        label: 'Bản EPUB',
        role: 'reference'
      },
      1000,
      newId
    )

    expect(b1.role).toBe('primary')
    expect(b2.role).toBe('reference')

    const list = service.listBindings(db, 'w1')
    expect(list).toHaveLength(2)

    // Promote b2 to primary -> b1 becomes reference
    const updatedB2 = service.updateBinding(db, 'w1', b2.id, { role: 'primary' }, 2000)
    expect(updatedB2.role).toBe('primary')

    const updatedB1 = service.getBinding(db, 'w1', b1.id)
    expect(updatedB1?.role).toBe('reference')

    // Deleting b1 leaves b2 intact
    service.deleteBinding(db, 'w1', b1.id)
    const listAfterDelete = service.listBindings(db, 'w1')
    expect(listAfterDelete).toHaveLength(1)
    expect(listAfterDelete[0].id).toBe(b2.id)

    db.close()
  })
})
