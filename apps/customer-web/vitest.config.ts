import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './app'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@lookiva/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@lookiva/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
      '@lookiva/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/index.ts'),
    },
  },
});
