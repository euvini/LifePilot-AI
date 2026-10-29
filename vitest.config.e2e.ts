import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    setupFiles: ['./test/setup-e2e.ts'],
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
