import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api/client';

// Without this, Next.js statically prerenders this page at build time
// (confirmed: `next build` marked it ○ Static) -- the backend-reachable
// check below would be frozen at whatever the build environment saw once,
// never re-checked per request. Forces the actual live check this page
// exists to demonstrate.
export const dynamic = 'force-dynamic';

interface LivenessResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

// Deliberately calls the one endpoint guaranteed to exist and require no
// auth (apps/backend/src/platform/health/health.controller.ts) -- this
// page exists to prove the API client is genuinely wired to the deployed
// backend, not to be the real landing page (Phase 6 builds that).
export default async function HomePage() {
  const t = await getTranslations('home');
  let liveness: LivenessResponse | null = null;
  let error: string | null = null;

  try {
    liveness = await apiFetch<LivenessResponse>({ path: '/health/liveness' });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Unknown error contacting the backend.';
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {liveness ? (
        <p className="text-success">
          {t('backendReachable', { status: liveness.status, uptime: liveness.uptimeSeconds })}
        </p>
      ) : (
        <p className="text-danger">{t('backendUnreachable', { error: error ?? '' })}</p>
      )}
    </main>
  );
}
