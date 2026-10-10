import { useEffect } from 'react'
import {
  useConnectionStore,
  type ConnectionsLoad,
  type TestState,
  type ConnectionState
} from '../store/connectionStore'
import { notify } from '../../../components/ui/notificationStore'

export type { ConnectionsLoad, TestState }

export type ConnectionsController = ConnectionState

export function useConnections(): ConnectionsController {
  const store = useConnectionStore()

  useEffect(() => {
    if (store.load === 'loading') {
      void store.reload()
    }
  }, [store.load, store.reload])

  // A failed rename, address change, switch or delete leaves its reason in `notice`; on a settings page
  // that is a toast, as Hermes does, rather than nothing.
  useEffect(() => {
    if (store.notice === null) return
    notify({ kind: 'error', title: 'Không lưu được thay đổi', message: store.notice })
    store.dismissNotice()
  }, [store.notice, store.dismissNotice])

  return store
}
