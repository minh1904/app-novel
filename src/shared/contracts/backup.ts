import * as v from 'valibot'
import { idSchema } from './library'

/** Renderer chỉ gửi ID tác phẩm; main process quản lý đường dẫn và mở hộp thoại. */
export const backupExportSchema = v.strictObject({ workId: idSchema })
export type BackupExportInput = v.InferInput<typeof backupExportSchema>

export interface BackupExported {
  /** Đường dẫn tệp sao lưu đã lưu để hiển thị thông báo xác nhận. */
  path: string
}
