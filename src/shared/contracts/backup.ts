import * as v from 'valibot'
import { idSchema } from './library'

/** Only the work travels from the renderer; the main process opens the dialogs and owns the paths. */
export const backupExportSchema = v.strictObject({ workId: idSchema })
export type BackupExportInput = v.InferInput<typeof backupExportSchema>

export interface BackupExported {
  /** Where the user saved it, for the confirmation message. */
  path: string
}
