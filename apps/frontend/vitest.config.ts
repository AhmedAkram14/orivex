import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // next-intl's `createNavigation` imports `next/navigation` through a
      // pnpm-nested symlink (next-intl's own peer copy of `next`) that
      // Vite's resolver fails to follow on Windows, even though the same
      // symlink resolves fine for `next build`/Storybook and via Node's own
      // resolver. Aliasing to the real, directly-resolved path sidesteps
      // that resolver mismatch rather than fighting pnpm's link layout.
      'next/navigation': require.resolve('next/navigation'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // tests/e2e is Playwright's suite (playwright.config.ts), not Vitest's --
    // it has its own test.describe()/test() from @playwright/test that
    // Vitest must never try to collect.
    exclude: ['node_modules', '.next', '.storybook', 'tests/e2e'],
    server: {
      // Forces next-intl's navigation module through Vite's own resolver
      // (which respects the alias above) instead of Node's native ESM
      // loader, which fails to resolve `next/navigation` through
      // next-intl's nested pnpm symlink on this Windows checkout — the
      // repository path's non-ASCII character (the em dash) breaks Node's
      // loader specifically for that symlink hop, even though the same
      // path resolves fine everywhere else (`next build`, Storybook, and
      // Node's own `require.resolve`).
      deps: { inline: ['next-intl'] },
    },
  },
});
