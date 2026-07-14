import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

/**
 * `env.ts` caches its parsed result at module scope, so each case needs a
 * fresh module instance (`vi.resetModules` + dynamic `import`) to see a
 * different `process.env`.
 */
async function loadEnv() {
  vi.resetModules();
  const mod = await import('./env');
  return mod.env;
}

describe('env', () => {
  it('throws with a descriptive message when NEXT_PUBLIC_API_BASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const env = await loadEnv();

    expect(() => env.apiBaseUrl).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('accepts a manually-configured NEXT_PUBLIC_APP_URL as-is', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
    process.env.NEXT_PUBLIC_APP_URL = 'https://orivex.example.com';
    const env = await loadEnv();

    expect(env.appUrl).toBe('https://orivex.example.com');
  });

  it('normalizes Vercel-provided bare-hostname VERCEL_URL into a full URL instead of failing validation', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_VERCEL_URL = 'orivex-eg.vercel.app';
    const env = await loadEnv();

    expect(env.appUrl).toBe('https://orivex-eg.vercel.app');
  });

  it('falls back to localhost when neither NEXT_PUBLIC_APP_URL nor NEXT_PUBLIC_VERCEL_URL is set', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    const env = await loadEnv();

    expect(env.appUrl).toBe('http://localhost:3000');
  });
});
