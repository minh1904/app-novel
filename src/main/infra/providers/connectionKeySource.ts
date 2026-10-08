import {
  clearKeyFreeze,
  freezeKey,
  markKeyInvalid,
  readKeyCiphers,
  reSealKey,
  type KeyCipher
} from '../storage/connections'
import type { SecretStore } from '../storage/secretStore'
import type { Db } from '../storage/sqlite'
import { KeyScheduler, type KeyEffect, type KeyRecord, type Lease } from './gateway/keyScheduler'
import type { KeyExhausted, KeyLease, KeySource } from './gateway/keys'

/**
 * Nối ba mảnh đã có thành nguồn khóa thật cho provider: kho khóa (`connections`), chính sách chọn
 * và đóng băng (`keyPool` + `KeyScheduler`), và việc mở khóa (`SecretStore`).
 *
 * Provider không biết gì về cơ sở dữ liệu; đây là chỗ duy nhất biết cả hai. `KeyScheduler` giữ phần
 * **trong bộ nhớ** (bộ đếm lượt, lượt thăm dò); hạn đóng băng vẫn nằm ở DB. Vì phần trong bộ nhớ chỉ
 * có nghĩa khi **cùng một thể hiện** thấy mọi lượt của một kết nối, thể hiện này phải sống lâu hơn một
 * lời gọi: truyền `scheduler` vào từ nơi giữ nó (`GatewayRegistry`).
 */
export interface ConnectionKeySourceOptions {
  db: Db
  connectionId: string
  secrets: SecretStore
  now?: () => number
  /** Thiếu thì dựng mới, đúng cho test và cho một lời gọi lẻ; nhiều lượt song song phải dùng chung một cái. */
  scheduler?: KeyScheduler
}

function toRecord(row: KeyCipher): KeyRecord {
  return {
    id: row.id,
    state: row.state,
    frozenUntil: row.frozenUntil,
    frozenScope: row.frozenScope,
    freezeStrikes: row.freezeStrikes
  }
}

export function createConnectionKeySource(options: ConnectionKeySourceOptions): KeySource {
  const { db, connectionId, secrets } = options
  const now = options.now ?? Date.now
  const scheduler = options.scheduler ?? new KeyScheduler(now)
  // Lease mà provider cầm chỉ có `id` và `secret`; phần bộ lập lịch cần (epoch, có phải thăm dò không)
  // ở bên này, để kiểu `KeyLease` không phải biết và các nguồn khóa giả trong test vẫn viết được.
  const issued = new WeakMap<KeyLease, Lease>()

  function apply(keyId: string, effect: KeyEffect): void {
    if (effect.kind === 'clear') clearKeyFreeze(db, keyId)
    else if (effect.kind === 'invalid') markKeyInvalid(db, keyId)
    else if (effect.kind === 'freeze')
      freezeKey(db, keyId, effect.until, effect.scope, effect.strikes)
  }

  return {
    async acquire(): Promise<KeyLease | KeyExhausted> {
      const rows = readKeyCiphers(db, connectionId)
      // Kết nối không khai khóa nào là hợp lệ: endpoint chạy trên máy người dùng.
      if (rows.length === 0) return { id: null, secret: null }

      const picked = scheduler.pick(rows.map(toRecord))
      if ('exhausted' in picked) return { exhausted: true, recoverAt: picked.recoverAt }

      const row = rows.find((candidate) => candidate.id === picked.lease.keyId) as KeyCipher
      let opened: Awaited<ReturnType<typeof secrets.open>>
      try {
        opened = await secrets.open(row.cipher)
      } catch (error) {
        // Chưa gọi gì mà đã giữ chỗ thăm dò: trả lại, nếu không khóa này kẹt "đang thăm dò" mãi.
        scheduler.settle(picked.lease, 'neutral', undefined)
        throw error
      }
      // Hệ điều hành vừa xoay khóa: ghi lại ngay, nếu không lần sau vẫn nằm trên khóa cũ.
      if (opened.reSealed) reSealKey(db, row.id, opened.reSealed)

      const lease: KeyLease = { id: row.id, secret: opened.value }
      issued.set(lease, picked.lease)
      return lease
    },

    async report(lease, outcome): Promise<void> {
      if (lease.id === null) return
      const inner = issued.get(lease)
      // Chỉ báo được một lần cho mỗi lease, và chỉ lease do nguồn này cấp.
      if (inner === undefined) return
      issued.delete(lease)

      const row = readKeyCiphers(db, connectionId).find((candidate) => candidate.id === lease.id)
      apply(
        lease.id,
        scheduler.settle(inner, outcome, row === undefined ? undefined : toRecord(row))
      )
    }
  }
}
