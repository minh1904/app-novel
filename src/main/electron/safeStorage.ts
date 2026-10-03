import { safeStorage } from 'electron'
import type { DecryptResult, SecretCrypto } from '../infra/storage/secretStore'

/**
 * Bản thật của `SecretCrypto`, dùng `safeStorage` của Electron.
 *
 * Dùng **API không đồng bộ**: bản đồng bộ có thể bị bỏ trong một bản Electron sau, và bản async
 * cho biết hệ điều hành đã xoay khóa (`shouldReEncrypt`) để `SecretStore` mã hoá lại.
 *
 * Giới hạn phải nói với người dùng: trên Windows khóa sinh bằng DPAPI, nên nó chặn **người dùng
 * khác trên cùng máy**, không chặn ứng dụng khác chạy dưới cùng tài khoản.
 *
 * Tệp này import `electron` nên chỉ chạy trong main process; test dùng một `SecretCrypto` giả.
 */
export const electronSafeStorage: SecretCrypto = {
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  },

  async encrypt(plain: string): Promise<Uint8Array> {
    return new Uint8Array(await safeStorage.encryptStringAsync(plain))
  },

  async decrypt(cipher: Uint8Array): Promise<DecryptResult> {
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(cipher))
    return { value: result, shouldReEncrypt }
  }
}
