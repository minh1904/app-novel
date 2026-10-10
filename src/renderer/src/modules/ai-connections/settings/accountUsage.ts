import { useEffect, useState } from 'react'
import type { UsageWindowView } from '../../../../../shared/contracts/aiAccounts'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'

/** The limits of a Codex account, read when the card shows (main caches them for 5 minutes). */
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
