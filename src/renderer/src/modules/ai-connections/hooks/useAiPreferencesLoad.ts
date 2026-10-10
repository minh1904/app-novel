import { useEffect } from 'react'
import { useConnectionStore } from '../store/connectionStore'

export function useAiPreferencesLoad(): void {
  useEffect(() => {
    void useConnectionStore.getState().loadPreferences()
  }, [])
}
