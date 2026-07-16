import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { AddScheduleExceptionRequest } from '@/features/scheduling/api/scheduling-api';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import {
  addDoctorException,
  getDoctorAvailability,
  getDoctorExceptions,
  getSchedulingRules,
  removeDoctorException,
  updateDoctorAvailability,
} from '@/mocks/scheduling-store';

const base = () => env.apiBaseUrl;

export const schedulingHandlers = [
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
];
