import { defineConfig, devices } from '@playwright/test';

/**
 * Production Readiness Audit follow-up (Phase 1, item 4). Real
 * browser-level end-to-end coverage of the platform's critical journeys.
 *
 * Runs against the actual Next.js app with MSW's browser worker enabled
 * (NEXT_PUBLIC_ENABLE_API_MOCKS=true) rather than a live backend + Postgres --
 * this environment has no database/Docker available to stand up the real
 * stack, and MSW is already this codebase's established mechanism for
 * deterministic API responses (see src/mocks/, used identically by
 * Storybook and Vitest). This still exercises real browser behavior: real
 * routing, real form validation, real accessibility tree, real client-side
 * state -- everything except the actual NestJS/Postgres round trip.
 *
 * To point this at a real deployed backend instead, set
 * NEXT_PUBLIC_ENABLE_API_MOCKS=false and NEXT_PUBLIC_API_BASE_URL to that
 * backend's URL before running `next build && next start` -- no spec file
 * changes needed, since every spec drives the UI, never MSW directly.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Deliberately does NOT run `next build` itself -- a production build
    // of this app takes longer than is comfortable for a per-run webServer
    // timeout. CI (and local runs) must build once beforehand with the same
    // env vars below (see package.json's "test:e2e" script and
    // .github/workflows/frontend-ci.yml), then this just starts the
    // already-built server.
    command: 'pnpm start',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      PORT: '3100',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
      NEXT_PUBLIC_ENABLE_API_MOCKS: 'true',
    },
  },
});
