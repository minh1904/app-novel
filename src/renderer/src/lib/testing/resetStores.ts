/**
 * Đăng ký hàm đặt lại trạng thái cho các Zustand store giữa các unit test.
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
