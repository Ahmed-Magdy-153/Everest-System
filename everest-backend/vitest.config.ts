import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./src/tests/setup.ts'],
    exclude:     ['**/database.test.ts', '**/node_modules/**'],
    testTimeout: 10000,
    coverage: {
      reporter: ['text', 'html'],
      include:  ['src/routes/**', 'src/middleware/**', 'src/lib/**'],
    },
  },
})
