import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@lookiva/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
    },
  },
});
