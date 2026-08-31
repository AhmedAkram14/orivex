import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// MSW Authentication Boundary Fix -- proves the exact root cause is fixed:
// `resolveUrl()` used to send `/auth/*` requests through Next.js's own
// same-origin rewrite proxy (next.config.ts) unconditionally outside
// Vitest's own test env, a server-side layer MSW's browser Service Worker
// has zero visibility into. With `NEXT_PUBLIC_ENABLE_API_MOCKS=true`, that
// meant every login/refresh/register call silently reached the REAL
// backend, 100% of the time, never MSW's own `handlers/auth.ts`. These
// tests drive `apiFetch` itself (via a mocked `global.fetch`) rather than
// reaching into `resolveUrl` directly, since it's intentionally not
// exported -- the URL `fetch` was actually called with is the one thing
// that matters here.
//
// `NODE_ENV` is stubbed per test (not read through env.ts's cache) so each
// case can simulate "a real `next dev`/production server is running" --
// Vitest's own run always sets NODE_ENV=test, which would otherwise mask
// the exact bug this fix closes.

describe('apiFetch /auth/* URL resolution (MSW Authentication Boundary Fix)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 })) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('in a real (non-test) server with mocks DISABLED, /auth/* still resolves to the same-origin relative path (production behavior unchanged)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_API_MOCKS', 'false');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://orivex-backend.onrender.com');

    const { apiFetch } = await import('./client');
    await apiFetch({ method: 'POST', path: '/auth/login', body: { email: 'a@b.com', password: 'x' } });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toBe('/auth/login');
  });

  it('in a real (non-test) server with mocks ENABLED, /auth/* resolves to the absolute backend URL MSW\'s handlers are registered against', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_API_MOCKS', 'true');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://orivex-backend.onrender.com');

    const { apiFetch } = await import('./client');
    await apiFetch({ method: 'POST', path: '/auth/login', body: { email: 'a@b.com', password: 'x' } });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toBe('https://orivex-backend.onrender.com/auth/login');
  });

  it('non-/auth/* paths always resolve to the absolute backend URL, regardless of mock mode (never affected by this bug)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_API_MOCKS', 'false');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://orivex-backend.onrender.com');

    const { apiFetch } = await import('./client');
    await apiFetch({ path: '/doctors/me' });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toBe('https://orivex-backend.onrender.com/doctors/me');
  });
});
