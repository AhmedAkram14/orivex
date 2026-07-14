import { z } from 'zod';

/**
 * Single validated read of process.env — mirrors the backend's own
 * fail-fast config philosophy (apps/backend/src/core/configuration/
 * env.schema.ts). Fails loudly at startup on a missing/malformed value
 * instead of letting `undefined` leak into a fetch URL or a locale check
 * somewhere deep in the app.
 *
 * `NEXT_PUBLIC_` is required on every var read here: Next.js only inlines
 * `NEXT_PUBLIC_*` vars into the client bundle, and every one of these is
 * read from client components too (api client, analytics hook, mocking
 * toggle), not just the server.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('NEXT_PUBLIC_API_BASE_URL must be a valid URL, e.g. http://localhost:4000'),
  // The frontend's own canonical origin — for absolute URLs in SEO
  // metadata (Open Graph, canonical links, sitemaps) that must not be
  // relative. Falls back to the Vercel-provided URL in preview/production
  // deployments so this doesn't need manual configuration per-environment.
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional(),
  // Opt-in switch for MSW request mocking (Section: API mocking strategy).
  // Defaults to false — mocks must never silently activate in an
  // environment nobody asked for them in.
  NEXT_PUBLIC_ENABLE_API_MOCKS: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

type ParsedEnv = z.infer<typeof envSchema>;
let cached: ParsedEnv | undefined;

// Deliberately lazy, not parsed at module-import time: Next.js's build step
// imports server/client modules for static analysis (route type detection,
// bundling) without necessarily running with real env vars present. A
// top-level throw here would fail `next build` itself, not just a real
// request. Evaluated -- and cached -- on first actual access instead, the
// same safety property Phase 0's original getter-based env.ts had.
// Vercel's own system env var (`VERCEL_URL`, and any `NEXT_PUBLIC_VERCEL_URL`
// mirroring it) is documented to be a bare hostname like
// "orivex-eg.vercel.app" -- never prefixed with a protocol. Falling back to
// it unmodified fails `.url()` validation below and used to take down every
// page on Vercel (a healthy deployment, crashing purely on this fallback's
// shape). Only `NEXT_PUBLIC_APP_URL` is expected to already be a full URL,
// since that one is set manually.
function toAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function readEnv(): ParsedEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? toAbsoluteUrl(process.env.NEXT_PUBLIC_VERCEL_URL),
    NEXT_PUBLIC_ENABLE_API_MOCKS: process.env.NEXT_PUBLIC_ENABLE_API_MOCKS,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(
      `Invalid environment configuration. Configure the missing/invalid variables in .env.local (dev) or the ` +
        `Vercel project environment variables (production) -- see .env.example.\n${issues}`,
    );
  }

  cached = parsed.data;
  return cached;
}

export const env = {
  get apiBaseUrl(): string {
    return readEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  },
  get appUrl(): string {
    return readEnv().NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
  },
  get enableApiMocks(): boolean {
    return readEnv().NEXT_PUBLIC_ENABLE_API_MOCKS === 'true';
  },
};
