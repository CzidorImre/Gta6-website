import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside a React Server Components bundle; unit tests import server
      // modules directly, so swap it for an empty module here.
      'server-only': fileURLToPath(new URL('./tests/unit/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    environment: 'node',
  },
});
