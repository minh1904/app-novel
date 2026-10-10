import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { ModelEntryView, ThinkingLevel } from '../../../../../shared/contracts/modelSettings'

/**
 * The rows of the model menu (spec `model-picker`): a Favorites group first, then one group per enabled
 * connection that has entries, filtered by the search box. Pure, so the order and the filter are tested
 * without a DOM.
 */

export type MenuRow =
  | { type: 'header'; id: string; label: string; collapsed: boolean; connectionId: string | null }
  | {
      type: 'model'
      /** `fav:` or `conn:` prefix + connection + entry, unique across groups. */
      id: string
      connection: ConnectionView
      entry: ModelEntryView
      favorite: boolean
    }

export const favoriteKey = (connectionId: string, entryId: string): string =>
  connectionId + ':' + entryId

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function matches(query: string, connection: ConnectionView, entry: ModelEntryView): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fold(entry.name + ' ' + entry.model + ' ' + connection.name)
  return words.every((word) => haystack.includes(word))
}

export function buildMenuRows(
  connections: readonly ConnectionView[],
  query: string,
  favorites: ReadonlySet<string>,
  collapsed: ReadonlySet<string>
): MenuRow[] {
  const live = connections.filter(
    (connection) => connection.enabled && connection.models.length > 0
  )
  const searching = query.trim() !== ''
  const rows: MenuRow[] = []

  const favoriteRows: MenuRow[] = []
  for (const connection of live) {
    for (const entry of connection.models) {
      const key = favoriteKey(connection.id, entry.id)
      if (favorites.has(key) && matches(query, connection, entry)) {
        favoriteRows.push({ type: 'model', id: 'fav:' + key, connection, entry, favorite: true })
      }
    }
  }
  if (favoriteRows.length > 0) {
    rows.push({
      type: 'header',
      id: 'group:favorites',
      label: 'Yêu thích',
      collapsed: false,
      connectionId: null
    })
    rows.push(...favoriteRows)
  }

  for (const connection of live) {
    const entries = connection.models.filter((entry) => matches(query, connection, entry))
    if (entries.length === 0) continue
    // A search always shows what it found, even in a group the person folded away.
    const isCollapsed = !searching && collapsed.has(connection.id)
    rows.push({
      type: 'header',
      id: 'group:' + connection.id,
      label: connection.name,
      collapsed: isCollapsed,
      connectionId: connection.id
    })
    if (isCollapsed) continue
    for (const entry of entries) {
      const key = favoriteKey(connection.id, entry.id)
      rows.push({
        type: 'model',
        id: 'conn:' + key,
        connection,
        entry,
        favorite: favorites.has(key)
      })
    }
  }
  return rows
}

/** The short tag a row shows for the thinking level set on its entry, as in Hermes ("MED"). */
export const THINKING_TAGS: Record<ThinkingLevel, string> = {
  off: 'TẮT',
  minimal: 'MIN',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  xhigh: 'XHIGH',
  max: 'MAX'
}

/** The next model row from `index` in `direction`, skipping headers; stays put at either end. */
export function stepModelRow(rows: readonly MenuRow[], index: number, direction: 1 | -1): number {
  for (let at = index + direction; at >= 0 && at < rows.length; at += direction) {
    if (rows[at]!.type === 'model') return at
  }
  return index
}
