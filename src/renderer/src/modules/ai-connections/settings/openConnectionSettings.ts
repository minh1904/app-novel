import { connectionSection } from '../../../../../shared/contracts/aiProviders'
import { useConnectionStore } from '../store/connectionStore'
import { useAiOverlayStore } from '../store/overlayStore'

/**
 * Mở Cài đặt tại thẻ của một kết nối cụ thể, hoặc mở thẻ hướng dẫn ban đầu nếu chưa có kết nối.
 */
export function openConnectionSettings(connectionId: string | null): void {
  const { openSettings } = useAiOverlayStore.getState()
  const connection = useConnectionStore
    .getState()
    .connections.find((item) => item.id === connectionId)
  if (!connection) {
    // Chưa có kết nối nào: mở hướng dẫn ban đầu ("Thêm nhà cung cấp").
    useAiOverlayStore.getState().setOnboardingOpen(true)
    return
  }
  const section = connectionSection(connection)
  const key =
    section === 'keys'
      ? 'provider:' + connection.providerId
      : section === 'local'
        ? 'local:' + (connection.providerId === 'ollama' ? 'ollama' : 'lmstudio')
        : section === 'endpoints'
          ? 'endpoint:' + connection.id
          : undefined
  openSettings({ group: 'connections', page: section, ...(key ? { key } : {}) })
}

/**
 * Mở Cài đặt › Model › Danh sách model tại vị trí các mục của một kết nối,
 * hoặc mở thẻ hướng dẫn ban đầu nếu chưa có kết nối nào.
 */
export function openModelList(connectionId: string | null): void {
  const known = useConnectionStore.getState().connections.some((item) => item.id === connectionId)
  if (connectionId === null && useConnectionStore.getState().connections.length === 0) {
    useAiOverlayStore.getState().setOnboardingOpen(true)
    return
  }
  useAiOverlayStore.getState().openSettings({
    group: 'model',
    page: 'models',
    ...(known ? { key: 'models:' + connectionId } : {})
  })
}
