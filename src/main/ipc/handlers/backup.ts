import { backupExportSchema } from '../../../shared/contracts/backup'
import { CHANNELS } from '../../../shared/contracts/channels'
import { StorageError } from '../../infra/storage/errors'
import { backupFileName } from '../../infra/storage/backupName'
import { createAsyncHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

/** Sao lưu và khôi phục một tác phẩm. Đường dẫn do hộp thoại của main chọn, không đến từ renderer. */
export function backupHandlers({ library, files }: HandlerDeps): AreaHandlers<'backup'> {
  return {
    [CHANNELS.backupExport]: createAsyncHandler(backupExportSchema, async ({ workId }) => {
      const work = library.get(workId)
      const chosen = await files.chooseSavePath(backupFileName(work.title, new Date()))
      if (chosen === null) throw new StorageError('cancelled', 'Đã hủy.')
      const path = /\.mira$/i.test(chosen) ? chosen : chosen + '.mira'
      library.exportWork(workId, path)
      return { path }
    }),
    [CHANNELS.backupRestore]: createAsyncHandler(null, async () => {
      const chosen = await files.chooseOpenPath()
      if (chosen === null) throw new StorageError('cancelled', 'Đã hủy.')
      return library.restoreWork(chosen)
    })
  }
}
