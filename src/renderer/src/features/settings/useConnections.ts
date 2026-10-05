import { useEffect } from 'react'
import {
  useConnectionStore,
  type ConnectionsLoad,
  type TestState,
  type ConnectionState
} from '../../stores/connectionStore'

export type { ConnectionsLoad, TestState }

export type ConnectionsController = ConnectionState

export function useConnections(): ConnectionsController {
  const store = useConnectionStore()

  useEffect(() => {
    if (store.load === 'loading') {
      void store.reload()
    }
  }, [store.load, store.reload])

  return store
}
