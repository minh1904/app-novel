/**
 * The two system dialogs backup needs. An interface so handlers can be tested without Electron;
 * the real one lives in ipc/library.ts. Paths come back from the user's choice and never from the
 * renderer.
 */
export interface FilePicker {
  /** Resolves to the chosen path, or null when the user cancels. */
  chooseSavePath(suggestedName: string): Promise<string | null>
  chooseOpenPath(): Promise<string | null>
}

/** Used when no picker is given: every dialog counts as cancelled. */
export const noFilePicker: FilePicker = {
  chooseSavePath: () => Promise.resolve(null),
  chooseOpenPath: () => Promise.resolve(null)
}
