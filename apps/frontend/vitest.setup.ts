import '@testing-library/jest-dom/vitest';

// Vitest doesn't load .env.local the way Next.js's own dev/build server
// does, and shared/lib/env.ts's Zod validation fails fast on a missing
// var by design (Phase 2's own architecture) -- any test that imports the
// MSW handlers (which build request URLs from `env.apiBaseUrl`) needs this
// set. A fixed, obviously-fake value, never a real backend URL.
process.env.NEXT_PUBLIC_API_BASE_URL ??= 'http://localhost:4000';

// jsdom has no ResizeObserver — Radix primitives (e.g. Checkbox's
// react-use-size) call it unconditionally on mount, so any test that
// renders one needs at least a no-op stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
