// Config riêng cho lần chạy thử Bộ đo: chỉ nhặt tệp *.run.ts trong scripts/bench, nên `check.mjs`
// và cấu hình vitest chính không bao giờ chạy nó.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/bench/**/*.run.ts'],
    testTimeout: 4 * 60 * 60 * 1000,
    hookTimeout: 60 * 1000,
    reporters: ['default']
  }
})
