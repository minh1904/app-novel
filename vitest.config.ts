import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Storage tests create real SQLite files and spawn child processes.
    testTimeout: 30_000
  }
})
