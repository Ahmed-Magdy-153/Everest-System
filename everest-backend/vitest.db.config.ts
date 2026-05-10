import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./src/tests/db-setup.ts'],
    include:     ['src/tests/database.test.ts'],
    testTimeout: 30000,   // DB round-trips need more time
    pool:        'forks',
    singleFork:  true,   // run sequentially — shared DB state
  },
})
