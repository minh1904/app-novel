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

  // Khi đổi tên, đổi địa chỉ, chuyển đổi hoặc xóa thất bại, lý do lỗi được lưu trong `notice`; hiển thị thông báo toast lỗi cho người dùng.
  useEffect(() => {
    if (store.notice === null) return
    notify({ kind: 'error', title: 'Không lưu được thay đổi', message: store.notice })
    store.dismissNotice()
  }, [store.notice, store.dismissNotice])

  return store
}
