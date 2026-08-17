import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { AddScheduleExceptionRequest } from '@/features/scheduling/api/scheduling-api';
import type { RecurringWeeklySchedule, UpdateAvailabilityWindowPricingRequest } from '@/features/scheduling/types';
import {
  addDoctorException,
  getAvailabilityWindows,
  getDoctorAvailability,
  getDoctorExceptions,
  getHolidays,
  getSchedulingRules,
  getUpcomingSlots,
  isAvailabilityWindowBooked,
  removeDoctorException,
  updateDoctorAvailability,
  updateUpcomingSlotPricing,
} from '@/mocks/scheduling-store';
import { getDoctorByAccountId } from '@/mocks/doctor-store';
import { resolveRequestAccountId } from '@/mocks/request-account';

const base = () => env.apiBaseUrl;

// Demo Data & Profile Avatar Pass: every doctor-self-scoped handler here
// (no doctor id in the URL, JWT-derived on the real backend) now resolves
// the *calling* doctor from the intercepted request, instead of always
// landing on the one seeded demo doctor. Falls back to that legacy doctor
// when no account can be resolved, which is what keeps the existing
// no-session component tests unchanged.
function currentDoctorId(request: Request): string {
  const accountId = resolveRequestAccountId(request);
  return (accountId ? getDoctorByAccountId(accountId)?.id : undefined) ?? 'doctor-profile-1';
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status },
  );
}

export const schedulingHandlers = [
  // rules/doctorAvailability/doctorExceptions/holidays are real endpoints
  // (SchedulingModule's own GET/PATCH doctor-availability, doctor-exceptions,
  // holidays, rules) -- these handlers exist purely to keep the frontend
  // test suite deterministic, matching `patient.ts`'s dashboard handlers.
  http.get(`${base()}${SCHEDULING_PATHS.rules}`, () => HttpResponse.json({ data: getSchedulingRules() })),

  http.get(`${base()}${SCHEDULING_PATHS.doctorAvailability}`, ({ request }) =>
    HttpResponse.json({ data: getDoctorAvailability(resolveRequestAccountId(request)) }),
  ),

  http.patch(`${base()}${SCHEDULING_PATHS.doctorAvailability}`, async ({ request }) => {
    const body = (await request.json()) as RecurringWeeklySchedule;
    return HttpResponse.json({ data: updateDoctorAvailability(body, resolveRequestAccountId(request)) });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.doctorExceptions}`, ({ request }) =>
    HttpResponse.json({ data: getDoctorExceptions(resolveRequestAccountId(request)) }),
  ),

  http.post(`${base()}${SCHEDULING_PATHS.doctorExceptions}`, async ({ request }) => {
    const body = (await request.json()) as AddScheduleExceptionRequest;
    return HttpResponse.json({ data: addDoctorException(body, resolveRequestAccountId(request)) }, { status: 201 });
  }),

  http.delete(`${base()}${SCHEDULING_PATHS.doctorExceptions}/:id`, ({ params, request }) => {
    removeDoctorException(params.id as string, resolveRequestAccountId(request));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.holidays}`, () => HttpResponse.json({ data: getHolidays() })),

  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // patient-facing discovery endpoint (SchedulingModule's
  // DoctorAvailabilityController). Consultation Pricing Redesign: each
  // window's own real price comes from `getAvailabilityWindows`
  // (`resolveWindowPricing`) now, never derived from the doctor's profile.
  http.get(`${base()}/doctors/:doctorId/availability-windows`, ({ params, request }) => {
    const doctorId = params.doctorId as string;
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? new Date().toISOString();
    const to = url.searchParams.get('to') ?? new Date(Date.now() + 86_400_000).toISOString();
    return HttpResponse.json({ data: getAvailabilityWindows(doctorId, from, to) });
  }),

  // Consultation Pricing Redesign: the doctor's own "Upcoming Slots"
  // management list and its per-slot pricing override.
  http.get(`${base()}${SCHEDULING_PATHS.upcomingSlots}`, ({ request }) =>
    HttpResponse.json({ data: getUpcomingSlots(currentDoctorId(request)) }),
  ),

  http.patch(`${base()}${SCHEDULING_PATHS.upcomingSlotPricing(':id')}`, async ({ params, request }) => {
    const id = params.id as string;
    if (isAvailabilityWindowBooked(id)) {
      return errorResponse(404, 'NOT_FOUND', `AvailabilityWindow "${id}" not found.`);
    }
    const body = (await request.json()) as UpdateAvailabilityWindowPricingRequest;
    try {
      return HttpResponse.json({ data: updateUpcomingSlotPricing(currentDoctorId(request), id, body) });
    } catch {
      return errorResponse(404, 'NOT_FOUND', `AvailabilityWindow "${id}" not found.`);
    }
  }),
];
