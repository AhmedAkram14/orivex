import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { AddScheduleExceptionRequest } from '@/features/scheduling/api/scheduling-api';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import {
  addDoctorException,
  getAvailabilityWindows,
  getDoctorAvailability,
  getDoctorExceptions,
  getHolidays,
  getSchedulingRules,
  removeDoctorException,
  updateDoctorAvailability,
} from '@/mocks/scheduling-store';
import { getDoctorById } from '@/mocks/doctor-store';

const base = () => env.apiBaseUrl;

export const schedulingHandlers = [
  // rules/doctorAvailability/doctorExceptions/holidays are real endpoints
  // (SchedulingModule's own GET/PATCH doctor-availability, doctor-exceptions,
  // holidays, rules) -- these handlers exist purely to keep the frontend
  // test suite deterministic, matching `patient.ts`'s dashboard handlers.
  http.get(`${base()}${SCHEDULING_PATHS.rules}`, () => HttpResponse.json({ data: getSchedulingRules() })),

  http.get(`${base()}${SCHEDULING_PATHS.doctorAvailability}`, () =>
    HttpResponse.json({ data: getDoctorAvailability() }),
  ),

  http.patch(`${base()}${SCHEDULING_PATHS.doctorAvailability}`, async ({ request }) => {
    const body = (await request.json()) as RecurringWeeklySchedule;
    return HttpResponse.json({ data: updateDoctorAvailability(body) });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.doctorExceptions}`, () => HttpResponse.json({ data: getDoctorExceptions() })),

  http.post(`${base()}${SCHEDULING_PATHS.doctorExceptions}`, async ({ request }) => {
    const body = (await request.json()) as AddScheduleExceptionRequest;
    return HttpResponse.json({ data: addDoctorException(body) }, { status: 201 });
  }),

  http.delete(`${base()}${SCHEDULING_PATHS.doctorExceptions}/:id`, ({ params }) => {
    removeDoctorException(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.holidays}`, () => HttpResponse.json({ data: getHolidays() })),

  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // patient-facing discovery endpoint (SchedulingModule's
  // DoctorAvailabilityController) -- consultationType is derived from the
  // doctor's own consultationFeeAmount, same rule as the real
  // GetBookableAvailabilityUseCase, never a per-request choice.
  http.get(`${base()}/doctors/:doctorId/availability-windows`, ({ params, request }) => {
    const doctorId = params.doctorId as string;
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? new Date().toISOString();
    const to = url.searchParams.get('to') ?? new Date(Date.now() + 86_400_000).toISOString();
    const doctor = getDoctorById(doctorId);
    const consultationType = doctor?.consultationFeeAmount !== undefined ? 'paid' : 'free';
    return HttpResponse.json({ data: getAvailabilityWindows(doctorId, from, to, consultationType) });
  }),
];
