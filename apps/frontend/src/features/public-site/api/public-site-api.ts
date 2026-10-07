import { LANDING_PATHS } from '@/features/landing/api/paths';
import type { PublicDoctorListResult, PublicPlatformFees, PublicSpecialty } from '@/features/landing/api/types';
import { apiFetch } from '@/shared/lib/api/client';
import { env } from '@/shared/lib/env';

/** How long a server-rendered public page may serve cached directory data before refetching it (ISR). */
export const PUBLIC_DATA_REVALIDATE_SECONDS = 300;

/**
 * Server Components only. The public pages are rendered on the server, but
 * mock mode's MSW worker lives in the browser and never sees a server-side
 * fetch -- so with mocks enabled the very same `/public/*` handlers are run
 * in-process (MSW's `getResponse`) instead of calling a backend that isn't
 * there. Both paths return exactly what `apiFetch` would.
 */
async function publicFetch<T>(path: string): Promise<T> {
  if (env.enableApiMocks) {
    const [{ getResponse }, { publicHandlers }] = await Promise.all([import('msw'), import('@/mocks/handlers/public')]);
    const response = await getResponse(publicHandlers, new Request(`${env.apiBaseUrl}${path}`));
    if (!response?.ok) {
      throw new Error(`Mock request to ${path} failed${response ? ` with status ${response.status}` : ''}.`);
    }
    return ((await response.json()) as { data: T }).data;
  }
  return apiFetch<T>({ path, next: { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS } });
}

export const publicSiteApi = {
  getSpecialties: () => publicFetch<PublicSpecialty[]>(LANDING_PATHS.specialties),

  getDoctors: (params: Parameters<typeof LANDING_PATHS.doctors>[0] = {}) =>
    publicFetch<PublicDoctorListResult>(LANDING_PATHS.doctors(params)),

  getPlatformFees: () => publicFetch<PublicPlatformFees>(LANDING_PATHS.platformFees),
};

/**
 * Loads a public page's directory data, with failure handled per phase:
 *
 * - During `next build`, an unreachable backend (e.g. a sleeping Render
 *   instance) must not fail the deploy: return `null` and let the page render
 *   its in-page error state. ISR replaces that page on its first successful
 *   revalidation.
 * - At runtime, rethrow. A failed ISR revalidation keeps serving the last
 *   good version of the page and retries on the next request -- so a backend
 *   hiccup never overwrites a working page with an error state.
 */
export async function loadOrNull<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error;
    console.error('[publicSiteApi] Backend unreachable at build time; rendering the error state until the first revalidation.', error);
    return null;
  }
}
