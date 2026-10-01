import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.int.spec.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@lookiva/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@lookiva/shared-validation': path.resolve(__dirname, '../../packages/shared-validation/src/index.ts'),
      '@lookiva/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
      '@lookiva/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/index.ts'),
      '@lookiva/localization': path.resolve(__dirname, '../../packages/localization/src/index.ts'),
      '@lookiva/shared-config': path.resolve(__dirname, '../../packages/shared-config/src/index.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
