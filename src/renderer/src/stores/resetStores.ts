/**
 * Registry for resetting Zustand stores between unit tests.
 */
const resetters = new Set<() => void>()

export function registerStoreReset(reset: () => void): () => void {
  resetters.add(reset)
  return () => {
    resetters.delete(reset)
  }
}

export function resetAllStores(): void {
  for (const reset of resetters) {
    reset()
  }
}
