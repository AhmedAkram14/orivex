import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { cancelWaitlistEntry, joinWaitlist, listWaitlistEntries } from '@/mocks/waitlist-store';
import { resolveRequestAccountId } from '@/mocks/request-account';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import type { JoinWaitlistParams } from '@/features/waitlist/api/types';

const base = () => env.apiBaseUrl;

// N8-Waitlist (ORIVEX Remaining Work Audit): matches WaitlistController's
// own @Controller('waitlist') shape exactly.
export const waitlistHandlers = [
  http.get(`${base()}/waitlist`, ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    return HttpResponse.json({ data: listWaitlistEntries(accountId) });
  }),

  http.post(`${base()}/waitlist`, async ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const body = (await request.json()) as JoinWaitlistParams;
    const entry = joinWaitlist(accountId, body);
    return HttpResponse.json({ data: entry }, { status: 201 });
  }),

  http.delete(`${base()}/waitlist/:id`, ({ request, params }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const entry = cancelWaitlistEntry(accountId, params.id as string);
    if (!entry) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Waitlist entry not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: entry });
  }),
];
