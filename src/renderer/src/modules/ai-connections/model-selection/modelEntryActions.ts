import type {
  AddModelEntriesInput,
  ModelEntryTestResult,
  UpdateModelEntryInput
} from '../../../../../shared/contracts/aiConnections'
import type { IpcError, Result } from '../../../../../shared/contracts/result'

/** What a model-entry action did: it worked, or the sentence to show beside the thing that was edited. */
export type EntryOutcome = { ok: true } | { ok: false; message: string }

/**
 * The words for a failed call. A validation failure carries the reason beside the field it is about, in
 * `details`; that reason is the useful one. Anything else falls back to the error's own sentence.
 */
export function messageOf(error: IpcError): string {
  return error.details?.[0]?.message ?? error.message
}

/**
 * Everything the model-entry screens can do. The settings screen and the dialogs are written against this
 * and not against `window.mira`, so they stay about drawing; `useConnections` is the one that talks to main.
 *
 * Every action that changes a connection returns the changed connection into the list it came from; the
 * caller only learns whether it worked.
 */
export interface ModelEntryActions {
  add(connectionId: string, items: AddModelEntriesInput['items']): Promise<EntryOutcome>
  /** `patch.settings` is a patch: a named field is replaced and `null` clears it. */
  update(entryId: string, patch: UpdateModelEntryInput['patch']): Promise<EntryOutcome>
  duplicate(entryId: string): Promise<EntryOutcome>
  remove(entryId: string): Promise<EntryOutcome>
  reorder(connectionId: string, ids: string[]): Promise<EntryOutcome>
  /** `null` leaves the connection with no default. */
  setDefault(connectionId: string, entryId: string | null): Promise<EntryOutcome>
  /** One small request with the entry's saved settings; costs a few tokens. */
  test(entryId: string): Promise<Result<ModelEntryTestResult>>
}
