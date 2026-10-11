import type {
  AddModelEntriesInput,
  ModelEntryTestResult,
  UpdateModelEntryInput
} from '../../../../../shared/contracts/aiConnections'
import type { IpcError, Result } from '../../../../../shared/contracts/result'

/** Kết quả thực hiện thao tác trên mục model: thành công, hoặc thông điệp lỗi để hiển thị. */
export type EntryOutcome = { ok: true } | { ok: false; message: string }

/**
 * Trích xuất thông điệp lỗi từ phản hồi IPC: ưu tiên thông báo chi tiết trong `details`,
 * nếu không có thì dùng thông điệp lỗi chung.
 */
export function messageOf(error: IpcError): string {
  return error.details?.[0]?.message ?? error.message
}

/**
 * Tập hợp các thao tác quản lý mục model mà giao diện có thể gọi.
 * Các màn hình và hộp thoại tương tác thông qua interface này thay vì gọi trực tiếp IPC.
 */
export interface ModelEntryActions {
  add(connectionId: string, items: AddModelEntriesInput['items']): Promise<EntryOutcome>
  /** Cập nhật mục model; truyền `null` để xóa giá trị của trường đó. */
  update(entryId: string, patch: UpdateModelEntryInput['patch']): Promise<EntryOutcome>
  duplicate(entryId: string): Promise<EntryOutcome>
  remove(entryId: string): Promise<EntryOutcome>
  reorder(connectionId: string, ids: string[]): Promise<EntryOutcome>
  /** Đặt mục mặc định; truyền `null` để bỏ chọn mặc định. */
  setDefault(connectionId: string, entryId: string | null): Promise<EntryOutcome>
  /** Gửi một yêu cầu kiểm tra nhỏ bằng cài đặt đã lưu của mục model này. */
  test(entryId: string): Promise<Result<ModelEntryTestResult>>
}
