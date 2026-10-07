import { connectionSection } from '../../../../shared/contracts/aiProviders'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUiStore } from '../../stores/uiStore'

/**
 * Opens Settings at the card of one connection ("Sửa danh sách model…" in the model menu), or at the start
 * of Kết nối AI when there is none to point at.
 */
export function openConnectionSettings(connectionId: string | null): void {
  const { openSettings } = useUiStore.getState()
  const connection = useConnectionStore
    .getState()
    .connections.find((item) => item.id === connectionId)
  if (!connection) {
    // Nothing to edit yet: the onboarding card is the way in (model menu "Thêm nhà cung cấp").
    useUiStore.getState().setOnboardingOpen(true)
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
