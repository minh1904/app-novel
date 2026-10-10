import { create } from 'zustand'
import { registerStoreReset } from '../../../lib/testing/resetStores'
import {
  DEFAULT_SETTINGS_LOCATION,
  normalizeLocation,
  type SettingsLocation
} from '../settings/settingsNav'

interface AiOverlayState {
  settings: SettingsLocation | null
  onboardingOpen: boolean
  openSettings(location?: SettingsLocation): void
  closeSettings(): void
  setOnboardingOpen(open: boolean): void
  reset(): void
}

const initialValues = {
  settings: null as SettingsLocation | null,
  onboardingOpen: false
}

export const useAiOverlayStore = create<AiOverlayState>((set, get) => ({
  ...initialValues,
  openSettings: (location) =>
    set({ settings: normalizeLocation(location ?? get().settings ?? DEFAULT_SETTINGS_LOCATION) }),
  closeSettings: () => set({ settings: null }),
  setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen }),
  reset: () => set({ ...initialValues })
}))

registerStoreReset(() => useAiOverlayStore.getState().reset())
