import type { Db } from '../infra/storage/sqlite'
import { StorageError } from '../infra/storage/errors'
import {
  getCatalogItem,
  listCatalogItems,
  updateCatalogItem,
  type StoredCatalogItem
} from '../infra/storage/sourceStorage'

export class SourceCatalogService {
  list(db: Db, bindingId?: string): StoredCatalogItem[] {
    return listCatalogItems(db, bindingId)
  }

  get(db: Db, id: string): StoredCatalogItem | null {
    return getCatalogItem(db, id)
  }

  mapChapter(db: Db, catalogItemId: string, chapterId: string | null): StoredCatalogItem {
    const item = getCatalogItem(db, catalogItemId)
    if (!item) {
      throw new StorageError('not_found', `Catalog item ${catalogItemId} not found`)
    }

    if (chapterId) {
      const chapter = db.prepare('SELECT 1 FROM chapter WHERE id = ?').get<{ 1: number }>(chapterId)
      if (!chapter) {
        throw new StorageError('not_found', `Chapter ${chapterId} not found`)
      }
    }

    const updated: StoredCatalogItem = {
      ...item,
      chapterId
    }
    updateCatalogItem(db, updated)
    return updated
  }

  mapBatch(db: Db, mappings: Array<{ catalogItemId: string; chapterId: string | null }>): void {
    db.transaction(() => {
      for (const m of mappings) {
        this.mapChapter(db, m.catalogItemId, m.chapterId)
      }
    })
  }
}
