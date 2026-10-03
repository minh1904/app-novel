import {
  clearKeyFreeze,
  freezeKey,
  markKeyInvalid,
  readKeyCiphers,
  reSealKey
} from '../storage/connections'
import type { SecretStore } from '../storage/secretStore'
import type { Db } from '../storage/sqlite'
import { chooseKey, decideFreeze, earliestRecovery } from './keyPool'
import type { KeyExhausted, KeyLease, KeySource } from './openAiCompatible'

/**
 * Nối ba mảnh đã có thành nguồn khóa thật cho provider: kho khóa (`connections`), chính sách chọn
 * và đóng băng (`keyPool`), và việc mở khóa (`SecretStore`).
 *
 * Provider không biết gì về cơ sở dữ liệu; đây là chỗ duy nhất biết cả hai.
 */
export interface ConnectionKeySourceOptions {
  db: Db
  connectionId: string
  secrets: SecretStore
  now?: () => number
}

export function createConnectionKeySource(options: ConnectionKeySourceOptions): KeySource {
  const { db, connectionId, secrets } = options
  const now = options.now ?? Date.now

  return {
    async acquire(): Promise<KeyLease | KeyExhausted> {
      const keys = readKeyCiphers(db, connectionId)
      // Kết nối không khai khóa nào là hợp lệ: endpoint chạy trên máy người dùng.
      if (keys.length === 0) return { id: null, secret: null }

      const at = now()
      const chosen = chooseKey(keys, at)
      if (!chosen) return { exhausted: true, recoverAt: earliestRecovery(keys, at) }

      const opened = await secrets.open(chosen.cipher)
      // Hệ điều hành vừa xoay khóa: ghi lại ngay, nếu không lần sau vẫn nằm trên khóa cũ.
      if (opened.reSealed) reSealKey(db, chosen.id, opened.reSealed)
      return { id: chosen.id, secret: opened.value }
    },

    async report(keyId, outcome): Promise<void> {
      if (outcome === 'ok') {
        clearKeyFreeze(db, keyId)
        return
      }
      const current = readKeyCiphers(db, connectionId).find((key) => key.id === keyId)
      const decision = decideFreeze({
        error: outcome,
        strikes: current?.freezeStrikes ?? 0,
        now: now()
      })
      if (decision.invalid) {
        markKeyInvalid(db, keyId)
        return
      }
      // `until === null` ở đây nghĩa là lỗi không nằm ở khóa — để khóa yên.
      if (decision.until !== null) {
        freezeKey(db, keyId, decision.until, decision.scope, decision.strikes)
      }
    }
  }
}
