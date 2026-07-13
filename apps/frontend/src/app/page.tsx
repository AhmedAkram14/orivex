import { apiFetch } from '@/lib/api-client';

interface LivenessResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

// Deliberately calls the one endpoint guaranteed to exist and require no
// auth (apps/backend/src/platform/health/health.controller.ts) -- this
// page exists to prove the API client is genuinely wired to the deployed
// backend during this bootstrap sprint, not to be the real landing page.
export default async function HomePage() {
  let liveness: LivenessResponse | null = null;
  let error: string | null = null;

  try {
    liveness = await apiFetch<LivenessResponse>({ path: '/health/liveness' });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Unknown error contacting the backend.';
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Orivex</h1>
      {liveness ? (
        <p className="text-green-700">
          Backend reachable — status: {liveness.status}, uptime: {liveness.uptimeSeconds}s
        </p>
      ) : (
        <p className="text-red-700">Backend unreachable: {error}</p>
      )}
    </main>
  );
}
