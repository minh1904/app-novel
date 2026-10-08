import { connectionSection } from '../../../../shared/contracts/aiProviders'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUiStore } from '../../stores/uiStore'

/**
 * Opens Settings at the card of one connection (its key, address, switch), or the onboarding card when
 * there is none to point at.
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

/**
 * Opens Settings › Model › Danh sách model at one connection's entries ("Sửa danh sách model…" in the model
 * menu), or the onboarding card when there is no connection yet.
 */
export function openModelList(connectionId: string | null): void {
  const known = useConnectionStore.getState().connections.some((item) => item.id === connectionId)
  if (connectionId === null && useConnectionStore.getState().connections.length === 0) {
    useUiStore.getState().setOnboardingOpen(true)
    return
  }
  useUiStore.getState().openSettings({
    group: 'model',
    page: 'models',
    ...(known ? { key: 'models:' + connectionId } : {})
  })
}
