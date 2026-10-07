import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import type { MainModel } from '../../../../shared/contracts/aiPreferences'

export interface ModelChoice {
  connectionId: string
  entryId: string
  /** Where the choice came from: picked for this chat or dialog, the main model, or the old default. */
  source: 'picked' | 'main' | 'default'
}

function usable(connections: readonly ConnectionView[]): ConnectionView[] {
  return connections.filter((connection) => connection.enabled && connection.models.length > 0)
}

function has(
  connections: readonly ConnectionView[],
  connectionId: string,
  entryId: string
): boolean {
  return connections.some(
    (connection) =>
      connection.id === connectionId && connection.models.some((entry) => entry.id === entryId)
  )
}

/**
 * Which model a chat turn or a translation uses (spec `model-defaults`, design D6 of change
 * `hermes-settings-modal`): what was picked for it, else the main model of Settings, else the default entry
 * of the first enabled connection that has one, as before there was a main model. A pick or a main model that
 * points at a disabled connection or a deleted entry is passed over.
 */
export function resolveModelChoice(
  connections: readonly ConnectionView[],
  picked: { connectionId: string | null; entryId: string | null },
  main: MainModel | null
): ModelChoice | null {
  const live = usable(connections)
  if (picked.connectionId && picked.entryId && has(live, picked.connectionId, picked.entryId)) {
    return { connectionId: picked.connectionId, entryId: picked.entryId, source: 'picked' }
  }
  if (main && has(live, main.connectionId, main.entryId)) {
    return { connectionId: main.connectionId, entryId: main.entryId, source: 'main' }
  }
  // A connection picked without an entry keeps its own default.
  const first =
    (picked.connectionId && live.find((connection) => connection.id === picked.connectionId)) ||
    live[0]
  if (!first) return null
  const entry = first.models.find((item) => item.id === first.defaultEntryId) ?? first.models[0]!
  return { connectionId: first.id, entryId: entry.id, source: 'default' }
}
