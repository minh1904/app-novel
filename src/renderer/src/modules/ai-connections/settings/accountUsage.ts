import { useEffect, useState } from 'react'
import type { UsageWindowView } from '../../../../../shared/contracts/aiAccounts'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'

/** Thông tin hạn mức sử dụng của tài khoản Codex, được đọc khi hiển thị thẻ (tiến trình chính lưu cache 5 phút). */
export function useAccountUsage(connection: ConnectionView | undefined): UsageWindowView[] {
  const [windows, setWindows] = useState<UsageWindowView[]>([])
  const id =
    connection?.oauthProvider === 'codex' && connection.account?.state === 'ok'
      ? connection.id
      : null
  useEffect(() => {
    if (id === null) return
    let active = true
    void window.mira.ai.accounts.usage(id).then((result) => {
      if (active && result.ok) setWindows(result.value)
    })
    return () => {
      active = false
    }
  }, [id])
  return id === null ? [] : windows
}
