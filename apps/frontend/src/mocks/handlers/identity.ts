import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { IDENTITY_PATHS } from '@/features/identity/api/paths';
import type { UpdatePersonalProfileRequest } from '@/features/identity/api/types';
import { getAccountById, getMyAccount, updateMyPersonalProfile } from '@/mocks/identity-store';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

// GET/PATCH /accounts/me is a real backend endpoint (IdentityModule's
// MyAccountController) -- this handler exists purely to keep the frontend
// test suite deterministic, matching `patient.ts`/`doctor.ts`.
export const identityHandlers = [
  http.get(`${base()}${IDENTITY_PATHS.myAccount}`, () => HttpResponse.json({ data: getMyAccount() })),

  http.patch(`${base()}${IDENTITY_PATHS.myAccount}`, async ({ request }) => {
    const body = (await request.json()) as UpdatePersonalProfileRequest;
    return HttpResponse.json({ data: updateMyPersonalProfile(body) });
  }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
  // real, SuperAdmin-only route (IdentityModule's AccountController) --
  // registered after the literal `/accounts/me` above so that always wins
  // the match first.
  http.get(`${base()}/accounts/:id`, ({ params }) => {
    const account = getAccountById(params.id as string);
    if (!account) return errorResponse(404, 'NOT_FOUND', 'Account not found.');
    return HttpResponse.json({ data: account });
  }),
];
