import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@renderer': resolve(import.meta.dirname, 'src/renderer/src') }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Storage tests create real SQLite files and spawn child processes.
    testTimeout: 30_000
  }
})
