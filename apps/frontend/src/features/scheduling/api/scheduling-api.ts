import { apiFetch } from '@/shared/lib/api/client';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type {
  AvailabilityWindowData,
  Holiday,
  RecurringWeeklySchedule,
  ScheduleException,
  SchedulingRules,
  UpdateAvailabilityWindowPricingRequest,
} from '@/features/scheduling/types';

export interface AddScheduleExceptionRequest {
  date: string;
  type: ScheduleException['type'];
  hours?: ScheduleException['hours'];
  reason?: string;
}

/**
 * The only module that talks to `/scheduling/*` and the read-only
 * `/doctors/:id/availability-windows` -- mirrors `patientApi`'s shape.
 * `getRules`/`getDoctorAvailability`/`updateDoctorAvailability`/
 * `getDoctorExceptions`/`addDoctorException`/`removeDoctorException` are
 * real backend routes scoped implicitly to "the current doctor" (no doctor
 * id in the path, JWT-derived), same convention as `/patient/profile`.
 * `getAvailabilityWindows` is the one exception -- a real, doctor-id-scoped,
 * patient-facing read (Onboarding Redesign integration-gap closure,
 * 2026-07-25) backing the real booking flow (`BookingFlow`,
 * `POST /appointments`).
 */
export const schedulingApi = {
  getRules: () => apiFetch<SchedulingRules>({ path: SCHEDULING_PATHS.rules }),

  getDoctorAvailability: () => apiFetch<RecurringWeeklySchedule>({ path: SCHEDULING_PATHS.doctorAvailability }),

  updateDoctorAvailability: (schedule: RecurringWeeklySchedule) =>
    apiFetch<RecurringWeeklySchedule>({ method: 'PATCH', path: SCHEDULING_PATHS.doctorAvailability, body: schedule }),

  getDoctorExceptions: () => apiFetch<ScheduleException[]>({ path: SCHEDULING_PATHS.doctorExceptions }),

  addDoctorException: (request: AddScheduleExceptionRequest) =>
    apiFetch<ScheduleException>({ method: 'POST', path: SCHEDULING_PATHS.doctorExceptions, body: request }),

  removeDoctorException: (id: string) =>
    apiFetch<void>({ method: 'DELETE', path: `${SCHEDULING_PATHS.doctorExceptions}/${id}` }),

  getHolidays: () => apiFetch<Holiday[]>({ path: SCHEDULING_PATHS.holidays }),

  getAvailabilityWindows: (doctorId: string, from: string, to: string) =>
    apiFetch<AvailabilityWindowData[]>({
      path: `${SCHEDULING_PATHS.availabilityWindows(doctorId)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    }),

  // Consultation Pricing Redesign: the doctor's own "Upcoming Slots"
  // management list and its per-slot pricing override.
  getUpcomingSlots: () => apiFetch<AvailabilityWindowData[]>({ path: SCHEDULING_PATHS.upcomingSlots }),

  updateUpcomingSlotPricing: (id: string, request: UpdateAvailabilityWindowPricingRequest) =>
    apiFetch<AvailabilityWindowData>({ method: 'PATCH', path: SCHEDULING_PATHS.upcomingSlotPricing(id), body: request }),
};
