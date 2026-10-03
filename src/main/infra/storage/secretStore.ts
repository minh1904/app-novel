import { StorageError } from './errors'

/**
 * Mã hoá khóa API trước khi ghi xuống đĩa, bằng kho khóa của hệ điều hành.
 *
 * Hai ràng buộc từ [ADR-004] và D2 của change `ai-connection`:
 * - Kho khóa **không khả dụng thì từ chối lưu**, không bao giờ ghi plaintext.
 * - Giá trị khóa **không rời main process** sau khi lưu; tầng giao diện chỉ nhận dạng che.
 *
 * Phần mã hoá được tiêm vào thay vì gọi thẳng `electron.safeStorage`, để test chạy được ngoài
 * Electron. Bản thật nằm ở `main/electron/safeStorage.ts`.
 */

export interface DecryptResult {
  value: string
  /** Hệ điều hành đã xoay khóa: nên mã hoá lại bằng khóa mới. */
  shouldReEncrypt: boolean
}

export interface SecretCrypto {
  isEncryptionAvailable(): boolean
  encrypt(plain: string): Promise<Uint8Array>
  decrypt(cipher: Uint8Array): Promise<DecryptResult>
}

/** Bốn ký tự cuối, đủ để người dùng nhận ra khóa nào mà không lộ khóa. */
export function maskSecret(secret: string): string {
  const trimmed = secret.trim()
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4)
}

export class SecretStore {
  constructor(private readonly crypto: SecretCrypto) {}

  available(): boolean {
    return this.crypto.isEncryptionAvailable()
  }

  /** Ném `StorageError('io')` khi kho khóa không dùng được, để người gọi báo đúng lý do. */
  async seal(secret: string): Promise<{ cipher: Uint8Array; tail: string }> {
    const value = secret.trim()
    if (value === '') throw new StorageError('validation', 'Khóa API không được để trống.')
    if (!this.crypto.isEncryptionAvailable()) {
      throw new StorageError(
        'io',
        'Hệ điều hành chưa cho dùng kho khóa an toàn, nên Mira không lưu khóa API. ' +
          'Khóa không được ghi ra đĩa dưới dạng văn bản thường.'
      )
    }
    return { cipher: await this.crypto.encrypt(value), tail: maskSecret(value) }
  }

  /**
   * Mở khóa để gọi nhà cung cấp. Khi hệ điều hành đã xoay khóa, trả kèm bản mã mới để người gọi
   * ghi đè — nếu bỏ qua thì lần sau vẫn đọc được, chỉ là vẫn nằm trên khóa cũ.
   */
  async open(cipher: Uint8Array): Promise<{ value: string; reSealed?: Uint8Array }> {
    if (!this.crypto.isEncryptionAvailable()) {
      throw new StorageError(
        'io',
        'Hệ điều hành chưa cho dùng kho khóa an toàn, nên Mira không đọc được khóa API đã lưu.'
      )
    }
    const { value, shouldReEncrypt } = await this.crypto.decrypt(cipher)
    if (!shouldReEncrypt) return { value }
    return { value, reSealed: await this.crypto.encrypt(value) }
  }
}
