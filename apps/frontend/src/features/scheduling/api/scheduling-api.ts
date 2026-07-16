import { apiFetch } from '@/shared/lib/api/client';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { RecurringWeeklySchedule, ScheduleException, SchedulingRules } from '@/features/scheduling/types';

export interface AddScheduleExceptionRequest {
  date: string;
  type: ScheduleException['type'];
  hours?: ScheduleException['hours'];
  reason?: string;
}

/**
 * The only module that talks to `/scheduling/*` — mirrors `patientApi`'s
 * shape. Backed by an MSW mock today (`src/mocks/handlers/scheduling.ts`);
 * this phase builds the Scheduling & Appointment Infrastructure
 * architecture only, not a real `SchedulingModule` integration. Scoped
 * implicitly to "the current doctor" (no doctor id in the path), same
 * convention as `/patient/profile` scoping to "the current patient" — this
 * demo has exactly one doctor account, and a real multi-doctor backend
 * would add the id param at that point, a request-shape change, not a
 * rewrite.
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
};
