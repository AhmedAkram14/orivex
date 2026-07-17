import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { AddScheduleExceptionRequest } from '@/features/scheduling/api/scheduling-api';
import type { CreateBookingRequest, JoinWaitlistRequest, RecurringWeeklySchedule } from '@/features/scheduling/types';
import {
  addDoctorException,
  cancelBooking,
  createBooking,
  getBookings,
  getDoctorAvailability,
  getDoctorExceptions,
  getHolidays,
  getSchedulingRules,
  getWaitlist,
  joinWaitlist,
  removeDoctorException,
  rescheduleBooking,
  updateDoctorAvailability,
} from '@/mocks/scheduling-store';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

export const schedulingHandlers = [
  // rules/doctorAvailability/doctorExceptions/holidays are real endpoints
  // (SchedulingModule's own GET/PATCH doctor-availability, doctor-exceptions,
  // holidays, rules) -- these handlers exist purely to keep the frontend
  // test suite deterministic, matching `patient.ts`'s dashboard handlers.
  // bookings/waitlist below remain MSW-only: the patient-facing booking flow
  // is deliberately deferred, blocked on a real doctor-directory feature.
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

  http.get(`${base()}${SCHEDULING_PATHS.bookings}`, () => HttpResponse.json({ data: getBookings() })),

  http.post(`${base()}${SCHEDULING_PATHS.bookings}`, async ({ request }) => {
    const body = (await request.json()) as CreateBookingRequest;
    const result = createBooking(body);
    if (!result.ok) {
      return errorResponse(409, 'SLOT_ALREADY_BOOKED', 'This slot was just taken. Please choose another.');
    }
    return HttpResponse.json({ data: result.booking }, { status: 201 });
  }),

  http.patch(`${base()}${SCHEDULING_PATHS.bookings}/:id`, async ({ request, params }) => {
    const body = (await request.json()) as CreateBookingRequest;
    const result = rescheduleBooking(params.id as string, body);
    if (!result.ok) {
      return result.reason === 'not-found'
        ? errorResponse(404, 'BOOKING_NOT_FOUND', 'This booking no longer exists.')
        : errorResponse(409, 'SLOT_ALREADY_BOOKED', 'This slot was just taken. Please choose another.');
    }
    return HttpResponse.json({ data: result.booking });
  }),

  http.delete(`${base()}${SCHEDULING_PATHS.bookings}/:id`, ({ params }) => {
    cancelBooking(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.waitlist}`, () => HttpResponse.json({ data: getWaitlist() })),

  http.post(`${base()}${SCHEDULING_PATHS.waitlist}`, async ({ request }) => {
    const body = (await request.json()) as JoinWaitlistRequest;
    return HttpResponse.json({ data: joinWaitlist(body) }, { status: 201 });
  }),

  http.get(`${base()}${SCHEDULING_PATHS.holidays}`, () => HttpResponse.json({ data: getHolidays() })),
];
