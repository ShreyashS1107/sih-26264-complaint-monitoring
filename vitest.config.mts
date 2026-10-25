import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      globals: true,
      environment: 'node',
      fileParallelism: false,
      include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
      env,
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  };
});
